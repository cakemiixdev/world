import argparse
import json
import shutil
from pathlib import Path


ROOT = Path(__file__).resolve().parent
ASSET_DIR = ROOT / "assets"
MAX_SIZE_BYTES = 20 * 1024 * 1024
IMAGE_EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}


def install_avatar(source_path):
    source = source_path.expanduser().resolve()
    if not source.is_file():
        raise ValueError(f"Avatar file does not exist: {source}")

    extension = source.suffix.lower()
    if extension != ".glb" and extension not in IMAGE_EXTENSIONS:
        raise ValueError("Choose a Roblox character exported as .glb, or an image: .png, .jpg, .jpeg, .webp.")
    size = source.stat().st_size
    if size == 0 or size > MAX_SIZE_BYTES:
        raise ValueError("Avatar files must be non-empty and no larger than 20 MB.")

    ASSET_DIR.mkdir(parents=True, exist_ok=True)
    asset_type = "glb" if extension == ".glb" else "image"
    installed_extension = ".glb" if asset_type == "glb" else extension
    destination = ASSET_DIR / f"player-avatar{installed_extension}"
    config_path = ASSET_DIR / "player-avatar.json"

    for old_extension in (".glb", *IMAGE_EXTENSIONS):
        old_file = ASSET_DIR / f"player-avatar{old_extension}"
        if old_file != destination and old_file.exists():
            old_file.unlink()

    if source != destination.resolve():
        shutil.copyfile(source, destination)
    config = {
        "type": asset_type,
        "file": destination.name,
        "extension": installed_extension.lstrip("."),
    }
    config_path.write_text(json.dumps(config, indent=2) + "\n", encoding="utf-8")
    return destination


def main():
    parser = argparse.ArgumentParser(
        description="Install a local avatar for WORLD HOP (a Roblox character exported as .glb or an image)."
    )
    parser.add_argument("avatar", type=Path, help="Path to a .glb, .png, .jpg, .jpeg, or .webp file")
    args = parser.parse_args()
    try:
        installed = install_avatar(args.avatar)
    except (OSError, ValueError) as error:
        parser.error(str(error))
    print(f"Installed avatar: {installed}")
    print("Reload WORLD HOP over HTTP. Build again before deploying to Cloudflare Pages.")


if __name__ == "__main__":
    main()
