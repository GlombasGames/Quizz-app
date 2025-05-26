// backend/index.js
const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cors = require('cors');

const TOKENS_FILE = path.join(__dirname, 'tokens.json');
const PORT = 3100;
const version = '1.3';

const app = express();
app.use(cors());
app.use(bodyParser.json());

// Inicializar Firebase Admin con tu archivo de configuración
const serviceAccount = require('./firebase-admin-config.json');
if (!admin.apps.length) {
    admin.initializeApp({
        credential: admin.credential.cert(serviceAccount)
    });
}

// Variable para almacenar el token de acceso
let accessToken = null;
let tokenExpirationTime = null;

// Función para obtener o reutilizar el token de acceso
async function getAccessToken() {
    const now = Date.now();
    if (!accessToken || now >= tokenExpirationTime) {
        console.log('Generando un nuevo token de acceso...');
        const token = await admin.credential.cert(serviceAccount).getAccessToken();
        accessToken = token.access_token;
        tokenExpirationTime = now + 3600 * 1000; // El token es válido por 1 hora
    }
    return accessToken;
}

// Función para enviar notificaciones
async function enviarNotificacion(tokens, titulo, cuerpo, imageUrl) {
    try {
        // Obtener el token de acceso (reutilizar si es válido)
        const token = await getAccessToken();

        for (const tokenDevice of tokens) {
            const payload = {
                message: {
                    notification: {
                        title: titulo || "¡Nuevas preguntas disponibles!",
                        body: cuerpo || "Entra y revisa las nuevas categorías o preguntas.",
                        image: imageUrl, // URL de la imagen
                    },
                    android: {
                        notification: {
                            icon: "icon" // Nombre del archivo sin la extensión
                        }
                    },
                    token: tokenDevice // Token del dispositivo
                }
            };

            // Enviar la notificación usando la API HTTP v1
            const response = await axios.post(
                `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
                payload,
                {
                    headers: {
                        'Authorization': `Bearer ${token}`,
                        'Content-Type': 'application/json'
                    }
                }
            );

            console.log(`Notificación enviada al token: ${tokenDevice}, respuesta:`, response.data);
        }
    } catch (err) {
        console.error('Error enviando notificación:', err.response ? err.response.data : err.message);
    }
}


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
    const token = req.body;
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

app.get('/api/:triviaName/:nombre', (req, res) => {
    const nombre = req.params.nombre;
    const triviaName = req.params.triviaName;
    const filePath = path.join(__dirname, `../dist/${triviaName}/assets/${nombre}`);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error al enviar la imagen:', err);
            res.status(404).send('Imagen no encontrada');
        }
    });
});

// Ruta para enviar notificación manual
app.post('/api/enviar-notificacion', async (req, res) => {
    let { titulo, cuerpo } = req.body;

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

    let enviados = 0;
    let fallidos = 0;
    const tokensValidos = [];

    try {
        // Obtener el token de acceso (reutilizar si es válido)
        const token = await getAccessToken();

        // Recorrer el array de tokens y enviar notificaciones
        for (const tokenDevice of tokens) {
            cuerpo = cuerpo.replace('COIN', tokenDevice.coin.split('.')[0]+'s');
            titulo = titulo.replace('COIN', tokenDevice.coin.split('.')[0]+'s');

            const payload = {
                message: {
                    notification: {
                        title: titulo || "¡Nuevas preguntas disponibles!",
                        body: cuerpo || "Entra y revisa las nuevas categorías o preguntas.",
                        image: `https://glombagames.ddns.net/api/${tokenDevice.triviaId}/${tokenDevice.coin}`//imageUrl, // URL de la imagen
                    },
                    android: {
                        notification: {
                            icon: "icon" // Nombre del archivo sin la extensión
                        }
                    },
                    token: tokenDevice.token // Token del dispositivo
                }
            };

            try {
                const response = await axios.post(
                    `https://fcm.googleapis.com/v1/projects/${serviceAccount.project_id}/messages:send`,
                    payload,
                    {
                        headers: {
                            'Authorization': `Bearer ${token}`,
                            'Content-Type': 'application/json'
                        }
                    }
                );

                console.log(`Notificación enviada al token: ${tokenDevice.token}, respuesta:`, response.data);
                enviados++;
                tokensValidos.push(tokenDevice); // Mantener el token si el envío fue exitoso
            } catch (err) {
                console.error(`Error enviando notificación al token: ${tokenDevice.token}`, err.response ? err.response.data : err.message);

                // Verificar si el error indica que el token no es válido
                if (
                    err.response &&
                    (err.response.data.error.code === 404 || err.response.data.error.message.includes('registration-token-not-registered'))
                ) {
                    console.log(`El token ${tokenDevice.token} es inválido y será eliminado.`);
                    fallidos++;
                } else {
                    // Si el error no está relacionado con un token inválido, mantener el token
                    tokensValidos.push(tokenDevice);
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
    } catch (err) {
        console.error('Error general al enviar notificaciones:', err);
        res.status(500).json({ success: false, error: 'Error general al enviar notificaciones.' });
    }
});
// Ruta para servir index.html (para aplicaciones SPA)
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '../dist/index.html'));
});

app.listen(PORT, '0.0.0.0', () => {
    console.log(`Servidor FCM corriendo en http://0.0.0.0:${PORT}`);
});
