import unittest
from unittest.mock import patch

import multiplayer


class MultiplayerValidationTests(unittest.TestCase):
    def test_player_name_removes_control_characters_and_limits_length(self):
        self.assertEqual(multiplayer._sanitize_name("  Bea\n\0  "), "Bea")
        self.assertEqual(len(multiplayer._sanitize_name("a" * 30)), 20)

    def test_room_code_is_normalized_and_validated(self):
        self.assertEqual(multiplayer._validate_code("abc234"), "ABC234")
        with self.assertRaises(multiplayer.ApiError):
            multiplayer._validate_code("ABC-234")

    def test_room_capacity_is_validated_before_storage_access(self):
        with patch.object(multiplayer, "_database_request") as database:
            with self.assertRaises(multiplayer.ApiError) as error:
                multiplayer._room_create({"name": "Bea", "capacity": 1})
        self.assertEqual(error.exception.status, 400)
        database.assert_not_called()

    def test_join_rejects_full_room(self):
        with patch.object(multiplayer, "_database_request", return_value=[{"code": "ABC234", "capacity": 2}]), \
                patch.object(multiplayer, "_active_players", return_value=[{}, {}]):
            with self.assertRaises(multiplayer.ApiError) as error:
                multiplayer._room_join({"name": "Bea", "code": "abc234"})
        self.assertEqual(error.exception.status, 409)

    def test_sync_keeps_position_in_memory_and_only_updates_database_heartbeat(self):
        multiplayer.ROOM_STATES.clear()
        player = {"id": "player-1", "room_code": "ABC234"}
        with patch.object(multiplayer, "_read_token_player", return_value=player), \
                patch.object(multiplayer, "_database_request", return_value=[]) as database, \
                patch.object(multiplayer, "_active_players", return_value=[]) as active:
            result = multiplayer._room_sync({
                "code": "ABC234",
                "token": "session-token",
                "x": 12.345,
                "z": -6.789,
                "heading": 721,
                "zone": "giza",
            })
        self.assertEqual(result, {"players": []})
        self.assertEqual(multiplayer.ROOM_STATES["ABC234"]["player-1"], {
            "x": 12.35,
            "z": -6.79,
            "heading": 1,
            "zone": "giza",
        })
        self.assertEqual(set(database.call_args.kwargs["payload"]), {"last_seen"})
        self.assertIsInstance(database.call_args.kwargs["payload"]["last_seen"], str)
        active.assert_called_once_with("ABC234")


if __name__ == "__main__":
    unittest.main()
