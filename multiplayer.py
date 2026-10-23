import hashlib
import json
import math
import os
import re
import secrets
import threading
import time
import urllib.error
import urllib.parse
import urllib.request
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer


ROOM_CODE_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789"
ROOM_CODE_LENGTH = 6
MAX_CAPACITY = 8
MAX_BODY_BYTES = 4096
POSTS_PER_MINUTE = 900
PLAYER_TIMEOUT_SECONDS = 45
ROOM_CODE_PATTERN = re.compile(r"^[A-HJ-NP-Z2-9]{6}$")
ROOM_STATES = {}
ROOM_STATES_LOCK = threading.RLock()
REQUEST_HISTORY = {}
REQUEST_HISTORY_LOCK = threading.Lock()


class ApiError(Exception):
    def __init__(self, status, message):
        super().__init__(message)
        self.status = status


def _allow_request(address):
    now = time.monotonic()
    with REQUEST_HISTORY_LOCK:
        history = [stamp for stamp in REQUEST_HISTORY.get(address, []) if now - stamp < 60]
        if len(history) >= POSTS_PER_MINUTE:
            REQUEST_HISTORY[address] = history
            return False
        history.append(now)
        REQUEST_HISTORY[address] = history
        if len(REQUEST_HISTORY) > 2048:
            for client, stamps in list(REQUEST_HISTORY.items()):
                if not stamps or now - stamps[-1] >= 60:
                    del REQUEST_HISTORY[client]
        return True


def _configuration():
    base_url = os.environ.get("SUPABASE_URL", "").rstrip("/")
    service_key = os.environ.get("SUPABASE_SERVICE_ROLE_KEY", "")
    if not base_url or not service_key:
        raise ApiError(503, "Multiplayer storage is not configured on the server.")
    return base_url, service_key


def _database_request(table_path, method="GET", payload=None, prefer=None):
    base_url, service_key = _configuration()
    headers = {
        "apikey": service_key,
        "Authorization": f"Bearer {service_key}",
        "Accept": "application/json",
    }
    data = None
    if payload is not None:
        headers["Content-Type"] = "application/json"
        data = json.dumps(payload, separators=(",", ":")).encode("utf-8")
    if prefer:
        headers["Prefer"] = prefer
    request = urllib.request.Request(
        f"{base_url}/rest/v1/{table_path}",
        data=data,
        headers=headers,
        method=method,
    )
    try:
        with urllib.request.urlopen(request, timeout=8) as response:
            body = response.read()
    except urllib.error.HTTPError as error:
        error.read()
        raise ApiError(502, "Multiplayer storage rejected the request.") from error
    except (urllib.error.URLError, TimeoutError) as error:
        raise ApiError(503, "Multiplayer storage is temporarily unavailable.") from error
    if not body:
        return []
    try:
        result = json.loads(body.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError) as error:
        raise ApiError(502, "Multiplayer storage returned an invalid response.") from error
    if not isinstance(result, list):
        raise ApiError(502, "Multiplayer storage returned an unexpected response.")
    return result


def _sanitize_name(value):
    if not isinstance(value, str):
        raise ApiError(400, "Enter a player name.")
    name = " ".join("".join(char for char in value if char.isprintable()).split())[:20]
    if not name:
        raise ApiError(400, "Enter a player name.")
    return name


def _validate_code(value):
    if not isinstance(value, str):
        raise ApiError(400, "Enter a six-character room code.")
    code = value.strip().upper()
    if not ROOM_CODE_PATTERN.fullmatch(code):
        raise ApiError(400, "Room codes use six letters or numbers.")
    return code


def _new_player(code, name):
    token = secrets.token_urlsafe(32)
    digest = hashlib.sha256(token.encode("utf-8")).hexdigest()
    rows = _database_request(
        "players?select=id,name,room_code,last_seen",
        method="POST",
        payload=[{"room_code": code, "name": name, "token_hash": digest}],
        prefer="return=representation",
    )
    if len(rows) != 1:
        raise ApiError(502, "The server could not create a player session.")
    with ROOM_STATES_LOCK:
        ROOM_STATES.setdefault(code, {})[rows[0]["id"]] = {
            "x": 0,
            "z": 0,
            "heading": 0,
            "zone": "",
        }
    return token, rows[0]


