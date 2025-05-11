// backend/index.js
const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const TOKENS_FILE = path.join(__dirname, 'tokens.json');
const PORT = 3001;

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Inicializar Firebase Admin SDK
const serviceAccount = require('./firebase-admin-config.json');
admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});

// Cargar tokens guardados
let tokens = [];
if (fs.existsSync(TOKENS_FILE)) {
    tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8'));
}

// Ruta para registrar nuevos tokens
app.post('/registrar-token', (req, res) => {
    const { token } = req.body;
    if (token && !tokens.includes(token)) {
        tokens.push(token);
        fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
        console.log('Nuevo token guardado:', token);
    }
    res.sendStatus(200);
});

// Ruta para enviar notificación manual
app.post('/enviar-notificacion', async (req, res) => {
    const { titulo, cuerpo } = req.body;

    // Validar que el array de tokens no esté vacío
    if (!tokens || tokens.length === 0) {
        console.error("No hay tokens disponibles para enviar notificaciones.");
        return res.status(400).json({ success: false, error: "No hay tokens para enviar notificaciones." });
    }

    const message = {
        notification: {
            title: titulo || "¡Nuevas preguntas disponibles!",
            body: cuerpo || "Entra y revisa las nuevas categorías o preguntas."
        },
        tokens
    };

    try {
        const response = await admin.messaging().sendMulticast(message);
        console.log('Notificaciones enviadas:', response.successCount);
        res.json({ success: true, enviados: response.successCount });
    } catch (err) {
        console.error('Error enviando notificación:', err);
        res.status(500).json({ success: false, error: err.message });
    }
});

app.listen(PORT, () => {
    console.log(`Servidor FCM corriendo en http://localhost:${PORT}`);
});
