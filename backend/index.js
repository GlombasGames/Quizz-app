// backend/index.js
const express = require('express');
const bodyParser = require('body-parser');
const admin = require('firebase-admin');
const axios = require('axios');
const fs = require('fs');
const path = require('path');
const cors = require('cors');
const connectDB = require("./db");
const serviceAccount = require('./firebase-admin-config.json');

const TOKENS_FILE = path.join(__dirname, 'tokens.json');
const PORT = 3100;
const version = '1.3';

const app = express();
app.use(cors());
app.use(bodyParser.json());

let users
let db
async function connectarDB() {
    db = await connectDB();
    users = db.collection("usuarios");
    console.log("Conectado a MongoDB ✅");
    // Esto lo ejecutás solo una vez al inicio del servidor
    users.createIndex({ nombre: 1 }, { unique: true })
        .then(() => console.log("✅ Índice único en 'nombre' creado"))
        .catch((e) => console.error("❌ Error al crear índice:", e));
    // Crear índice para puntajeTotal
    users.createIndex({ puntajeTotal: -1 })
        .then(() => console.log("✅ Índice en 'puntajeTotal' creado"))
        .catch((e) => console.error("❌ Error al crear índice puntajeTotal:", e));
}
connectarDB()

// Inicializar Firebase Admin con tu archivo de configuración

admin.initializeApp({
    credential: admin.credential.cert(serviceAccount)
});


// Variable para almacenar el token de acceso
let accessToken = null;
let tokenExpirationTime = null;

