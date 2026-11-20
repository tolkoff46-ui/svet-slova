const express = require('express');
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

app.post('/api/chat', async (req, res) => {
  try {
    const { baseUrl, apiKey, model, messages } = req.body;
    const cleanUrl = baseUrl.replace(/\/+$/, '');
    
    const response = await fetch(`${cleanUrl}/chat/completions`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify({ model, messages, temperature: 0.6 })
    });

    const rawText = await response.text();
    try {
      const data = JSON.parse(rawText);
      res.status(response.status).json(data);
    } catch (e) {
      res.status(502).json({ error: `Сервер вернул HTML вместо JSON (статус ${response.status}): ${rawText.slice(0, 150)}` });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 80;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
