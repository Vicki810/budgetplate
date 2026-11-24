"""Open the local app; stop with Ctrl+C in the launcher terminal."""
from http.server import ThreadingHTTPServer, SimpleHTTPRequestHandler
from functools import partial
from pathlib import Path
import webbrowser

server = ThreadingHTTPServer(('127.0.0.1', 0), partial(SimpleHTTPRequestHandler, directory=str(Path(__file__).parent / 'dist')))
url = f'http://127.0.0.1:{server.server_port}'
print(f'BudgetPlate is running at {url}\nKeep this window open. Press Control+C to stop.', flush=True)
webbrowser.open(url)
try:
    server.serve_forever()
except KeyboardInterrupt:
    pass
finally:
    server.server_close()
