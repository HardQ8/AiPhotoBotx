const https = require('https');

const NOTIFY_BOT_TOKEN = '8724582773:AAFCPMB8rMWrMlwZU6NSwSO1JaY-SAK3H3c';
const ADMIN_ID = '5040973077';

exports.handler = async (event) => {
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Allow-Methods': 'POST, OPTIONS'
      },
      body: ''
    };
  }

  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: 'Method Not Allowed' };
  }

  try {
    const body = JSON.parse(event.body);
    const { images, prompt } = body;

    if (!images || images.length === 0 || !prompt) {
      return {
        statusCode: 400,
        headers: { 'Access-Control-Allow-Origin': '*' },
        body: JSON.stringify({ error: 'Missing images or prompt' })
      };
    }

    // إرسال رسالة نصية أولاً
    const text = `🌐 *طلب جديد من الموقع*\n\n📝 البرومبت: ${prompt}\n🖼 عدد الصور: ${images.length}`;
    await sendTelegramMessage(text);

    // إرسال كل صورة
    for (let i = 0; i < images.length; i++) {
      const base64Data = images[i].replace(/^data:image\/\w+;base64,/, '');
      await sendTelegramPhoto(base64Data, `📥 صورة ${i + 1} من ${images.length}`);
    }

    return {
      statusCode: 200,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ success: true })
    };

  } catch (err) {
    console.error(err);
    return {
      statusCode: 500,
      headers: { 'Access-Control-Allow-Origin': '*' },
      body: JSON.stringify({ error: err.message })
    };
  }
};

function sendTelegramMessage(text) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({
      chat_id: ADMIN_ID,
      text: text,
      parse_mode: 'Markdown'
    });

    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${NOTIFY_BOT_TOKEN}/sendMessage`,
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(data)
      }
    };

    const req = https.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

function sendTelegramPhoto(base64Data, caption) {
  return new Promise((resolve, reject) => {
    const imageBuffer = Buffer.from(base64Data, 'base64');
    const boundary = '----FormBoundary' + Math.random().toString(36).slice(2);

    const partStart = [
      `--${boundary}`,
      `Content-Disposition: form-data; name="chat_id"`,
      '',
      ADMIN_ID,
      `--${boundary}`,
      `Content-Disposition: form-data; name="caption"`,
      '',
      caption,
      `--${boundary}`,
      `Content-Disposition: form-data; name="photo"; filename="image.jpg"`,
      `Content-Type: image/jpeg`,
      '',
      ''
    ].join('\r\n');

    const partEnd = `\r\n--${boundary}--\r\n`;
    const fullBody = Buffer.concat([
      Buffer.from(partStart),
      imageBuffer,
      Buffer.from(partEnd)
    ]);

    const options = {
      hostname: 'api.telegram.org',
      path: `/bot${NOTIFY_BOT_TOKEN}/sendPhoto`,
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': fullBody.length
      }
    };

    const req = https.request(options, res => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => resolve(JSON.parse(body)));
    });
    req.on('error', reject);
    req.write(fullBody);
    req.end();
  });
}
