// Local HTTP test server with Range support, throttling, redirects, and failure modes.
'use strict';
const http = require('http');
const crypto = require('crypto');

function makeServer({ size = 5 * 1024 * 1024, throttleMs = 0, noRange = false } = {}) {
  const body = crypto.randomBytes(size);
  const sha256 = crypto.createHash('sha256').update(body).digest('hex');
  let rangeRequests = 0;

  const server = http.createServer((req, res) => {
    const url = new URL(req.url, 'http://x');
    if (url.pathname === '/missing') { res.writeHead(404); return res.end('not found'); }
    if (url.pathname === '/redirect') {
      res.writeHead(302, { Location: '/file.bin' });
      return res.end();
    }
    if (url.pathname === '/named') {
      res.writeHead(200, {
        'Content-Length': body.length,
        'Content-Disposition': 'attachment; filename="report final.pdf"',
      });
      return res.end(body);
    }

    const range = req.headers.range;
    const send = (buf, status, extra) => {
      res.writeHead(status, { 'Content-Length': buf.length, ...extra });
      if (!throttleMs) return res.end(buf);
      let i = 0;
      const step = () => {
        if (i >= buf.length) return res.end();
        res.write(buf.subarray(i, i + 16384));
        i += 16384;
        setTimeout(step, throttleMs);
      };
      step();
    };

    if (range && !noRange) {
      rangeRequests++;
      const m = /bytes=(\d+)-(\d*)/.exec(range);
      const start = Number(m[1]);
      const end = m[2] ? Number(m[2]) : body.length - 1;
      send(body.subarray(start, end + 1), 206, {
        'Content-Range': `bytes ${start}-${end}/${body.length}`,
        'Accept-Ranges': 'bytes',
      });
    } else {
      send(body, 200, {});
    }
  });

  return new Promise((resolve) => {
    server.listen(0, '127.0.0.1', () => {
      resolve({
        server,
        port: server.address().port,
        url: (p = '/file.bin') => `http://127.0.0.1:${server.address().port}${p}`,
        body,
        sha256,
        get rangeRequests() { return rangeRequests; },
        close: () => new Promise((r) => server.close(r)),
      });
    });
  });
}

module.exports = { makeServer };
