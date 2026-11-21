const express = require('express');
const https = require('https');
const crypto = require('crypto');
const zlib = require('zlib');
const app = express();

app.use(express.json());

function createIcon(size) {
  const crcTable = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xedb88320 ^ (c >>> 1)) : (c >>> 1);
    crcTable.set([c], n);
  }
  const crc32 = (buf) => {
    let c = 0xffffffff;
    for (let i = 0; i < buf.length; i++) c = crcTable.at((c ^ buf.readUInt8(i)) & 0xff) ^ (c >>> 8);
    return (c ^ 0xffffffff) >>> 0;
  };
  const chunk = (type, data) => {
    const t = Buffer.from(type, 'ascii');
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length, 0);
    const crc = Buffer.alloc(4);
    crc.writeUInt32BE(crc32(Buffer.concat([t, data])), 0);
    return Buffer.concat([len, t, data, crc]);
  };

  const rowSize = 1 + size * 4;
  const raw = Buffer.alloc(rowSize * size);
  const cx = Math.floor(size / 2), cy = Math.floor(size * 0.43), thick = Math.max(4, Math.floor(size / 14));
  const top = Math.floor(size * 0.22), bottom = Math.floor(size * 0.78), left = Math.floor(size * 0.28), right = Math.floor(size * 0.72);

  for (let y = 0; y < size; y++) {
    const row = y * rowSize;
    raw.writeUInt8(0, row);
    for (let x = 0; x < size; x++) {
      const px = row + 1 + x * 4;
      const cross = (Math.abs(x - cx) <= thick && y >= top && y <= bottom) || (Math.abs(y - cy) <= thick && x >= left && x <= right);
      raw.writeUInt32BE(cross ? 0xffffffff : 0xb89b5eff, px);
    }
  }

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(size, 0);
  ihdr.writeUInt32BE(size, 4);
  ihdr.writeUInt8(8, 8);
  ihdr.writeUInt8(6, 9);

  return Buffer.concat([Buffer.from('89504e470d0a1a0a', 'hex'), chunk('IHDR', ihdr), chunk('IDAT', zlib.deflateSync(raw)), chunk('IEND', Buffer.alloc(0))]);
}

const ICON_192 = createIcon(192);
const ICON_512 = createIcon(512);

app.get('/icon-192.png', (_, res) => { res.setHeader('Content-Type', 'image/png'); res.send(ICON_192); });
app.get('/icon-512.png', (_, res) => { res.setHeader('Content-Type', 'image/png'); res.send(ICON_512); });

app.get('/robots.txt', (_, res) => {
  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.send(`User-agent: *\nAllow: /\nAllow: /offer\nDisallow: /api/\nSitemap: https://svetslova-app.ru\n`);
});

app.get('/sitemap.xml', (_, res) => {
  res.setHeader('Content-Type', 'application/xml; charset=utf-8');
  res.send(`<?xml version="1.0" encoding="UTF-8"?>
<urlset xmlns="http://sitemaps.org">
  <url><loc>https://svetslova-app.ru</loc><changefreq>daily</changefreq><priority>1.0</priority></url>
  <url><loc>https://svetslova-app.ruoffer</loc><changefreq>monthly</changefreq><priority>0.5</priority></url>
</urlset>`);
});

app.get('/manifest.json', (_, res) => {
  res.setHeader('Content-Type', 'application/manifest+json');
  res.json({
    id: '/', name: 'Свет Слова — Духовный навигатор', short_name: 'Свет Слова',
    start_url: '/', scope: '/', display: 'standalone', background_color: '#FAF8F5', theme_color: '#B89B5E',
    icons: [
      { src: '/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any' },
      { src: '/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any' }
    ]
  });
});