def _session_response(code, token, player, capacity):
    return {
        "code": code,
        "token": token,
        "playerId": player["id"],
        "capacity": capacity,
        "players": _active_players(code),
    }


def _active_players(code):
    cutoff = (datetime.now(timezone.utc) - timedelta(seconds=PLAYER_TIMEOUT_SECONDS)).isoformat()
    query = urllib.parse.urlencode({
        "room_code": f"eq.{code}",
        "last_seen": f"gt.{cutoff}",
        "select": "id,name,last_seen",
        "order": "last_seen.asc",
    })
    rows = _database_request(f"players?{query}")
    with ROOM_STATES_LOCK:
        state = ROOM_STATES.setdefault(code, {})
        active_ids = {row["id"] for row in rows}
        for player_id in list(state):
            if player_id not in active_ids:
                del state[player_id]
        return [
            {
                "id": row["id"],
                "name": row["name"],
                "x": state.get(row["id"], {}).get("x", 0),
                "z": state.get(row["id"], {}).get("z", 0),
                "heading": state.get(row["id"], {}).get("heading", 0),
                "zone": state.get(row["id"], {}).get("zone", ""),
                "last_seen": row["last_seen"],
            }
            for row in rows
        ]


def _read_token_player(code, token):
    if not isinstance(token, str) or len(token) > 128:
        raise ApiError(401, "This player session is invalid. Rejoin the room.")
    digest = hashlib.sha256(token.encode("utf-8")).hexdigest()
    query = urllib.parse.urlencode({
        "room_code": f"eq.{code}",
        "token_hash": f"eq.{digest}",
        "select": "id,name,room_code",
        "limit": "1",
    })
    rows = _database_request(f"players?{query}")
    if not rows:
        raise ApiError(401, "This player session has expired. Rejoin the room.")
    return rows[0]


def _room_create(payload):
    name = _sanitize_name(payload.get("name"))
    capacity = payload.get("capacity", 8)
    if isinstance(capacity, bool) or not isinstance(capacity, int) or not 2 <= capacity <= MAX_CAPACITY:
        raise ApiError(400, f"Capacity must be from 2 to {MAX_CAPACITY}.")
    code = "".join(secrets.choice(ROOM_CODE_ALPHABET) for _ in range(ROOM_CODE_LENGTH))
    rooms = _database_request(
        "rooms?select=code,capacity",
        method="POST",
        payload=[{"code": code, "capacity": capacity}],
        prefer="return=representation",
    )
    if len(rooms) != 1:
        raise ApiError(502, "The server could not reserve a room code.")
    try:
        token, player = _new_player(code, name)
    except ApiError:
        query = urllib.parse.urlencode({"code": f"eq.{code}"})
        _database_request(f"rooms?{query}", method="DELETE", prefer="return=minimal")
        raise
    return _session_response(code, token, player, capacity)


def _room_join(payload):
    name = _sanitize_name(payload.get("name"))
    code = _validate_code(payload.get("code"))
    room_query = urllib.parse.urlencode({"code": f"eq.{code}", "select": "code,capacity", "limit": "1"})
    rooms = _database_request(f"rooms?{room_query}")
    if not rooms:
        raise ApiError(404, "That room code was not found.")
    room = rooms[0]
    with ROOM_STATES_LOCK:
        active = _active_players(code)
        if len(active) >= room["capacity"]:
            raise ApiError(409, "That room is full.")
        token, player = _new_player(code, name)
    return _session_response(code, token, player, room["capacity"])


