# DEKNARAK — TikTok Gaming Overlay (1080 × 1920)

Transparent vertical gaming HUD. No webcam. Black × Cyan Futuristic.

## Files
- `index.html` — overlay structure
- `style.css` — theme, panels, animations
- `config.js` — channel, initial follower count, target, WebSocket address
- `script.js` — follower goal, gifts, supporters, alerts, demo and WebSocket client
- `bridge.py` — optional local HTTP-to-WebSocket relay (NOT a TikTok connector)

## OBS setup
1. Set **Settings → Video → Base (Canvas) Resolution** to **1080 × 1920** and **Output (Scaled) Resolution** to **1080 × 1920**.
2. Add **Game Capture** (or Window Capture) and position it behind the overlay, within the open central area (roughly x=35–1045, y=330–1170). OBS can crop/scale your game source as needed.
3. Add **Browser Source** above Game Capture. Enable **Local file**, select `index.html`, set **Width 1080** and **Height 1920**. The overlay background is transparent.
4. In `config.js`, edit `initialFollowers` and `followerTarget`. Do not claim real data unless supplied by an actual integration.
5. For live data, run the optional relay and connect an authorized TikTok event provider to its HTTP endpoint.
6. To test animations outside OBS, open `index.html?demo=1` in a browser via a local web server. See Demo below.

## Demo mode (SIMULATED, explicitly marked)
In the overlay folder run `python -m http.server 8080`, then open `http://127.0.0.1:8080/index.html?demo=1`.
Press 1 = fake follow, 2 = fake Rose gift, 3 = fake Galaxy gift, 4 = reset. Demo mode displays a visible DEMO MODE label and does not connect to the relay.
Normal `index.html` NEVER generates simulated events.

## Live data relay (optional)
Requires Python 3.10+ and `pip install websockets` (current versions using `websockets.asyncio.server`).
Run `python bridge.py`. It listens **only on localhost**:
- WebSocket (overlay): `ws://127.0.0.1:8765`
- HTTP ingestion: `http://127.0.0.1:8766/event`

PowerShell example (while bridge.py runs):
```powershell
Invoke-RestMethod -Uri http://127.0.0.1:8766/event -Method Post -ContentType 'application/json' -Body '{"type":"follow","user":"Viewer123"}'
```
This example is a **manual test**, not a real TikTok event. A TikTok provider must supply real events.

### Normalized JSON event schema
```json
{"type":"follow","user":"Viewer123","totalFollowers":685}
{"type":"gift","user":"Viewer123","gift":"Rose","count":3,"points":3}
{"type":"followers","total":685}
{"type":"goal","target":1000}
{"type":"supporters","items":[{"user":"Viewer123","points":300},{"user":"Other","points":120}]}
{"type":"reset"}
```
- `follow` increments the counter if `totalFollowers` is absent. Use `followers` events for authoritative totals.
- `gift.points` is an **integration-supplied numeric ranking score**, not necessarily money, diamonds or TikTok coins. Provide a consistent scoring unit.
- Some gift providers send streak updates; normalize/aggregate before posting so gifts are not double counted.
- `supporters` replaces the leaderboard; gift events with `points` increment scores during the current session.
- No persistent storage: values reset on reload unless your integration sends snapshots. Send authoritative follower/supporter snapshots on connect for accuracy.
- The local relay is unauthenticated and intended only for trusted software on the same PC. Do not expose the ports to a network or the public internet.

## Real TikTok connection — important distinction
The package **does not directly log in to TikTok or automatically read TikTok LIVE**. It accepts normalized events from an authorized connector or service (for example, where a provider supports webhooks, custom actions or HTTP calls). Set up your provider's event mapping to POST the JSON shown above to the local relay. Provider capabilities, TikTok access and gift event formats vary; no direct compatibility with a specific third-party app is guaranteed.

## TikTok LIVE Studio
OBS Browser Source is straightforward. If you broadcast via TikTok LIVE Studio instead, add a browser/webpage source if supported by your version, or use a supported OBS-to-LIVE-Studio capture workflow. Streaming eligibility and input methods depend on TikTok account permissions.

## Design notes
- Transparent gameplay area: overlay only draws corners and labels over the center.
- Bottom dashboard and top banner are opaque; place the game where it remains readable.
- Browser Source uses the fixed 1080 × 1920 design dimensions.
- Alerts intentionally cover gameplay briefly; reduce `alertDurationMs` in `config.js` if desired.
