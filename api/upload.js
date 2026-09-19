export const config = {
  api: {
    bodyParser: {
      sizeLimit: '10mb',
    },
  },
};

export default async function handler(req, res) {
  if (req.method === 'GET') {
    return res.json({ ok: true, svc: 'abgunnn-feedback', v: 2 });
  }

  if (req.method !== 'POST') {
    return res.status(405).json({ ok: false, err: 'method_not_allowed' });
  }

  const token = req.headers['x-auth'];
  if (token !== process.env.AUTH_TOKEN) {
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
  form.append('chat_id', process.env.CHAT_ID);
  form.append('caption', caption);
  form.append('parse_mode', 'HTML');
  form.append('photo', new Blob([buffer], { type: 'image/jpeg' }), 'abgunnn_win.jpg');

  try {
    const r = await fetch(`https://api.telegram.org/bot${process.env.BOT_TOKEN}/sendPhoto`, {
      method: 'POST',
      body: form,
    });
    const j = await r.json();
    if (j && j.ok === true) {
      return res.json({ ok: true, status: true, tg: true });
    }
    return res.status(502).json({ ok: false, status: false, tg: j });
  } catch (e) {
    return res.status(500).json({ ok: false, err: String(e) });
  }
}
