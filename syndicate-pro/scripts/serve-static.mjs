import http from 'http';
import fs from 'fs';
import path from 'path';

const port = process.env.PORT ? parseInt(process.env.PORT) : 5180;
const root = process.cwd();

const server = http.createServer((req, res) => {
  const url = new URL(req.url, `http://${req.headers.host}`);
  let filePath = path.join(root, url.pathname);
  if (url.pathname === '/' || url.pathname === '/ani') {
    filePath = path.join(root, 'ani.html');
  }
  fs.readFile(filePath, (err, data) => {
    if (err) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('Not Found');
      return;
    }
    const ext = path.extname(filePath);
    const type = ext === '.html' ? 'text/html' : 'text/plain';
    res.writeHead(200, { 'Content-Type': type });
    res.end(data);
  });
});

server.listen(port, () => {
  console.log(`Voice Companion at http://localhost:${port}/ani`);
});