const axios = require('axios');
const busboy = require('busboy');

exports.handler = async (event) => {
    // Vérification de la méthode
    if (event.httpMethod !== 'POST') {
        return { statusCode: 405, body: 'Method Not Allowed' };
    }

    return new Promise((resolve) => {
        const bb = busboy({ headers: event.headers });
        let fileBuffer = null;
        let fileName = '';
        let caption = '';

        bb.on('file', (name, file, info) => {
            fileName = info.filename;
            const chunks = [];
            file.on('data', (data) => chunks.push(data));
            file.on('end', () => { fileBuffer = Buffer.concat(chunks); });
        });

        bb.on('field', (name, val) => {
            if (name === 'caption') caption = val;
        });

        bb.on('finish', async () => {
            if (!fileBuffer) {
                return resolve({ statusCode: 400, body: 'No file uploaded' });
            }

            // Récupération sécurisée des clés depuis l'environnement
            const token = process.env.TELEGRAM_BOT_TOKEN;
            const chatId = process.env.TELEGRAM_CHAT_ID;

            const form = new FormData();
            form.append('chat_id', chatId);
            form.append('caption', caption);
            // Conversion du buffer pour axios
            form.append('document', new Blob([fileBuffer]), fileName);

            try {
                await axios.post(`https://api.telegram.org/bot${token}/sendDocument`, form, {
                    headers: { 'Content-Type': 'multipart/form-data' }
                });
                resolve({ statusCode: 200, body: 'Success' });
            } catch (error) {
                console.error(error);
                resolve({ statusCode: 500, body: 'Telegram API Error' });
            }
        });

        // Pipe the body into busboy
        bb.write(Buffer.from(event.body, event.isBase64Encoded ? 'base64' : 'utf8'));
        bb.end();
    });
};
