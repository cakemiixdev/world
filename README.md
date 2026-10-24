# WORLD HOP!

A browser-based block-built 3D exploration game built with plain JavaScript ES modules and Three.js, with a standalone 2D Retro Tower mode linked from the title screen. The game uses an original Roblox-like visual direction; it does not bundle or copy Minecraft or Roblox code, models, or textures.

## Run locally

Start the Python standard-library server (no npm installation is needed for a local preview):

```powershell
py -3 server.py
```

Open `http://127.0.0.1:8000/`. The source page loads Three.js from jsDelivr, so the source version needs an internet connection. Do not open the HTML file directly with `file://`. Open **Controls & Accessibility** from the title screen or pause menu to choose keyboard, touch, or controller guidance. On touchscreens, enable the on-screen move pad and action buttons there; drag the open world to look around when pointer lock is unavailable.

Quick feature check: open the field board, search `Everest` or `28.0026`, click an A–Z filter, then use the on-screen letter keys to edit the search. Select a destination, continue through the arrival frame, and talk to the contact with **E**. Choose a response to accept their mission, follow the compass to the named landmark, and press **E** to recover the requested item. The carry badge shows the item; follow the compass back to the contact and press **E** to turn it in and claim field tokens.

## Character and conversations

Gameplay uses a first-person camera with visible low-poly explorer arms. Field interviews switch to a live two-shot framing the blocky player avatar and local contact. Dialogue appears as timed subtitles; supported browsers can read it aloud with their built-in speech voice. Use **VOICE: ON/OFF** to control speech. Arrival dispatches keep their illustrated freeze-frame. Mission turn-ins and completed field trials end with an illustrated victory screen showing the token reward or replay status.

The game includes a block-built avatar used in dialogue scenes and multiplayer rooms. Keyboard movement stays available even when a browser blocks pointer lock; click and drag the world to look around. To replace the starter character, install Python and run this from the project folder:

```powershell
python avatar.py "C:\path\to\your-character.glb"
```

Use a `.glb` export of a Roblox avatar, or pass an image (`.png`, `.jpg`, `.jpeg`, or `.webp`) to use it as a character cutout. The helper uses only Python's standard library and copies the file into `assets/`; it does not download or extract characters from Roblox accounts. Files are limited to 20 MB. Reload the game over HTTP to see the avatar. Run `npm run build` before deployment; the regular build copies the avatar assets into `dist/assets/`. The standalone single-file build does not embed custom avatar assets.

To serve a different folder or port:

```powershell
python server.py --directory dist --port 8001
```

## Build and deploy

Run the exploration and saved-progress unit tests with `npm test`.

Mission progress, completed locations, discovered clues, and field tokens are saved in this browser's local storage, so a refresh does not restart your adventure. Saves stay on this device; they are not uploaded to a cloud database.

```powershell
npm run build
```

This creates `dist/index.html`, `dist/bundle.js`, `dist/style.css`, and a Cloudflare Pages redirect from `/code.html` to `/index.html`; the bundle includes Three.js. Build a self-contained HTML file with:

```powershell
npm run build:single
```

That writes `dist/index-single.html`. Preview the regular build at `http://127.0.0.1:8000/` using `npm run serve:dist`. The game HTML entry point is `index.html`.

## Publish the single-player game on GitHub Pages

The single-player game is a static site and does not need a Node or Python server after deployment. In the repository, open **Settings → Pages**, choose **Deploy from a branch**, select **main** and **/(root)**, then save. GitHub Pages will serve `index.html` as the homepage. The browser needs an internet connection to load Three.js from jsDelivr.

