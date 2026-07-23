exports.handler = async (event) => {
  if (event.httpMethod !== 'POST') {
    return { statusCode: 405, body: JSON.stringify({ error: 'Method Not Allowed' }) };
  }

  try {
    if (!event.body) {
      throw new Error('Le corps de la requête est vide.');
    }

    // Décodage automatique si Netlify a encodé le corps en Base64
    let rawBody = event.body;
    if (event.isBase64Encoded) {
      rawBody = Buffer.from(event.body, 'base64').toString('utf8');
    }

    // Sécurisation du parsing JSON
    let data;
    try {
      data = JSON.parse(rawBody);
    } catch (parseError) {
      throw new Error("Le format des données reçues n'est pas un JSON valide.");
    }

    const { name, email, message, fileData, fileName } = data;
    
    const TELEGRAM_BOT_TOKEN = process.env.TELEGRAM_BOT_TOKEN;
    const TELEGRAM_CHAT_ID = process.env.TELEGRAM_CHAT_ID;

    if (!TELEGRAM_BOT_TOKEN || !TELEGRAM_CHAT_ID) {
      throw new Error('Les variables d environnement Telegram ne sont pas configurées.');
    }

    if (fileData) {
      // Extraction sécurisée du contenu base64 du fichier
      const base64Content = fileData.includes(',') ? fileData.split(',')[1] : fileData;
      const buffer = Buffer.from(base64Content, 'base64');
      
      const form = new FormData();
      form.append('chat_id', TELEGRAM_CHAT_ID);
      form.append('caption', `Nom: ${name}\nEmail: ${email}\nMessage: ${message}`);
      
      const blob = new Blob([buffer], { type: 'application/pdf' });
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
      // Envoi de texte classique
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
