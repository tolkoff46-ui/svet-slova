const express = require('express');
const https = require('https');
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

app.post('/api/chat', (req, res) => {
  const apiKey = (process.env.VSEGPT_KEY || '').trim();
  if (!apiKey) {
    return res.status(500).json({ error: 'Ключ VSEGPT_KEY не найден в переменных Amvera' });
  }

  const postData = JSON.stringify({
    model: 'openai/gpt-4o-mini',
    messages: req.body.messages,
    temperature: 0.6
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

const PORT = process.env.PORT || 80;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
