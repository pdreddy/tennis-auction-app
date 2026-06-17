import http from 'node:http';
import fs from 'node:fs/promises';
import path from 'node:path';

const root = path.resolve(new URL('..', import.meta.url).pathname);
const port = Number(process.env.PORT || 5173);
const types = new Map([
  ['.html', 'text/html; charset=utf-8'],
  ['.json', 'application/json; charset=utf-8'],
  ['.toml', 'text/plain; charset=utf-8'],
  ['.js', 'text/javascript; charset=utf-8'],
]);

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  const safePath = path.normalize(decodeURIComponent(url.pathname)).replace(/^(\.\.[/\\])+/, '');
  const filePath = path.join(root, safePath === '/' ? 'index.html' : safePath);

  if (!filePath.startsWith(root)) {
    res.writeHead(403).end('Forbidden');
    return;
  }

  try {
    const data = await fs.readFile(filePath);
    res.writeHead(200, { 'Content-Type': types.get(path.extname(filePath)) || 'application/octet-stream' });
    res.end(data);
  } catch {
    const fallback = await fs.readFile(path.join(root, 'index.html'));
    res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
    res.end(fallback);
  }
});

server.listen(port, '0.0.0.0', () => {
  console.log(`Tennis Auction app is running at http://localhost:${port}`);
});
