const express = require('express');
const app = express();

const TG_BOT_TOKEN  = process.env.TG_BOT_TOKEN  || '';
const TG_CHAT_ID    = process.env.TG_CHAT_ID    || '';
const CLIENT_SECRET = process.env.CLIENT_SECRET || '';
const PORT = process.env.PORT || 3000;

app.use(express.urlencoded({ extended: false }));
app.use(express.json());

app.post('/', async (req, res) => {
    try {
        const auth = req.headers['x-abg-auth'] || '';
        if (auth !== CLIENT_SECRET) return res.status(403).send('forbidden');

        const text = req.body.text || '';
        if (!text) return res.status(400).send('no text');

        const url = 'https://api.telegram.org/bot' + TG_BOT_TOKEN + '/sendMessage';
        const form = new URLSearchParams();
        form.append('chat_id', TG_CHAT_ID);
        form.append('text', text);
        form.append('parse_mode', 'HTML');

        const tg = await fetch(url, { method: 'POST', body: form });
        if (!tg.ok) return res.status(502).send('tg err');

        res.send('ok');
    } catch (e) {
        res.status(500).send('err');
    }
});

app.get('/', (req, res) => res.send('ABG text server running'));

app.listen(PORT, () => console.log('Port ' + PORT));
