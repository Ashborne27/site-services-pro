exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    if (!event.body) {
      throw new Error('Le corps de la requête est vide.');
    }

    const isBase64 = event.isBase64Encoded;
    const bodyBuffer = isBase64 ? Buffer.from(event.body, 'base64') : Buffer.from(event.body, 'utf8');

    let name, email, message, fileBuffer, fileName;

    // Tentative de parsing JSON
    try {
      const data = JSON.parse(bodyBuffer.toString('utf8'));
      name = data.name;
      email = data.email;
      message = data.message;
      if (data.fileData) {
        const base64Content = data.fileData.includes(',') ? data.fileData.split(',')[1] : data.fileData;
        fileBuffer = Buffer.from(base64Content, 'base64');
        fileName = data.fileName || 'document.pdf';
      }
    } catch (e) {
      // Si ce n'est pas du JSON, on analyse le flux multipart/form-data natif
      const contentType = event.headers['content-type'] || event.headers['Content-Type'] || '';
      
      if (contentType.includes('multipart/form-data')) {
        const boundaryMatch = contentType.match(/boundary=([^;]+)/i);
        if (!boundaryMatch) {
          throw new Error('Multipart boundary introuvable.');
        }
        const boundary = boundaryMatch[1].replace(/^["']|["']$/g, '');
        const parts = splitBufferByBoundary(bodyBuffer, boundary);

        for (const part of parts) {
          const headerEndIndex = part.indexOf('\r\n\r\n');
          if (headerEndIndex === -1) continue;
          
          const headersStr = part.subarray(0, headerEndIndex).toString('utf8');
          const contentBuffer = part.subarray(headerEndIndex + 4, part.length - 2);

          const nameMatch = headersStr.match(/name="([^"]+)"/);
          if (!nameMatch) continue;
          const fieldName = nameMatch[1];

          if (fieldName === 'name') {
            name = contentBuffer.toString('utf8');
          } else if (fieldName === 'email') {
            email = contentBuffer.toString('utf8');
          } else if (fieldName === 'message') {
            message = contentBuffer.toString('utf8');
          } else if (fieldName === 'file' || fieldName === 'document' || fieldName === 'fileData') {
            fileBuffer = contentBuffer;
            const filenameMatch = headersStr.match(/filename="([^"]+)"/);
            fileName = filenameMatch ? filenameMatch[1] : 'document.pdf';
          }
        }
      } else {
        throw new Error("Format de requête non supporté.");
      }
    }

    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      throw new Error('Les variables d environnement Telegram ne sont pas configurées.');
    }

    const form = new FormData();
    form.append('chat_id', TELEGRAM_CHAT_ID);

    if (fileBuffer && fileBuffer.length > 0) {
      form.append('caption', `Nom: ${name}\nEmail: ${email}\nMessage: ${message}`);
      const blob = new Blob([fileBuffer], { type: 'application/pdf' });
      form.append('document', blob, fileName || 'document.pdf');

      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendDocument`, {
        method: 'POST',
        body: form
      });

      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.description || 'Erreur de l API Telegram lors de l envoi du document.');
      }
    } else {
      const text = `Nouveau message :\nNom: ${name}\nEmail: ${email}\nMessage: ${message}`;
      const response = await fetch(`https://api.telegram.org/bot${TELEGRAM_BOT_TOKEN}/sendMessage`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ chat_id: TELEGRAM_CHAT_ID, text: text })
      });

      const result = await response.json();
      if (!result.ok) {
        throw new Error(result.description || 'Erreur de l API Telegram lors de l envoi du message.');
      }
    }

    return {
      statusCode: 200,
      body: JSON.stringify({ success: true })
    };

  } catch (error) {
    console.error('Erreur execution fonction Telegram:', error);
    return {
      statusCode: 500,
      body: JSON.stringify({ error: error.message })
    };
  }
};

function splitBufferByBoundary(buffer, boundary) {
  const boundaryBuf = Buffer.from('--' + boundary);
  const parts = [];
  let start = 0;
  let index = buffer.indexOf(boundaryBuf, start);
  while (index !== -1) {
    if (start > 0) {
      parts.push(buffer.subarray(start, index));
    }
    start = index + boundaryBuf.length;
    if (buffer.subarray(start, start + 2).toString() === '--') {
      break;
    }
    if (buffer.subarray(start, start + 2).toString() === '\r\n') {
      start += 2;
    }
    index = buffer.indexOf(boundaryBuf, start);
  }
  return parts;
}