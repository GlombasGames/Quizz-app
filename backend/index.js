// backend/index.js
const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const TOKENS_FILE = path.join(__dirname, 'tokens.json');
const PORT = 3100;
const version = '1.3';

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

// Ruta para servir archivos JSON específicos
app.get('/api/categorias.json', (req, res) => {
  const triviaId = (req.query.triviaId || 'default').replace(/^\//, ''); // quita la barra inicial
  const filePath = path.join(__dirname, `../dist/${triviaId}/categorias.json`);

  res.sendFile(filePath, (err) => {
    if (err) {
      console.error('Error enviando categorias.json:', err);
      res.status(404).json({ error: 'Archivo no encontrado para esa trivia.' });
    }
  });
});

// Ruta para registrar nuevos tokens
app.post('/api/registrar-token', (req, res) => {
    const  token  = req.body;
    console.log('Token recibido:', token);
    // Validar que el token no esté vacío
    if (!token.token) {
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

app.get('/api/ping', (req, res) => {
    console.error('Ping recibido');
    res.status(200).send('pong');
});
app.get('/api/version', (req, res) => {
    console.error('Version consultada', version);
    res.status(200).json({ version });
});
// Ruta para enviar notificación manual
app.post('/api/enviar-notificacion', async (req, res) => {
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
        },
        android: {
            notification: {
                icon: "icon" // Nombre del archivo sin la extensión
            }
        }
    };

    let enviados = 0;
    let fallidos = 0;
    const tokensValidos = [];

    // Recorrer el array de tokens y enviar notificaciones
    for (const token of tokens) {
        console.log(`Enviando notificación al token: ${token.token},  dist/${token.triviaName}/${token.coin}`);
        if(token.triviaName && token.coin){

            messageBase.notification.body.replace('COIN', `dist/${token.triviaName}/${token.coin}` || 'noCoin'); // Reemplazar 'coin' si está presente
        }
        try {
            const response = await admin.messaging().send({ ...messageBase, token: token.token });
            console.log(`Notificación enviada al token: ${token}, respuesta: ${response}`);
            enviados++;
            tokensValidos.push(token); // Mantener el token si el envío fue exitoso
        } catch (err) {
            console.error(`Error enviando notificación al token: ${token}`, err);

            // Verificar si el error indica que el token no es válido
            if (
                err.code === 'messaging/invalid-registration-token' ||
                err.code === 'messaging/registration-token-not-registered'
            ) {
                console.log(`El token ${token} es inválido y será eliminado.`);
                fallidos++;
            } else {
                // Si el error no está relacionado con un token inválido, mantener el token
                tokensValidos.push(token);
                fallidos++;
            }
        }
    }
    // Guardar los tokens válidos en el archivo tokens.json
    try {
        fs.writeFileSync(TOKENS_FILE, JSON.stringify(tokensValidos, null, 2));
        console.log('Tokens válidos actualizados en tokens.json', tokensValidos.length);
    } catch (err) {
        console.error('Error al guardar los tokens válidos en el archivo:', err);
        return res.status(500).json({ success: false, error: 'Error al guardar los tokens válidos.' });
    }

    // Responder al cliente con el resultado
    res.json({
        success: true,
        enviados,
        fallidos
    });
});
// Ruta para servir index.html (para aplicaciones SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor FCM corriendo en http://0.0.0.0:${PORT}`);
});
