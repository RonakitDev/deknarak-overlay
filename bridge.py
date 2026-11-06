"""Local WebSocket relay for normalized TikTok events.
Requires: pip install websockets
Run: python bridge.py
POST normalized JSON to http://127.0.0.1:8766/event
The bridge DOES NOT connect to TikTok. Use an authorized integration to POST events.
"""
import asyncio
import json
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from threading import Thread
from websockets.asyncio.server import serve

HOST = '127.0.0.1'
WS_PORT = 8765
HTTP_PORT = 8766
clients = set()
loop = None

async def publish(payload):
    if clients:
        await asyncio.gather(*(client.send(payload) for client in clients.copy()), return_exceptions=True)

async def ws_handler(websocket):
    clients.add(websocket)
    try:
        async for _ in websocket:
            pass
    finally:
        clients.discard(websocket)

class Handler(BaseHTTPRequestHandler):
    def do_POST(self):
        if self.path != '/event':
            self.send_error(404)
            return
        try:
            length = int(self.headers.get('Content-Length', '0'))
            if length <= 0 or length > 65536:
                raise ValueError('Invalid request size')
            raw = self.rfile.read(length)
            obj = json.loads(raw)
            if not isinstance(obj, (dict, list)):
                raise ValueError('Expected JSON object or array')
            asyncio.run_coroutine_threadsafe(publish(json.dumps(obj, ensure_ascii=False)), loop).result(timeout=5)
            self.send_response(204)
            self.end_headers()
        except (ValueError, json.JSONDecodeError) as exc:
            self.send_error(400, str(exc))
        except Exception:
            self.send_error(500)
    def log_message(self, fmt, *args):
        print(fmt % args)

async def main():
    global loop
    loop = asyncio.get_running_loop()
    server = ThreadingHTTPServer((HOST, HTTP_PORT), Handler)
    Thread(target=server.serve_forever, daemon=True).start()
    print(f'WebSocket ws://{HOST}:{WS_PORT} | HTTP http://{HOST}:{HTTP_PORT}/event')
    print('LOCALHOST ONLY — do not expose ports to the internet.')
    async with serve(ws_handler, HOST, WS_PORT):
        await asyncio.Future()

if __name__ == '__main__':
    asyncio.run(main())
