/* Static server for local development.
   Serves HTTPS when localhost-cert.pem is present, otherwise plain HTTP.
   Chrome's speech recogniser is fussier about origins than getUserMedia is,
   so HTTPS removes one variable when transcription misbehaves. */
import http from 'http';
import https from 'https';
import fs from 'fs';
import p from 'path';

// package.json sets "type": "module", so __dirname does not exist here
const here = import.meta.dirname;

const T = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
            '.json':'application/json', '.svg':'image/svg+xml' };
const PORT = 8137;

const handler = (q, s) => {
  const f = p.join(here, q.url === '/' ? 'index.html' : q.url.split('?')[0]);
  if (!f.startsWith(here)) { s.writeHead(403); return s.end('no'); }
  fs.readFile(f, (e, d) => e
    ? (s.writeHead(404), s.end('not found'))
    : (s.writeHead(200, { 'content-type': T[p.extname(f)] || 'text/plain' }), s.end(d)));
};

let key, cert;
try {
  key  = fs.readFileSync(p.join(here, 'localhost-key.pem'));
  cert = fs.readFileSync(p.join(here, 'localhost-cert.pem'));
} catch (e) { /* fall back to http */ }

/* Leaving an old copy running is the normal way to hit this, and a raw
   unhandled 'error' event buries that under twenty lines of stack trace. */
const onError = e => {
  console.error(e.code === 'EADDRINUSE'
    ? `Port ${PORT} is already in use - another copy of this server is probably still running.`
    : e.message);
  process.exit(1);
};

if (key && cert) {
  https.createServer({ key, cert }, handler).on('error', onError).listen(PORT, () => {
    console.log(`https://localhost:${PORT}`);
    console.log('Self-signed certificate - Chrome will warn once.');
    console.log('Click "Advanced" then "Proceed to localhost (unsafe)".');
  });
} else {
  http.createServer(handler).on('error', onError).listen(PORT, () => console.log(`http://localhost:${PORT}`));
}
