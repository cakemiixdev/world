import argparse
from http.server import SimpleHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path


ROOT = Path(__file__).resolve().parent


def main():
    parser = argparse.ArgumentParser(description="Serve WORLD HOP over HTTP.")
    parser.add_argument("--host", default="127.0.0.1", help="Host interface (default: 127.0.0.1)")
    parser.add_argument("--port", type=int, default=8000, help="HTTP port (default: 8000)")
    parser.add_argument("--directory", type=Path, default=ROOT, help="Directory to serve")
    args = parser.parse_args()
    directory = (args.directory if args.directory.is_absolute() else ROOT / args.directory).resolve()
    if not directory.is_dir():
        parser.error(f"directory does not exist: {directory}")

    class ProjectRequestHandler(SimpleHTTPRequestHandler):
        def __init__(self, *handler_args, **handler_kwargs):
            super().__init__(*handler_args, directory=str(directory), **handler_kwargs)

    server = ThreadingHTTPServer((args.host, args.port), ProjectRequestHandler)
    print(f"WORLD HOP is running at http://{args.host}:{args.port}")
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopping WORLD HOP server.")
    finally:
        server.server_close()


if __name__ == "__main__":
    main()
