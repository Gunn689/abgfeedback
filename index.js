const express = require('express');
const app = express();

const TG_BOT_TOKEN  = process.env.TG_BOT_TOKEN  || '';
const TG_CHAT_ID    = process.env.TG_CHAT_ID    || '';
const CLIENT_SECRET = process.env.CLIENT_SECRET || '';
const PORT = process.env.PORT || 3000;

const rl = new Map();

app.use(express.urlencoded({ limit: '50mb', extended: false }));
app.use(express.json({ limit: '50mb' }));

app.post('/', async (req, res) => {
    try {
        const auth = req.headers['x-abg-auth'] || '';
        if (!safeEqual(auth, CLIENT_SECRET)) {
            return res.status(403).send('forbidden');
        }

        const uid = req.headers['x-abg-uid'] || 'unknown';
        const now = Date.now();
        const last = rl.get(uid) || 0;
        if (now - last < 90_000) {
            return res.status(429).send('rate limited');
        }
        rl.set(uid, now);

        const b64 = req.body.base64_image || '';
        const caption = req.body.caption || '';
        if (!b64) return res.status(400).send('no image');

        const buf = Buffer.from(b64, 'base64');
        if (buf.length === 0) return res.status(400).send('bad base64');

        const form = new FormData();
        form.append('chat_id', TG_CHAT_ID);
        form.append('caption', caption);
        form.append('parse_mode', 'HTML');
        form.append('photo', new Blob([buf], { type: 'image/jpeg' }), 'feedback.jpg');

        const tgUrl = 'https://api.telegram.org/bot' + TG_BOT_TOKEN + '/sendPhoto';
        const tg = await fetch(tgUrl, { method: 'POST', body: form });

        if (!tg.ok) {
            const err = await tg.text();
            console.error('TG error:', err.slice(0, 200));
            return res.status(502).send('tg err: ' + err.slice(0, 120));
        }

        res.send('ok');
    } catch (e) {
        console.error('Error:', e);
        res.status(500).send('err: ' + String(e).slice(0, 120));
    }
});

app.get('/', (req, res) => res.send('auto-feedback backend running'));

function safeEqual(a, b) {
    if (typeof a !== 'string' || typeof b !== 'string') return false;
    if (a.length !== b.length) return false;
    let diff = 0;
    for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
    return diff === 0;
}

app.listen(PORT, () => console.log('Listening on port ' + PORT));
