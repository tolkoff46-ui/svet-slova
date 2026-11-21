const express = require('express');
const https = require('https');
const zlib = require('zlib');
const app = express();

app.use(express.json());

// Генератор настоящей PNG-иконки нужного размера (192x192 и 512x512)
function createAppIconPng(size) {
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    crcTable[n] = c;
  }
  function crc32(buf) {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = crcTable[(c ^ buf[i]) & 0xff] ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  }
  function pngChunk(type, data) {
    const t = Buffer.from(type, 'ascii');
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
    return Buffer.concat([len, t, data, crc]);
  }

  const rowSize = 1 + size * 4;
  const raw = Buffer.alloc(rowSize * size);
  const cx = Math.floor(size / 2);
  const cy = Math.floor(size * 0.43);
  const thick = Math.max(4, Math.floor(size / 14));
  const top = Math.floor(size * 0.22);
  const bottom = Math.floor(size * 0.78);
  const left = Math.floor(size * 0.28);
  const right = Math.floor(size * 0.72);

  for (let y = 0; y < size; y++) {
    const rowStart = y * rowSize;
    raw[rowStart] = 0;
    for (let x = 0; x < size; x++) {
      const px = rowStart + 1 + x * 4;
      const inVert = Math.abs(x - cx) <= thick && y >= top && y <= bottom;
      const inHoriz = Math.abs(y - cy) <= thick && x >= left && x <= right;
      if (inVert || inHoriz) {
        raw[px] = 255; raw[px + 1] = 255; raw[px + 2] = 255; raw[px + 3] = 255;
      } else {
        raw[px] = 184; raw[px + 1] = 155; raw[px + 2] = 94; raw[px + 3] = 255;
      }
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr[8] = 8; ihdr[9] = 6;

  return Buffer.concat([
    Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]),
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', zlib.deflateSync(raw)),
    pngChunk('IEND', Buffer.alloc(0))
  ]);
}

const ICON_192 = createAppIconPng(192);
const ICON_512 = createAppIconPng(512);

app.get('/icon-192.png', (req, res) => {
  res.setHeader('Content-Type', 'image/png');
  res.send(ICON_192);
});

app.get('/icon-512.png', (req, res) => {
  res.setHeader('Content-Type', 'image/png');
  res.send(ICON_512);
});

app.get('/manifest.json', (req, res) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.json({
    id: '/',
    name: 'Свет Слова — Духовный навигатор',
    short_name: 'Свет Слова',
    start_url: '/',
    scope: '/',
    display: 'standalone',
    background_color: '#FAF8F5',
    theme_color: '#B89B5E',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }
    ]
  });
});

app.get('/sw.js', (req, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`
    self.addEventListener('install', () => self.skipWaiting());
    self.addEventListener('activate', (e) => e.waitUntil(self.clients.claim()));
    self.addEventListener('fetch', (e) => e.respondWith(fetch(e.request).catch(() => caches.match(e.request))));
  `);
});

app.use(express.static(__dirname));

app.post('/api/chat', (req, res) => {
  const apiKey = (process.env.VSEGPT_KEY || '').trim();
  if (!apiKey) {
    return res.status(500).json({ error: 'Ключ VSEGPT_KEY не найден в переменных Amvera' });
  }

  const postData = JSON.stringify({
    model: 'openai/gpt-4o',
    messages: req.body.messages,
    temperature: 0.8
  });

  const options = {
    hostname: 'api.vsegpt.ru',
    port: 443,
    path: '/v1/chat/completions',
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`,
      'Content-Length': Buffer.byteLength(postData)
    }
  };

  const request = https.request(options, (response) => {
    let rawData = '';
    response.on('data', (chunk) => { rawData += chunk; });
    response.on('end', () => {
      try {
        const parsed = JSON.parse(rawData);
        res.status(response.statusCode).json(parsed);
      } catch (e) {
        res.status(502).json({ error: 'VseGPT вернул не JSON. Статус: ' + response.statusCode });
      }
    });
  });

  request.on('error', (err) => {
    res.status(500).json({ error: err.message });
  });

  request.write(postData);
  request.end();
});

app.post('/api/pay', (req, res) => {
  const { amount } = req.body;
  const shopId = (process.env.YOOKASSA_SHOP_ID || '').trim();
  const secretKey = (process.env.YOOKASSA_SECRET_KEY || '').trim();

  if (!shopId || !secretKey) {
    return res.status(503).json({
      status: 'pending_setup',
      message: `Автооплата на сумму ${amount} ₽ готовится к запуску. Пока вы можете активировать доступ по коду благодарности.`
    });
  }

  res.json({ status: 'ok', amount });
});

const PORT = process.env.PORT || 80;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