app.get('/sw.js', (_, res) => {
  res.setHeader('Content-Type', 'application/javascript');
  res.send(`self.addEventListener('install',()=>self.skipWaiting());self.addEventListener('activate',e=>e.waitUntil(self.clients.claim()));self.addEventListener('fetch',e=>e.respondWith(fetch(e.request).catch(()=>caches.match(e.request))));`);
});

app.get('/offer', (_, res) => {
  res.setHeader('Content-Type', 'text/html; charset=utf-8');
  res.send(`<!DOCTYPE html><html lang="ru"><head><meta charset="UTF-8"><meta name="viewport" content="width=device-width,initial-scale=1.0"><title>Публичная оферта — Свет Слова</title>
<style>body{font-family:-apple-system,sans-serif;background:#FAF8F5;color:#2C3539;line-height:1.6;padding:24px;max-width:680px;margin:0 auto}h1{font-size:20px;margin-bottom:14px}h2{font-size:15px;margin:18px 0 6px;color:#B89B5E}p{margin-bottom:10px;font-size:14px}.box{background:#fff;border:1px solid #EAE4D7;border-radius:12px;padding:16px;margin-top:16px}a{color:#B89B5E}</style>
</head><body><p><a href="/">← Назад в приложение</a></p><h1>Публичная оферта на оказание информационных услуг</h1>
<p>Настоящий документ является предложением самозанятого (НПД) Гуридова Германа Геннадьевича (ИНН 190101683586), далее — «Исполнитель», любому физическому лицу («Пользователь»).</p>
<h2>1. Предмет договора</h2><p>Предоставление расширенного доступа к информационному справочнику-навигатору «Свет Слова» (https://svetslova-app.ru) на 30 календарных дней (снятие суточного лимита запросов и открытие режима подробного разбора).</p>
<h2>2. Стоимость и оплата</h2><p>Стоимость доступа на 30 дней — от 150 рублей (Пользователь вправе указать любую сумму выше). Оплата через ЮKassa без автосписаний.</p>
<h2>3. Предоставление доступа и возврат</h2><p>Доступ активируется автоматически сразу после оплаты. При техническом сбое Пользователь может обратиться на почту Исполнителя для восстановления доступа или возврата средств.</p>
<div class="box"><h2 style="margin-top:0">Реквизиты Исполнителя</h2><p>Гуридов Герман Геннадьевич (плательщик НПД)<br>ИНН: 190101683586<br>Почта: svetslova.help@mail.ru<br>Сайт: https://svetslova-app.ru</p></div></body></html>`);
});

app.use(express.static(__dirname));
function callVseGPT(apiKey, messages, temperature = 0.8) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({ model: 'openai/gpt-4o', messages, temperature });
    const req = https.request({
      hostname: 'api.vsegpt.ru', port: 443, path: '/v1/chat/completions', method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': `Bearer ${apiKey}`, 'Content-Length': Buffer.byteLength(postData) }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve({ status: res.statusCode, text: data }));
    });
    req.on('error', reject);
    req.write(postData);
    req.end();
  });
}

let dailyCache = { date: '', data: null };

app.get('/api/daily-word', async (_, res) => {
  const today = new Date().toLocaleDateString('ru-RU', { timeZone: 'Europe/Moscow' });
  if (dailyCache.date === today && dailyCache.data) return res.json(dailyCache.data);

  const fallback = {
    quote: '«Господь — Пастырь мой; я ни в чем не буду нуждаться: Он покоит меня на злачных пажитях и водит меня к водам тихим.»',
    source: 'Псалтирь, Псалом 22, стихи 1–2',
    meaning: 'Когда душа мечется в суете, святитель Иоанн Златоуст напоминает: доверившийся Богу обретает внутренний покой даже посреди житейских бурь.'
  };

  const apiKey = (process.env.VSEGPT_KEY || '').trim();
  if (!apiKey) return res.json(fallback);

  try {
    const prompt = `Сегодня ${today}. Подбери одно глубокое «Слово дня» из Синодального перевода Библии (не Мф. 6:34). Только русский язык, без иностранных слов. Верни чистый JSON: {"quote":"«Цитата»","source":"Книга, глава, стих","meaning":"Краткое пояснение смысла со ссылкой на святого отца (2 предложения)."}`;
    const result = await callVseGPT(apiKey, [{ role: 'user', content: prompt }], 0.85);
    const content = JSON.parse(result.text).choices.at(0).message.content.replace(/```json|```/g, '').trim();
    const word = JSON.parse(content);
    if (word.quote && word.source && word.meaning) {
      dailyCache = { date: today, data: word };
      return res.json(word);
    }
  } catch (e) {}
  res.json(fallback);
});

