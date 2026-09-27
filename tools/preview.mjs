// Local UI preview only. The extension package never loads the preview bridge.
import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { resolve, dirname, extname, sep } from 'node:path';
import { fileURLToPath } from 'node:url';
const root = resolve(dirname(fileURLToPath(import.meta.url)), '..');
const args = process.argv.slice(2);
const port = Number(args[args.indexOf('--port') + 1]) || 4173;
const types = {'.html':'text/html; charset=utf-8','.js':'text/javascript; charset=utf-8','.mjs':'text/javascript; charset=utf-8','.css':'text/css; charset=utf-8','.svg':'image/svg+xml','.webp':'image/webp','.png':'image/png','.woff2':'font/woff2','.json':'application/json'};
http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, 'http://preview.local');
    let path = decodeURIComponent(url.pathname);
    if (path === '/') path = '/tools/preview/index.html';
    const file = resolve(root, '.' + path);
    if (!file.startsWith(root + sep)) throw new Error('Invalid path');
    let body = await readFile(file);
    if (path === '/extension/popup/popup.html') {
      body = Buffer.from(body.toString().replace(/<script\b[^>]*src="popup\.js"[^>]*>/, '<script type="module" src="/tools/preview/bridge.js"></script><script type="module" src="popup.js">'));
    }
    res.writeHead(200, {'Content-Type':types[extname(file)] || 'application/octet-stream','Cache-Control':'no-store'});
    res.end(body);
  } catch {res.writeHead(404); res.end('Not found');}
}).listen(port, '0.0.0.0', () => console.log(`Local UI preview on port ${port}`));