GitHub Pages cannot host the Python multiplayer API. For a versioned setup guide and source snapshot, see the [Friend Rooms API v1.0 release](https://github.com/cakemiixdev/world/releases/tag/friend-rooms-v1.0.0). Deploy the included `render.yaml` Blueprint and configure the server-only Supabase variables described below; never expose the service-role key in the browser.

## Friend rooms (Python API + Supabase)

The game frontend stays on Cloudflare Pages. Multiplayer runs as a separate, standard-library Python HTTP service; Pages cannot run Python itself. The API shares room codes, names, and live player movement. A free Supabase project stores only room code/capacity, player name, a **SHA-256 token hash**, and last-active time. Raw player tokens are returned once and kept in the browser tab's `sessionStorage`. Player positions are held in the Python process memory, so deploy one API instance; positions reset if that service restarts.

1. Create a Supabase project and run [`multiplayer-schema.sql`](./multiplayer-schema.sql) in its SQL editor.
2. Deploy this repository's [`render.yaml`](./render.yaml) as a Render Blueprint. Set `SUPABASE_URL`, `SUPABASE_SERVICE_ROLE_KEY` (server-side only), and `WORLD_HOP_ALLOWED_ORIGIN` to your exact Cloudflare Pages origin. Never put the service-role key in the game or commit it.
3. In WORLD HOP, open **MULTIPLAYER ROOM**, enter the deployed API's HTTPS URL and a player name, then create a room. Share the six-character code; friends enter the same API URL and code to join.

For local API development, configure `SUPABASE_URL` and `SUPABASE_SERVICE_ROLE_KEY` in the shell, then run `python multiplayer.py`. The API listens on `http://127.0.0.1:8788` through the `PORT` environment variable. On a local HTTP game page, use that URL in the multiplayer panel. The free Render service may sleep while idle; the first connection can take a little longer.

## Controls

- **WASD** — move
- **W / S** — follow the short, straight field path; **A / D** allow only a narrow sidestep
- **C (hold)** — crouch; move quietly and make yourself harder to spot
- **Mouse** — click and drag the world to look around; keyboard movement does not require pointer lock
- **Q** — throw a noise-maker ahead to distract the watcher
- **Space** — jump; gain lift while swimming; gain lift while gliding
- **F** — toggle gliding while airborne, or arm a glide before jumping
- **E** — talk to a nearby contact, recover/return a mission item, or climb/leave the hub ladder
- **Shift (hold)** — sprint on foot (the watcher hears you); dive while swimming or gliding
- **M** — open or close the zone map
- **L** — toggle flashlight, useful in the cave routes
- **1 / 2** — select the flashlight / spyglass inventory slot
- **Z** — toggle spyglass zoom; hold **right mouse** while the spyglass is selected
- **V** — cycle the compass between the active clue, landmark, and cave
- **G** — open field trials when you are in a location with a challenge
- **Gamepad** — left stick move, right stick look; A jump/confirm, B interact/back, X noise-maker, Y glide, LB crouch, RB sprint, LT flashlight, View map, Start pause, D-pad up challenges/down map/left-right compass
- **Touchscreen** — open **Controls & Accessibility** and enable **Show touch buttons**; use the move pad, action buttons, and on-screen **MAP** button, drag the open world to look, and use **PAUSE** in the HUD.

For a gamepad, connect it by USB or pair it in your computer's Bluetooth settings, open the game, and press any controller button once. The browser only reports a controller after that first button press. The HUD shows whether the browser detected it and whether it reports a standard or generic layout.
- **Escape** — pause/resume; click the world to continue after resuming
- **Click the compass** — cycle between available field destinations
- **Click FIELD QUEST** — expand or collapse your current objective and clue count
- **Click STATS** — show session time, distance, and collected clue count
- **Alt+F4** — close the game window; browsers block webpages from closing themselves

## Exploration

Start at the field board to choose a country and exact destination. Search by country, landmark, city, or coordinates; filter by the first letter of the country or location; or click keys on the built-in keyboard. The starter catalog has ten destinations, including the Reykjanes Lava Fields in Iceland and the Serengeti Migration Trail in Tanzania, with coordinates for real-world sites. Its atlas is an original, stylized overview, not Google Earth imagery or live map tiles. Each location has a distinct procedural block-built site cluster—Parisian townhouses, Giza survey buildings, Everest tents and lodges, Inca stone houses, a canyon ranger station, Mughal garden pavilions, and Great Wall watchtowers—alongside the larger biome terrain, trails, field outposts, and dark cave routes. These are original Three.js models, not imported Minecraft or Roblox assets. The game borrows the readable block-world adventure feel of action RPGs while keeping missions age-appropriate: talk to a local, recover a named item at a specific landmark, carry it back, and earn field tokens. There are no firearms or graphic violence. Use the compass to follow the active mission, landmark, cave route, or outpost (press **V** or click the compass to cycle); press **L** to light cave interiors. The normal gameplay screen stays intentionally minimal: compass, pause button, carry-item badge, and a small clickable quest card that opens the current objective and clue count. These locations remain stylized interpretations, not exhaustive photogrammetric reconstructions or a full-scale map of every place on Earth. Arrivals pause on an illustrated freeze-frame dispatch; press **Continue** to enter the scene. A distinct 3D field contact waits beside each landmark. Press **E**, choose a response to accept their request, and follow the compass to the highlighted item. Press **E** to pick it up, return to the contact, and press **E** again to complete the mission and claim field tokens. Completed missions, clues, tokens, completed trials, and personal-best times are saved locally in the browser. Press **M** to hop to another destination. Press **G** to open a location's field trials: run checkpoint gates on Everest or Mutianyu, swim through the Beacon Island or Taj Mahal river gates, jump and glide through sky hoops in mountain, forest, desert, and canyon zones, or crouch through green signal gates in the Quiet Trail challenge available at every location. First-time trial completions award field tokens; later runs can still improve the saved best time. Snowfall and drifting dust add lightweight ambient effects to Everest and Giza. An original roaming watcher patrols each biome and investigates sprinting and jump sounds; avoid it by crouching, hiding behind cover, or throwing a noise-maker with **Q** to distract it. Press **Escape** for a bold pause screen with the full controls and settings.

## Project layout

- `index.html` — game UI shell and Three.js import map
- `style.css` — high-contrast game UI
- `main.js` — renderer, first-person camera, input/UI wiring, remote player visuals, and animation loop
- `world.js` — biome presets, procedural terrain, and landmark assembly
- `buildings.js` — reusable block-built architecture and location-specific site layouts
- `player.js` — constrained walking, jumping, climbing, swimming, gliding, and camera look
- `gamepad.js` — standard browser Gamepad API polling, analog dead zones, and edge-triggered buttons
- `inventory.js` — flashlight and spyglass hotbar
- `multiplayer.js` — friend-room UI, API requests, and live session sync
- `multiplayer.py` — standard-library room API for Render
- `multiplayer-schema.sql` — minimal Supabase room/player tables
- `render.yaml` — Render Blueprint for the Python API
- `map.js` — bulletin-board travel selector and locally drawn destination atlas
- `destinations.js` — ten exact-coordinate starter entries and per-location dialogue/clues
- `story.js` — arrival freeze-frames, local dialogue, and location clues
- `fieldwork.js` — mission item markers, carry/return state, turn-ins, and field-token rewards
- `player-avatar.js` — block avatar and locally loaded image/GLB replacements
- `avatar.py` — standard-library helper to install a user-provided image or GLB
- `exploration.js` — landmark directions, discoveries, and session progress
- `progress.js` — versioned local save data for missions, clues, and field tokens
- `neighbor.js` — original watcher patrol, sight/sound investigation, chase/search AI, and animated noise-maker feedback
- `minigames.js` — checkpoint courses for the Everest ridge climb, river swim, and airborne glide trial; per-course best times are saved locally
- `server.py` — Python standard-library HTTP server
- `build.js` — esbuild regular and single-file builds

`index.html` is the sole HTML source entry point and is copied to `dist/index.html` by the build.