app.post('/api/chat', async (req, res) => {
  const apiKey = (process.env.VSEGPT_KEY || '').trim();
  if (!apiKey) return res.status(500).json({ error: 'Не задан VSEGPT_KEY' });
  try {
    const result = await callVseGPT(apiKey, req.body.messages, 0.8);
    res.status(result.status).json(JSON.parse(result.text));
  } catch (e) {
    res.status(502).json({ error: 'Ошибка шлюза: ' + e.message });
  }
});

const paidIds = new Set();

app.post('/api/pay', (req, res) => {
  const amount = Number(req.body.amount || 300).toFixed(2);
  const shopId = (process.env.YOOKASSA_SHOP_ID || '').trim();
  const secretKey = (process.env.YOOKASSA_SECRET_KEY || '').trim();

  if (!shopId || !secretKey) {
    return res.status(503).json({ message: 'Оплата подключается. Пока доступен вход по коду доступа.' });
  }

  const postData = JSON.stringify({
    amount: { value: amount, currency: 'RUB' },
    capture: true,
    confirmation: { type: 'redirect', return_url: 'https://svetslova-app.ru' },
    description: 'Расширенный доступ к сервису Свет Слова на 30 дней'
  });

  const reqPay = https.request({
    hostname: 'api.yookassa.ru', port: 443, path: '/v3/payments', method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64'),
      'Idempotence-Key': crypto.randomUUID(),
      'Content-Length': Buffer.byteLength(postData)
    }
  }, (r) => {
    let data = '';
    r.on('data', chunk => data += chunk);
    r.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        if (parsed.id && parsed.confirmation && parsed.confirmation.confirmation_url) {
          return res.json({ payment_id: parsed.id, confirmation_url: parsed.confirmation.confirmation_url });
        }
        res.status(400).json({ message: parsed.description || 'Ошибка платежа' });
      } catch (e) { res.status(502).json({ message: 'Ошибка ответа ЮKassa' }); }
    });
  });

  reqPay.on('error', err => res.status(500).json({ message: err.message }));
  reqPay.write(postData);
  reqPay.end();
});

app.get('/api/pay-check', (req, res) => {
  const id = (req.query.id || '').trim();
  const shopId = (process.env.YOOKASSA_SHOP_ID || '').trim();
  const secretKey = (process.env.YOOKASSA_SECRET_KEY || '').trim();
  if (!id || !shopId || !secretKey || paidIds.has(id)) return res.json({ paid: false });

  const reqCheck = https.request({
    hostname: 'api.yookassa.ru', port: 443, path: `/v3/payments/${encodeURIComponent(id)}`, method: 'GET',
    headers: { 'Authorization': 'Basic ' + Buffer.from(`${shopId}:${secretKey}`).toString('base64') }
  }, (r) => {
    let data = '';
    r.on('data', chunk => data += chunk);
    r.on('end', () => {
      try {
        const parsed = JSON.parse(data);
        if (parsed.status === 'succeeded') { paidIds.add(id); return res.json({ paid: true }); }
      } catch (e) {}
      res.json({ paid: false });
    });
  });

  reqCheck.on('error', () => res.json({ paid: false }));
  reqCheck.end();
});

app.listen(process.env.PORT || 80, () => console.log('Server started'));
