import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { extname, resolve, sep } from 'node:path';

const root = resolve('out');
const basePath = process.env.BASE_PATH ?? '';
const port = Number(process.env.PORT ?? 4173);
const contentTypes = {
  '.css': 'text/css; charset=utf-8',
  '.html': 'text/html; charset=utf-8',
  '.ico': 'image/x-icon',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.ttf': 'font/ttf',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2',
};

createServer(async (request, response) => {
  if (request.method !== 'GET' && request.method !== 'HEAD') {
    response.writeHead(405).end();
    return;
  }

  let pathname;
  try {
    pathname = decodeURIComponent(new URL(request.url ?? '/', 'http://localhost').pathname);
  } catch {
    response.writeHead(400).end('Invalid URL');
    return;
  }

  if (basePath && pathname !== basePath && !pathname.startsWith(`${basePath}/`)) {
    response.writeHead(404).end('Not found');
    return;
  }
  const relativePath = basePath ? pathname.slice(basePath.length) : pathname;
  const requestedPath = resolve(root, `.${relativePath}`);
  if (requestedPath !== root && !requestedPath.startsWith(`${root}${sep}`)) {
    response.writeHead(403).end('Forbidden');
    return;
  }

  const candidates = [requestedPath, resolve(requestedPath, 'index.html'), `${requestedPath}.html`];
  let filePath;
  for (const candidate of candidates) {
    try {
      if ((await stat(candidate)).isFile()) {
        filePath = candidate;
        break;
      }
    } catch (error) {
      if (error.code !== 'ENOENT' && error.code !== 'ENOTDIR') throw error;
    }
  }

  if (!filePath) {
    response.writeHead(404).end('Not found');
    return;
  }

  const body = await readFile(filePath);
  response.writeHead(200, {
    'content-type': contentTypes[extname(filePath)] ?? 'application/octet-stream',
    'content-length': body.length,
  });
  response.end(request.method === 'HEAD' ? undefined : body);
}).listen(port, '127.0.0.1');
