const express = require('express');
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

async function callVseGPT(apiKey, modelName, messages) {
  const response = await fetch('https://vsegpt.ru', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${apiKey}`
    },
    body: JSON.stringify({
      model: modelName,
      messages: messages,
      temperature: 0.6
    })
  });

  const text = await response.text();
  return { ok: response.ok, status: response.status, text };
}

app.post('/api/chat', async (req, res) => {
  try {
    const apiKey = (process.env.VSEGPT_KEY || '').trim();
    if (!apiKey) {
      return res.status(500).json({ error: 'Ключ VSEGPT_KEY не найден в переменных Amvera' });
    }

    const { messages } = req.body;

    // Основная модель с безупречным русским языком
    let result = await callVseGPT(apiKey, 'openai/gpt-4o', messages);

    // Страховка: если основная модель недоступна, переключаемся на проверенную mini
    if (!result.ok || result.text.trim().startsWith('<')) {
      result = await callVseGPT(apiKey, 'openai/gpt-4o-mini', messages);
    }

    try {
      const data = JSON.parse(result.text);
      return res.status(result.status).json(data);
    } catch {
      return res.status(502).json({ error: 'Временный сбой шлюза VseGPT. Повторите запрос через 5 секунд.' });
    }
  } catch (error) {
    return res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 80;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
