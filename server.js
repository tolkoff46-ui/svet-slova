const express = require('express');
const https = require('https');
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

function sendToVseGPT(apiKey, modelName, messages) {
  return new Promise((resolve, reject) => {
    const postData = JSON.stringify({
      model: modelName,
      messages: messages,
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
        resolve({ status: response.statusCode, body: rawData });
      });
    });

    request.on('error', (err) => reject(err));
    request.write(postData);
    request.end();
  });
}

app.post('/api/chat', async (req, res) => {
  try {
    const apiKey = (process.env.VSEGPT_KEY || '').trim();
    if (!apiKey) {
      return res.status(500).json({ error: 'Ключ VSEGPT_KEY не найден в переменных Amvera' });
    }

    const { messages } = req.body;
    let result = await sendToVseGPT(apiKey, 'anthropic/claude-3-5-sonnet', messages);

    if (result.status !== 200 || result.body.trim().startsWith('<')) {
      result = await sendToVseGPT(apiKey, 'openai/gpt-4o-mini', messages);
    }

    try {
      const parsed = JSON.parse(result.body);
      res.status(result.status).json(parsed);
    } catch (e) {
      res.status(502).json({ error: 'Временный сбой шлюза. Повторите запрос через пару секунд.' });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
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
