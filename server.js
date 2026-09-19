const express  = require('express');
const multer   = require('multer');
const fetch    = require('node-fetch');
const FormData = require('form-data');

const app = express();

app.use(express.urlencoded({ extended: true, limit: '15mb' }));
app.use(express.json({ limit: '15mb' }));

const BOT_TOKEN  = process.env.BOT_TOKEN;
const CHAT_ID    = process.env.CHAT_ID;
const AUTH_TOKEN = process.env.AUTH_TOKEN;

if (!BOT_TOKEN || !CHAT_ID || !AUTH_TOKEN) {
    console.error('Missing env: BOT_TOKEN / CHAT_ID / AUTH_TOKEN');
    process.exit(1);
}

app.get('/', (_req, res) => res.json({ ok: true, svc: 'abgunnn-feedback', v: 2 }));

app.post('/api/upload', async (req, res) => {
    const token = req.headers['x-auth'] || req.query.auth;
    if (token !== AUTH_TOKEN) {
        return res.status(401).json({ ok: false, err: 'bad_auth' });
    }

    const b64 = req.body && req.body.base64_image;
    const caption = (req.body && req.body.caption) || 'ABGunnn feedback';

    if (!b64 || b64.length < 100) {
        return res.status(400).json({ ok: false, err: 'no_image' });
    }

    let buffer;
    try {
        buffer = Buffer.from(b64, 'base64');
    } catch (e) {
        return res.status(400).json({ ok: false, err: 'bad_base64' });
    }
    if (buffer.length < 2048) {
        return res.status(400).json({ ok: false, err: 'image_too_small' });
    }

    const form = new FormData();
    form.append('chat_id', CHAT_ID);
    form.append('caption', caption);
    form.append('parse_mode', 'HTML');
    form.append('photo', buffer, {
        filename: 'abgunnn_win.jpg',
        contentType: 'image/jpeg',
    });

    try {
        const r = await fetch(`https://api.telegram.org/bot${BOT_TOKEN}/sendPhoto`, {
            method: 'POST',
            body: form,
            headers: form.getHeaders(),
        });
        const j = await r.json();

        if (j && j.ok === true) {
            return res.json({ ok: true, status: true, tg: true });
        }
        return res.status(502).json({ ok: false, status: false, tg: j });
    } catch (e) {
        return res.status(500).json({ ok: false, err: String(e) });
    }
});

const port = process.env.PORT || 3000;
app.listen(port, () => console.log('ABGunnn feedback listening on', port));
