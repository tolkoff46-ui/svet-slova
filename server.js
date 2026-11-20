const express = require('express');
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

app.post('/api/chat', async (req, res) => {
  try {
    const rawKey = process.env.VSEGPT_KEY || '';
    const apiKey = rawKey.trim();

    if (!apiKey) {
      return res.status(500).json({ error: 'Ключ VSEGPT_KEY пустой. Проверьте вкладку «Переменные» в Amvera и нажмите «Перезапустить».' });
    }

    const { messages } = req.body;
    const response = await fetch('https://vsegpt.ru', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`,
        'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36'
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: messages,
        temperature: 0.6
      })
    });

    const rawText = await response.text();
    try {
      const data = JSON.parse(rawText);
      res.status(response.status).json(data);
    } catch (e) {
      res.status(502).json({ error: `Ответ сервера (${response.status}): ${rawText.slice(0, 180)}` });
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 80;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
