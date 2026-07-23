// Constantes métier
const RATES = {
    correction: 0.06,    // 6€ pour 100 mots
    tutoring: 70.00,     // 70€ pour 1 heure
    traduction: 0.20,    // 20€ pour 100 mots
    transcription: 25.00 // 25€ par minute
};

// UI Interactions
function toggleGuide() {
    const modal = document.getElementById('guide-modal');
    modal.classList.toggle('hidden');
}

function downloadGuide() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.setFontSize(20);
    doc.text("Guide des Services", 20, 20);
    doc.setFontSize(12);
    doc.text("Nous couvrons toutes les spécialisations.", 20, 30);
    doc.text("- Correction/relecture: 6 EUR / 100 mots", 20, 40);
    doc.text("- Tutoring French: 70 EUR / heure", 20, 50);
    doc.text("- Traduction: 20 EUR / 100 mots", 20, 60);
    doc.text("- Transcription: 25 EUR / minute", 20, 70);
    doc.save("Guide_Services.pdf");
}

// Gestion des inputs
['correction', 'tutoring', 'traduction', 'transcription'].forEach(srv => {
    document.getElementById(`srv-${srv}`).addEventListener('change', function() {
        const input = document.getElementById(`qty-${srv}`);
        input.classList.toggle('hidden', !this.checked);
        if(!this.checked) input.value = '';
        calculateQuote();
    });
});

function calculateQuote() {
    let total = 0;
    if(document.getElementById('srv-correction').checked) total += (Number(document.getElementById('qty-correction').value) || 0) * RATES.correction;
    if(document.getElementById('srv-tutoring').checked) total += (Number(document.getElementById('qty-tutoring').value) || 0) * RATES.tutoring;
    if(document.getElementById('srv-traduction').checked) total += (Number(document.getElementById('qty-traduction').value) || 0) * RATES.traduction;
    if(document.getElementById('srv-transcription').checked) total += (Number(document.getElementById('qty-transcription').value) || 0) * RATES.transcription;
    
    document.getElementById('total-price').innerText = total.toFixed(2);
    return total.toFixed(2);
}

function generateOrderText() {
    let text = "Bonjour, je souhaite passer une commande.\n\nServices requis :\n";
    if(document.getElementById('srv-correction').checked) text += `- Correction : ${document.getElementById('qty-correction').value} mots\n`;
    if(document.getElementById('srv-tutoring').checked) text += `- Tutoring : ${document.getElementById('qty-tutoring').value} heures\n`;
    if(document.getElementById('srv-traduction').checked) text += `- Traduction : ${document.getElementById('qty-traduction').value} mots\n`;
    if(document.getElementById('srv-transcription').checked) text += `- Transcription : ${document.getElementById('qty-transcription').value} minutes\n`;
    
    const desc = document.getElementById('order-desc').value;
    if(desc) text += `\nDescription :\n${desc}\n`;
    
    text += `\nDevis estimé : ${calculateQuote()} €\n`;
    return text;
}

function downloadQuote() {
    const { jsPDF } = window.jspdf;
    const doc = new jsPDF();
    doc.text("Votre Devis Estimatif", 20, 20);
    const lines = doc.splitTextToSize(generateOrderText(), 170);
    doc.text(lines, 20, 35);
    doc.save("Devis_Commande.pdf");
}

async function submitOrder(channel) {
    const text = generateOrderText();
    const encodedText = encodeURIComponent(text);
    const fileInput = document.getElementById('order-file');
    const statusMsg = document.getElementById('status-msg');

    if (channel === 'whatsapp') {
        // Redirection WhatsApp API. Fichier à joindre manuellement par sécurité du navigateur.
        alert("En raison des politiques des navigateurs, veuillez joindre manuellement votre PDF une fois WhatsApp ouvert.");
        window.open(`https://wa.me/22896284137?text=${encodedText}`, '_blank');
    } 
    else if (channel === 'email') {
        alert("Veuillez joindre votre PDF à l'e-mail qui va s'ouvrir.");
        window.location.href = `mailto:business03112004@gmail.com?subject=Nouvelle Commande&body=${encodedText}`;
    } 
    else if (channel === 'telegram') {
        if (fileInput.files.length === 0) {
            alert("Veuillez d'abord joindre votre PDF pour l'envoi Telegram.");
            return;
        }

        statusMsg.innerText = "Envoi sécurisé en cours vers Telegram...";
        statusMsg.className = "text-sm mt-4 text-center font-bold text-blue-600";

        const formData = new FormData();
        formData.append('document', fileInput.files[0]);
        formData.append('caption', text);

        try {
            const response = await fetch('/.netlify/functions/sendTelegram', {
                method: 'POST',
                body: formData
            });

            if(response.ok) {
                statusMsg.innerText = "Commande et fichier envoyés avec succès à l'équipe !";
                statusMsg.className = "text-sm mt-4 text-center font-bold text-green-600";
            } else {
                throw new Error("Erreur serveur");
            }
        } catch (error) {
            statusMsg.innerText = "Erreur lors de l'envoi. Veuillez utiliser Email ou WhatsApp.";
            statusMsg.className = "text-sm mt-4 text-center font-bold text-red-600";
        }
    }
}

// PWA Install prompt
let deferredPrompt;
window.addEventListener('beforeinstallprompt', (e) => {
    e.preventDefault();
    deferredPrompt = e;
    document.getElementById('pwa-install-banner').classList.remove('hidden');
});

document.getElementById('install-btn').addEventListener('click', async () => {
    if (deferredPrompt) {
        deferredPrompt.prompt();
        const { outcome } = await deferredPrompt.userChoice;
        if (outcome === 'accepted') {
            document.getElementById('pwa-install-banner').classList.add('hidden');
        }
        deferredPrompt = null;
    }
});