def _room_sync(payload):
    code = _validate_code(payload.get("code"))
    player = _read_token_player(code, payload.get("token"))
    x = payload.get("x", 0)
    z = payload.get("z", 0)
    heading = payload.get("heading", 0)
    zone = payload.get("zone", "")
    if any(isinstance(value, bool) or not isinstance(value, (int, float)) for value in (x, z, heading)):
        raise ApiError(400, "Player position must be numeric.")
    if any(not math.isfinite(value) for value in (x, z, heading)):
        raise ApiError(400, "Player position must use finite numbers.")
    if abs(x) > 116 or abs(z) > 116 or not 0 <= heading <= 360:
        raise ApiError(400, "Player position is outside the allowed range.")
    if not isinstance(zone, str) or len(zone) > 48:
        raise ApiError(400, "The current location is invalid.")
    now = datetime.now(timezone.utc).isoformat()
    query = urllib.parse.urlencode({"id": f"eq.{player['id']}", "select": "id"})
    _database_request(
        f"players?{query}",
        method="PATCH",
        payload={"last_seen": now},
        prefer="return=minimal",
    )
    with ROOM_STATES_LOCK:
        ROOM_STATES.setdefault(code, {})[player["id"]] = {
            "x": round(x, 2),
            "z": round(z, 2),
            "heading": round(heading % 360, 1),
            "zone": zone,
        }
    return {"players": _active_players(code)}


def _room_leave(payload):
    code = _validate_code(payload.get("code"))
    player = _read_token_player(code, payload.get("token"))
    query = urllib.parse.urlencode({"id": f"eq.{player['id']}"})
    last_seen = (datetime.now(timezone.utc) - timedelta(seconds=PLAYER_TIMEOUT_SECONDS + 1)).isoformat()
    _database_request(
        f"players?{query}",
        method="PATCH",
        payload={"last_seen": last_seen},
        prefer="return=minimal",
    )
    with ROOM_STATES_LOCK:
        ROOM_STATES.setdefault(code, {}).pop(player["id"], None)
    return {"left": True}


class MultiplayerHandler(BaseHTTPRequestHandler):
    server_version = "WorldHop/1"

    def _send(self, status, payload):
        body = b"" if status == 204 else json.dumps(payload, separators=(",", ":")).encode("utf-8")
        allowed_origin = os.environ.get("WORLD_HOP_ALLOWED_ORIGIN", "*")
        self.send_response(status)
        self.send_header("Content-Type", "application/json; charset=utf-8")
        self.send_header("Content-Length", str(len(body)))
        self.send_header("Cache-Control", "no-store")
        self.send_header("Access-Control-Allow-Origin", allowed_origin)
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header("Access-Control-Allow-Headers", "Content-Type")
        self.end_headers()
        self.wfile.write(body)

    def do_OPTIONS(self):
        self._send(204, {})

    def do_GET(self):
        if self.path == "/api/health":
            try:
                _configuration()
            except ApiError as error:
                self._send(error.status, {"status": "unconfigured"})
                return
            self._send(200, {"status": "ok"})
            return
        self._send(404, {"error": "Not found."})

    def do_POST(self):
        if not self.path.startswith("/api/rooms/"):
            self._send(404, {"error": "Not found."})
            return
        if not _allow_request(self.client_address[0]):
            self._send(429, {"error": "Too many requests. Wait a moment and try again."})
            return
        try:
            length = int(self.headers.get("Content-Length", "0"))
            if length < 1 or length > MAX_BODY_BYTES:
                raise ApiError(413, "The request body is too large or empty.")
            payload = json.loads(self.rfile.read(length).decode("utf-8"))
            if not isinstance(payload, dict):
                raise ApiError(400, "A JSON object is required.")
            actions = {
                "/api/rooms/create": _room_create,
                "/api/rooms/join": _room_join,
                "/api/rooms/sync": _room_sync,
                "/api/rooms/leave": _room_leave,
            }
            action = actions.get(self.path)
            if not action:
                raise ApiError(404, "Not found.")
            self._send(200, action(payload))
        except ApiError as error:
            self._send(error.status, {"error": str(error)})
        except (UnicodeDecodeError, json.JSONDecodeError):
            self._send(400, {"error": "The request body must be valid JSON."})
        except (KeyError, TypeError, ValueError):
            self._send(400, {"error": "The request is missing required fields."})

    def log_message(self, _format, *_args):
        return


def main():
    port = int(os.environ.get("PORT", "8788"))
    server = ThreadingHTTPServer(("0.0.0.0", port), MultiplayerHandler)
    print(f"WORLD HOP multiplayer API listening on port {port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("Stopping WORLD HOP multiplayer API.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
