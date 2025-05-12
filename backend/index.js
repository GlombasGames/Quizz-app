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
    try {
        tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8'));
        console.log('Tokens cargados:', tokens);
    } catch (err) {
        console.error('Error al leer el archivo tokens.json:', err);
    }
} else {
    // Crear el archivo si no existe
    fs.writeFileSync(TOKENS_FILE, JSON.stringify([], null, 2));
    console.log('Archivo tokens.json creado.');
}

// Middleware para servir archivos estáticos desde la carpeta dist
app.use(express.static(path.join(__dirname, '../dist')));

// Ruta para servir index.html (para aplicaciones SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});
// Ruta para servir archivos JSON específicos
app.get('/categorias.json', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/categorias.json'));
});

// Ruta para registrar nuevos tokens
app.post('/registrar-token', (req, res) => {
    const { token } = req.body;

    // Validar que el token no esté vacío
    if (!token) {
        console.error('Token no proporcionado.');
        return res.status(400).json({ success: false, error: 'Token no proporcionado.' });
    }

    // Verificar si el token ya está guardado
    if (!tokens.includes(token)) {
        tokens.push(token);

        // Guardar el token en el archivo tokens.json
        try {
            fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokens, null, 2));
            console.log('Nuevo token guardado:', token);
        } catch (err) {
            console.error('Error al guardar el token en el archivo:', err);
            return res.status(500).json({ success: false, error: 'Error al guardar el token.' });
        }
    } else {
        console.log('El token ya está registrado.');
    }

    res.status(200).json({ success: true, message: 'Token registrado correctamente.' });
});

// Ruta para enviar notificación manual
app.post('/enviar-notificacion', async (req, res) => {
    const { titulo, cuerpo } = req.body;

    // Leer los tokens actualizados desde el archivo tokens.json
    let tokens = [];
    if (fs.existsSync(TOKENS_FILE)) {
        try {
            tokens = JSON.parse(fs.readFileSync(TOKENS_FILE, 'utf-8'));
        } catch (err) {
            console.error('Error al leer el archivo tokens.json:', err);
            return res.status(500).json({ success: false, error: 'Error al leer los tokens.' });
        }
    }

    // Validar que el array de tokens no esté vacío
    if (!tokens || tokens.length === 0) {
        console.error("No hay tokens disponibles para enviar notificaciones.");
        return res.status(400).json({ success: false, error: "No hay tokens para enviar notificaciones." });
    }

    // Crear el mensaje base de la notificación
    const messageBase = {
        notification: {
            title: titulo || "¡Nuevas preguntas disponibles!",
            body: cuerpo || "Entra y revisa las nuevas categorías o preguntas."
        }
    };

    let enviados = 0;
    let fallidos = 0;

    // Recorrer el array de tokens y enviar notificaciones
    for (const token of tokens) {
        try {
            const response = await admin.messaging().send({ ...messageBase, token });
            console.log(`Notificación enviada al token: ${token}, respuesta: ${response}`);
            enviados++;
        } catch (err) {
            console.error(`Error enviando notificación al token: ${token}`, err);
            fallidos++;
        }
    }

    // Responder al cliente con el resultado
    res.json({
        success: true,
        enviados,
        fallidos
    });
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor FCM corriendo en http://0.0.0.0:${PORT}`);
});
