const express = require('express');
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

app.post('/api/chat', async (req, res) => {
  try {
    const apiKey = (process.env.VSEGPT_KEY || '').trim();
    if (!apiKey) {
      return res.status(500).json({ error: 'Ключ VSEGPT_KEY не найден в переменных Amvera' });
    }

    const { messages } = req.body;

    const response = await fetch('https://vsegpt.ru', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'openai/gpt-4o-mini',
        messages: messages,
        temperature: 0.6
      })
    });

    const data = await response.json();
    res.status(response.status).json(data);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 80;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
