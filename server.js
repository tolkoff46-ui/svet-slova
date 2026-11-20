const express = require('express');
const app = express();

app.use(express.json());
app.use(express.static(__dirname));

app.get('/api/key', (req, res) => {
  const apiKey = (process.env.VSEGPT_KEY || '').trim();
  res.json({ key: apiKey });
});

const PORT = process.env.PORT || 80;
app.listen(PORT, () => console.log('Server running on port ' + PORT));
