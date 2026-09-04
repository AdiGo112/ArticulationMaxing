/* Static server for local development.
   Serves HTTPS when localhost-cert.pem is present, otherwise plain HTTP.
   Chrome's speech recogniser is fussier about origins than getUserMedia is,
   so HTTPS removes one variable when transcription misbehaves. */
const http = require('http'), https = require('https');
const fs = require('fs'), p = require('path');

const T = { '.html':'text/html', '.js':'text/javascript', '.css':'text/css',
            '.json':'application/json', '.svg':'image/svg+xml' };
const PORT = 8137;

const handler = (q, s) => {
  const f = p.join(__dirname, q.url === '/' ? 'index.html' : q.url.split('?')[0]);
  if (!f.startsWith(__dirname)) { s.writeHead(403); return s.end('no'); }
  fs.readFile(f, (e, d) => e
    ? (s.writeHead(404), s.end('not found'))
    : (s.writeHead(200, { 'content-type': T[p.extname(f)] || 'text/plain' }), s.end(d)));
};

let key, cert;
try {
  key  = fs.readFileSync(p.join(__dirname, 'localhost-key.pem'));
  cert = fs.readFileSync(p.join(__dirname, 'localhost-cert.pem'));
} catch (e) { /* fall back to http */ }

if (key && cert) {
  https.createServer({ key, cert }, handler).listen(PORT, () => {
    console.log(`https://localhost:${PORT}`);
    console.log('Self-signed certificate â€” Chrome will warn once.');
    console.log('Click "Advanced" then "Proceed to localhost (unsafe)".');
  });
} else {
  http.createServer(handler).listen(PORT, () => console.log(`http://localhost:${PORT}`));
}