// Función para obtener o reutilizar el token de acceso
async function getAccessToken() {
    const now = Date.now();
    if (!accessToken || now >= tokenExpirationTime) {
        console.log('Generando un nuevo token de acceso...');
        try {
            const token = await admin.credential.cert(serviceAccount).getAccessToken();
            accessToken = token.access_token;
            tokenExpirationTime = now + 3600 * 1000; // El token es válido por 1 hora
        } catch (err) {
            console.error('Error al generar el token de acceso:', err);
            throw new Error('No se pudo generar el token de acceso. Verifica las credenciales y la configuración del servidor.');
        }
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
        // console.log('Tokens cargados:', tokens);
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


//nuevas apis
app.post("/api/getUser", async (req, res) => {

    const { nombre, password } = req.body;
    if (!nombre) {
        return res.status(400).json({ error: "Nombre no llega a getUser" });
    }

    let usuario = await users.findOne({ nombre });

    if (!password && usuario) {
        return res.status(400).json({ ok: true });
    }

    // Buscar si ya existe
    if (!usuario) {
        console.warn("Usuario no existe:", nombre);
        return res.status(404).json({ error: "Usuario no existe" });
    }

    if (usuario.password !== password) {
        console.warn("Contraseña incorrecta para el usuario:", nombre);
        return res.status(401).json({ error: "Contraseña incorrecta" });
    }
    delete usuario.password; // No enviar la contraseña al cliente
    res.json(usuario);
});

app.post("/api/createUser", async (req, res) => {

    const { nombre, password } = req.body;

    if (!nombre || !password) {
        return res.status(400).json({ error: "Nombre o contraseña no llegan" });
    }

    // Buscar si ya existe
    let usuario = await users.findOne({ nombre });

    if (!usuario) {
        // Crear estructura base
        const nuevoUsuario = {
            nombre,
            password, // Guardar la contraseña (en producción deberías encriptarla)
            monedas: {},
            boosts: {
                eliminar_opcion: 0,
                mas_tiempo: 0,
                respuesta_correcta: 0
            },
            puntos: {},
            desbloqueadas: [],  // Primeras categorías que se desbloquean
            logros: [],
            misiones: {
                escarabajosConsumidos: 32,
                lupasConsumidos: 13,
                ticketsConsumidos: 57,
                monedasConsumidos: 5,
                boostConsumidos: 15,
                categoriasDesbloqueadas: 2,
                pvpJugados: 3
            },
            reclamadas: [],
            fechaReinicio: "",
            creado: new Date(),
            actualizado: new Date(),
            version: "1.0"
        };

        const result = await users.insertOne(nuevoUsuario);
        usuario = { ...nuevoUsuario, _id: result.insertedId };
    }
    delete usuario.password; // No enviar la contraseña al cliente
    res.json(usuario);
});

app.post("/api/syncUserDelta", async (req, res) => {


    const { nombre, delta } = req.body;

    if (!nombre || !delta || typeof delta !== "object") {
        return res.status(400).json({ error: "Faltan datos o delta inválido" });
    }

    // 1. Construir setUpdates con todo el delta
    const setUpdates = { ...delta };
    setUpdates.actualizado = new Date();

    // 2. Si hay cambios en puntos, recalcular puntajeTotal
    const hayCambiosDePuntos = Object.keys(delta).some(k => k.startsWith("puntos."));
    if (hayCambiosDePuntos) {
        const usuario = await users.findOne({ nombre });
        if (!usuario) {
            return res.status(404).json({ error: "Usuario no encontrado" });
        }

        // Reconstruir puntos completos
        const puntosActualizados = { ...usuario.puntos };
        for (const clave in delta) {
            if (clave.startsWith("puntos.")) {
                const categoria = clave.split(".")[1];
                puntosActualizados[categoria] = delta[clave];
            }
        }

        const total = Object.values(puntosActualizados).reduce((a, b) => a + b, 0);
        setUpdates.puntajeTotal = total;
    }

    // 3. Aplicar todos los updates juntos
    const result = await users.updateOne(
        { nombre },
        { $set: setUpdates }
    );

    if (result.matchedCount === 0) {
        return res.status(404).json({ error: "Usuario no encontrado" });
    }

    // 🔁 4. Revisar si hay retorno pendiente
    const usuarioActualizado = await users.findOne({ nombre });
    const retornoDelta = usuarioActualizado?.retorno || null;

    // Si existe, lo devolvemos y lo eliminamos para que no se repita
    if (retornoDelta) {
        await users.updateOne({ nombre }, { $unset: { retorno: "" } });
    }

    res.json({
        ok: true,
        actualizado: true,
        ...(retornoDelta ? { retornoDelta } : {})
    });
});

app.post("/api/entregarPremios", async (req, res) => {
    const tipo = req.body.tipo === "actividad" ? "actividadTotal" : "puntajeTotal";
    const limit = 100;

    try {
        // 1. Obtener el ranking
        const response = await fetch(`http://localhost:3000/api/ranking?limit=${limit}&tipo=${tipo}`);
        const data = await response.json();
        const ranking = data.ranking;

        if (!ranking || ranking.length === 0) {
            return res.status(400).json({ error: "Ranking vacío o inválido." });
        }

        // 2. Preparar premios
        const premiosTop10 = {
            msg: `¡Felicidades! Top 10 del ranking semanal de ${tipo}.`,
            items: {
                "cofre especial": 1,
                "eliminar_pregunta": 2,
                "moneda_selva": 2
            }
        };

        const premiosTop100 = {
            msg: `¡Buen trabajo! Estás en el Top 100 del ranking semanal de ${tipo}.`,
            items: {
                "cofre comun": 1,
                "moneda_selva": 1
            }
        };

        // 3. Premiar jugadores
        let entregados = 0;
        for (let i = 0; i < ranking.length; i++) {
            const jugador = ranking[i];
            const premio = i < 10 ? premiosTop10 : premiosTop100;

            const usuario = await users.findOne({ nombre: jugador.nombre });
            if (!usuario) continue;

            const retornoActual = Array.isArray(usuario.retorno) ? usuario.retorno : [];

            await users.updateOne(
                { nombre: jugador.nombre },
                { $set: { retorno: [...retornoActual, premio] } }
            );

            entregados++;
        }

        res.json({ ok: true, entregados, tipo });

    } catch (error) {
        console.error("❌ Error al entregar premios:", error);
        res.status(500).json({ error: "Error interno al entregar premios" });
    }
});


app.get("/api/CrearUsuario", async (req, res) => {

    const nombre = req.query.nombre;
    if (!nombre) {
        return res.status(400).json({ error: "Falta el nombre en la query" });
    }

    // Paso 1: Buscar o crear usuario si no existe
    let usuario = await users.findOne({ nombre });

    if (!usuario) {
        usuario = {
            nombre,
            monedas: { selva: 0, ciencia: 0 },
            boosts: {
                eliminar_opcion: 1,
                mas_tiempo: 2,
                respuesta_correcta: 1
            },
            puntos: {},
            desbloqueadas: [],
            logros: [],
            misiones: {
                escarabajosConsumidos: 32,
                lupasConsumidos: 13,
                ticketsConsumidos: 57,
                monedasConsumidos: 5,
                boostConsumidos: 15,
                categoriasDesbloqueadas: 2,
                pvpJugados: 3
            },
            actividadTotal: 0,
            puntajeTotal: 0,
            creado: new Date(),
            actualizado: new Date(),
            version: "1.0"
        };
        const result = await users.insertOne(usuario);
        usuario._id = result.insertedId;
    }

    // Paso 2: Generar datos aleatorios para simular progreso
    const categorias = ["fauna", "arte", "historia", "cuerpo humano", "electricidad"];
    const triviaNames = ["selva", "ciencia"];

    const delta = {};

    // puntos
    categorias.forEach(cat => {
        const puntos = Math.floor(Math.random() * 200) + 20;
        delta[`puntos.${cat}`] = puntos;
    });

    // desbloqueadas (3 aleatorias)
    const desbloqueadas = categorias.sort(() => 0.5 - Math.random()).slice(0, 3);
    delta["desbloqueadas"] = Array.from(new Set([...usuario.desbloqueadas, ...desbloqueadas]));

    // monedas (aleatorias entre 0 y 5 por trivia)
    triviaNames.forEach(trivia => {
        const monedas = Math.floor(Math.random() * 6);
        delta[`monedas.${trivia}`] = monedas;
    });

    // Paso 3: Enviar delta usando la lógica existente
    const setUpdates = { ...delta, actualizado: new Date() };

    // Si modificamos puntos, actualizar también puntajeTotal
    const puntosActualizados = { ...usuario.puntos };
    for (const key in delta) {
        if (key.startsWith("puntos.")) {
            const categoria = key.split(".")[1];
            puntosActualizados[categoria] = delta[key];
        }
    }
    const total = Object.values(puntosActualizados).reduce((a, b) => a + b, 0);
    setUpdates.puntajeTotal = total;

    await users.updateOne({ nombre }, { $set: setUpdates });

    res.json({ ok: true, nombre, delta: setUpdates });
});

app.get("/api/ranking", async (req, res) => {
    let limit = parseInt(req.query.limit, 10);
    if (isNaN(limit) || limit <= 0 || limit > 1000) {
        limit = 10;
    }

    const nombreBuscado = req.query.nombre;
    const tipoRanking = req.query.tipo === "actividad" ? "actividadTotal" : "puntajeTotal";

    const ahora = Date.now();
    const DURACION_CACHE_MS = 2 * 60 * 1000;

    try {
        // Cacheamos por tipo de ranking
        if (!global.cachedRankings) global.cachedRankings = {};
        if (!global.lastRankingTimes) global.lastRankingTimes = {};

        const cache = global.cachedRankings[tipoRanking];
        const lastTime = global.lastRankingTimes[tipoRanking] || 0;

        if (!cache || ahora - lastTime > DURACION_CACHE_MS) {
            const top = await users
                .find({ [tipoRanking]: { $gt: 0 } })
                .project({ _id: 0, nombre: 1, [tipoRanking]: 1 })
                .sort({ [tipoRanking]: -1 })
                .limit(1000)
                .toArray();

            global.cachedRankings[tipoRanking] = top;
            global.lastRankingTimes[tipoRanking] = ahora;
        }

        const topUsuarios = global.cachedRankings[tipoRanking].slice(0, limit);

        // Ranking del jugador si se especifica nombre
        let player = {};
        if (nombreBuscado) {
            const usuario = await users.findOne({ nombre: nombreBuscado });
            if (usuario && typeof usuario[tipoRanking] === "number") {
                const cuenta = await users.countDocuments({
                    [tipoRanking]: { $gt: usuario[tipoRanking] }
                });
                player = {
                    posicion: cuenta + 1,
                    puntaje: usuario[tipoRanking]
                };
            } else {
                player = { posicion: null, puntaje: null };
            }
        }

        res.json({
            tipo: tipoRanking,
            ranking: topUsuarios,
            jugador: player,
            lastRankingTime: global.lastRankingTimes[tipoRanking]
        });

    } catch (error) {
        console.error("Error al obtener ranking:", error);
        res.status(500).json({ error: "Error interno al obtener ranking" });
    }
});




app.get("/api/verUsuario/:nombre", async (req, res) => {


    const nombre = req.params.nombre;

    if (!nombre) {
        return res.status(400).json({ error: "Nombre requerido" });
    }

    const usuario = await users.findOne({ nombre });

    if (!usuario) {
        return res.status(404).json({ error: "Usuario no encontrado" });
    }

    res.json(usuario);
});

app.delete("/api/eliminarUsuario/:nombre", async (req, res) => {


    const nombre = req.params.nombre;

    if (!nombre) {
        return res.status(400).json({ error: "Nombre requerido" });
    }

    const result = await users.deleteOne({ nombre });

    if (result.deletedCount === 0) {
        return res.status(404).json({ error: "Usuario no encontrado o ya eliminado" });
    }

    res.json({ ok: true, eliminado: nombre });
});

app.get("/api/listarUsuarios", async (req, res) => {


    const lista = await users.find({}).toArray();

    res.json(lista);
});

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
    const filePath = path.join(__dirname, `../dist/${triviaName}/assets/coin.png`);
    console.log('Ruta solicitada:', filePath);
    res.sendFile(filePath, (err) => {
        if (err) {
            console.error('Error al enviar la imagen:', err);
            res.status(404).send('Imagen no encontrada');
        }
    });
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

    let enviados = 0;
    let fallidos = 0;
    const tokensValidos = [];

    try {
        // Obtener el token de acceso (reutilizar si es válido)
        const token = await getAccessToken();

        // Recorrer el array de tokens y enviar notificaciones

        for (const tokenDevice of tokens) {
            let cuerpoM = cuerpo
            let tituloM = titulo
            cuerpoM = cuerpoM.replace('COIN', tokenDevice.coinName + 's');
            tituloM = tituloM.replace('COIN', tokenDevice.coinName + 's');
            const payload = {
                message: {
                    notification: {
                        title: tituloM || "¡Nuevas preguntas disponibles!",
                        body: cuerpoM || "Entra y revisa las nuevas categorías o preguntas.",
                        image: `https://triviantis.com/api/${tokenDevice.triviaId}/${tokenDevice.coinName}`//imageUrl, // URL de la imagen
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
