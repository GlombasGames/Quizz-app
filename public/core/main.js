const triviaName = window.TRIVIA_ID || 'sinNombre'; // Por defecto, selva
const isAndroid = __IS_ANDROID__
const baseURL = isAndroid ? '' : `/${triviaName}`
const tiempoLimite = 120;
let usuarioActual = null;
let batchDelta = {};

const backgroundColors = {
  selva: " #0d2401cf",
  mitologia: "rgba(69, 66, 5, 0.83)",
  ciencia: "rgba(19, 37, 34, 0.82)",
  peliculas: "rgba(36, 1, 1, 0.85)",
}
const borderColors = {
  selva: "#143f10",
  mitologia: "#3f3910",
  ciencia: "rgb(4, 41, 29)",
  peliculas: "#3f1010",
}
const fontColors = {
  selva: ["#FFD700", "background: linear-gradient(90deg, #FFD700, #FFA500); text-shadow: 0 2px 4px rgba(0, 0, 0, 0.7); -webkit-background-clip: text; -webkit-text-fill-color: transparent;"],
  mitologia: ["#221803"],
  ciencia: ["#ffffff"],
  peliculas: ["#000000"],
}
//color: #FFD700;
// background: linear-gradient(90deg, #FFD700, #FFA500);
// text-shadow: 0 2px 4px rgba(0, 0, 0, 0.7); -webkit-background-clip: text; -webkit-text-fill-color: transparent;

const backgroundColor = backgroundColors[triviaName];
const borderColor = borderColors[triviaName];
const fontColor = fontColors[triviaName]; // Color por defecto si no se encuentra el color específico
const cambioFontColor = fontColor[1] ? fontColor[1] : ''; // Color por defecto si no se encuentra el color específico
console.log("Entraste a tivia: ", triviaName)



import './style.css';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { PushNotifications } from '@capacitor/push-notifications';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import misTrivias from './trivias.json';
import { initAdMob, showBanner, showRewarded } from './admob.js';
import { AppLauncher } from '@capacitor/app-launcher';

document.addEventListener('deviceready', async () => {
  await initAdMob();
  await showBanner();

});


const assetsList = [
  `${baseURL}/assets/fondoPrincipal.png`,
  `${baseURL}/assets/fondoApp.png`,
  `${baseURL}/assets/coin.png`,
  `${baseURL}/assets/ad.png`,
  `${baseURL}/assets/GlombaGames.png`,
  `${baseURL}/assets/pajaro.png`,
  `${baseURL}/assets/trivian.png`,
  `${baseURL}/assets/cartel.png`,
];

async function precargarImagenes(rutas) {
  return Promise.all(
    rutas.map((ruta) => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.src = ruta;
        img.onload = resolve; // Resuelve la promesa cuando la imagen se carga
        img.onerror = reject; // Rechaza la promesa si hay un error
      });
    })
  );
}

const coinsNames = {
  selva: 'escarabajo',
  mitologia: 'moneda',
  ciencia: 'lupa',
  peliculas: 'ticket'
}

const coin = 'coin.png'; // Nombre del archivo de la moneda
const coinName = coinsNames[triviaName]; // Nombre de la moneda según la trivia
const coins = 'ad.png'; // Nombre del archivo de la moneda

const items = {
  respuesta_correcta: { icono: "✅", descripcion: "Te da una respuesta correcta en la trivia." },
  mas_tiempo: { icono: "⏱️", descripcion: "Te da más tiempo para responder en la trivia." },
  eliminar_opcion: { icono: "❌", descripcion: "Elimina una opción incorrecta de las posibles respuestas." },
  cofre_normal: { icono: "🎁", descripcion: "Te da un cofre normal con recompensas aleatorias." },
  cofre_pequeño: { icono: "🪙", descripcion: "Te da un cofre pequeño con recompensas aleatorias." },
  cofre_grande: { icono: "🎁", descripcion: "Te da un cofre grande con recompensas aleatorias." },
  llave: { icono: "🔑", descripcion: "Te da una llave para desbloquear una categoría especial." }
}

window.items = items;

let viendoAd = false; // Variable para controlar si se está viendo un anuncio
let seleccionadas = [];
let timer = null;
let categoriaActual = null;
let puntaje = 0;
let index = 0;
let tiempoRestante = 0
let preguntaExtra = false;
let preguntasRespondidas = 0; // Contador global para preguntas respondidas
let version
document.addEventListener('DOMContentLoaded', () => {
  iniciar()
  //cargo dinamicamente todos los assets 
  const volverBtn = document.querySelector('.btn-volver');
  volverBtn.style.backgroundImage = `url('${baseURL}/assets/flecha.png')`;
  const volverBtnCartel = document.querySelector('.btn-volver-cartel');
  volverBtnCartel.style.backgroundImage = `url('${baseURL}/assets/flecha.png')`;
  const cartel = document.querySelector('.cartel');
  cartel.style.backgroundImage = `url('${baseURL}/assets/cartel.png')`;
  const header = document.querySelector('.header');
  header.style.backgroundImage = `url('${baseURL}/assets/cartelTop.png')`;
  const logo = document.querySelector('.logo');
  logo.style.backgroundImage = `url('${baseURL}/assets/logoTrivia.png')`;
  const btnJugarPpal = document.querySelector('.btn-jugar-ppal');
  btnJugarPpal.style.backgroundImage = `url('${baseURL}/assets/jugar.png')`;
  const btnOtrasTrivias = document.querySelector('.btn-otras-trivias');
  btnOtrasTrivias.style.backgroundImage = `url('${baseURL}/assets/otrasTrivias.png')`;
  const btnNosotros = document.querySelector('.btn-nosotros');
  btnNosotros.style.backgroundImage = `url('${baseURL}/assets/nosotros.png')`;
  const cartelDiv = document.querySelector('.ppal div');
  cartelDiv.style.backgroundImage = `url('${baseURL}/assets/trivian.png')`;


});

function aplicarDelta(obj, delta) {
  for (const key in delta) {
    const partes = key.split('.');
    let destino = obj;
    for (let i = 0; i < partes.length - 1; i++) {
      if (!destino[partes[i]]) destino[partes[i]] = {};
      destino = destino[partes[i]];
    }
    destino[partes[partes.length - 1]] = delta[key];
  }
}

function actualizarJugador(path, valor) {
  const partes = path.split('.');
  let destino = usuarioActual;
  for (let i = 0; i < partes.length - 1; i++) {
    if (!destino[partes[i]]) destino[partes[i]] = {};
    destino = destino[partes[i]];
  }
  destino[partes[partes.length - 1]] = valor;

  // Guardar en el delta
  batchDelta[path] = valor;
  Storage.set({ key: 'batch_delta', value: JSON.stringify(batchDelta) });
}

async function gastarCoin() {
  usuarioActual.intentos -= 1;
  actualizarJugador(`monedas.${triviaName}`, usuarioActual.intentos);
  const base = Number.isFinite(usuarioActual.actividadTotal) ? usuarioActual.actividadTotal : 0;
  usuarioActual.actividadTotal = base + 1;
  actualizarJugador('actividadTotal', usuarioActual.actividadTotal);
}

async function aplicarDeltaPendiente() {

  const deltaGuardado = await Storage.get({ key: 'batch_delta' });
  if (deltaGuardado.value) {
    const delta = JSON.parse(deltaGuardado.value);
    aplicarDelta(usuarioActual, delta);
    const res = await fetch('https://triviantis.com/api/syncUserDelta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: usuarioActual.nombre, delta })
    });
    const data = await res.json();
    if (data.retornoDelta) {
      aplicarDelta(usuarioActual, data.retornoDelta);
    }
    await Storage.remove({ key: 'batch_delta' });
  }
}

async function inicializarUsuario() {
  // 1. Recuperar nombre guardado
  let guardado = await Storage.get({ key: 'usuario_nombre' });
  let nombre = null
  let password = null
  if (guardado.value) {
    guardado = JSON.parse(guardado.value);
    nombre = guardado.nombre;
    password = guardado.password;
  }

  if (!nombre || !password) {
    console.warn("No hay usuario guardado, se requiere login");
    renderLogin();
    return;
  }
  let response

  // 4. Pedimos estado completo al backend
  response = await fetch('https://triviantis.com/api/getUser', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, password })
  });


  if (!response.ok || response.error) {
    console.warn("Usuario no existe");
    renderLogin();
    return;
  }

  try {
    const userData = await response.json();
    usuarioActual = userData;
    console.warn("Login existoso: ", usuarioActual.nombre);
  } catch (error) {
    console.error('Error al parsear JSON:', error);
    throw new Error('La respuesta no es un JSON válido.');
  }

  if (!usuarioActual) {
    renderLogin();
  } else {
    if (usuarioActual.monedas?.[triviaName] === undefined) {
      usuarioActual.intentos = 3
      actualizarJugador(`monedas.${triviaName}`, 3);
    } else {
      usuarioActual.intentos = usuarioActual.monedas?.[triviaName];
    }
    await cargarDatosJSON();
    // 5. Aplicar delta si quedó alguno pendiente
    aplicarDeltaPendiente();
    // 6. Preparar estructura delta vacía
    batchDelta = {};

    renderPrincipal();
    // 7. Continuás con el resto del flujo
    return usuarioActual;
  }
}

const buildPath = (key) => isAndroid ? `${key}.json` : `${triviaName}/${key}.json`;

let Storage = {
  async get({ key }) {
    try {
      const path = buildPath(key);
      const contenido = await Filesystem.readFile({
        path,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });
      return { value: contenido.data };
    } catch (error) {
      return { value: null };
    }
  },
  async set({ key, value }) {
    try {
      const path = buildPath(key);
      await Filesystem.writeFile({
        path,
        data: value,
        directory: Directory.Data,
        encoding: Encoding.UTF8,
      });
    } catch (error) {
      console.error('Error al guardar:', error);
    }
  },
  async remove({ key }) {
    try {
      const path = buildPath(key);
      await Filesystem.deleteFile({
        path,
        directory: Directory.Data,
      });
    } catch (error) {
      console.warn('No se pudo eliminar:', error);
    }
  },
};



let fcmToken = null;

async function iniciarNotificaciones() {
  try {
    // Solicitar permisos para notificaciones push
    const permission = await PushNotifications.requestPermissions();
    if (permission.receive !== 'granted') {
      console.log('Permiso de notificaciones no concedido.');
      return;
    }

    console.log('Permiso de notificaciones concedido.');

    // Registrar el dispositivo para recibir notificaciones
    await PushNotifications.register();

    // Obtener el token FCM
    const token = await FirebaseMessaging.getToken();
    usuarioActual.token = token.token;
    console.log('Token FCM:', token.token);

    // Enviar el token al servidor

    await fetch('https://triviantis.com/api/registrar-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: usuarioActual.nombre,
        token: token.token,
        triviaId: triviaName,
        coinName,
        fecha: new Date().toISOString(),
        timezone: Intl.DateTimeFormat().resolvedOptions().timeZone // Captura la zona horaria del usuario
      })
    });
    console.log('Token registrado correctamente en el servidor.');


    // Manejar notificaciones recibidas
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Notificación recibida:', notification);
    });

    // Manejar notificaciones cuando se tocan
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Notificación tocada:', notification);
    });
  } catch (err) {
    if (err.code === 'UNIMPLEMENTED') {
      console.log('Notificaciones no se aplican a WEB.');
    } else {
      console.error('Error al inicializar notificaciones:', err);
    }
  }
}


const app = document.getElementById('app');


let data = {};
let dataMisiones = {};


async function verificarServidor() {
  try {
    const response = await fetch('https://triviantis.com/api/ping', { method: 'GET' });
    return response.ok; // Devuelve true si el servidor responde correctamente
  } catch (error) {
    console.error('Error al verificar el servidor:', error);
    return false; // Devuelve false si hay un error
  }
}
async function verificarVersion() {
  try {
    const response = await fetch('https://triviantis.com/api/version');
    data = await response.json();
    if (data) {
      version = data.version;
      console.log('Versión del servidor:', version);
    }
    return response.ok; // Devuelve true si el servidor responde correctamente
  } catch (error) {
    console.error('Error al verificar la version:', error);
    return false; // Devuelve false si hay un error
  }
}


async function cargarDatosJSON() {
  try {
    let preguntasData;
    if (!isAndroid) {
      preguntasData = await Storage.get({ key: 'categorias' });
    } else {
      preguntasData = await Storage.get({ key: 'categorias' });
    }
    if (preguntasData.value) {
      data = JSON.parse(preguntasData.value);
      console.log('Categorías cargadas desde almacenamiento local:', data);
    } else {
      let res
      if (isAndroid) {
        res = await fetch('/categorias.json');
      } else {
        res = await fetch(`${triviaName}/categorias.json`);
      }

      if (!res.ok) {
        throw new Error(`Error al cargar el archivo JSON: ${res.status}`);
      }
      data = await res.json();
      console.error({ data })
      console.log('Categorías cargadas desde el archivo local:', data);

      await Storage.set({ key: 'categorias', value: JSON.stringify(data) });
    }
    // Actualizar las categorías desbloqueadas con las primeras dos categorías del archivo JSON
    const categorias = Object.keys(data);
    const primerasCategorias = categorias.slice(0, 2); // Tomar las primeras dos categorías

    // Fusionar desbloqueadas sin perder las anteriores
    const nuevasCategorias = primerasCategorias.filter(cat => !usuarioActual.desbloqueadas.includes(cat));
    if (nuevasCategorias.length > 0) {
      usuarioActual.desbloqueadas.push(...nuevasCategorias);
      actualizarJugador("desbloqueadas", usuarioActual.desbloqueadas);
    }
    console.log('Categorías desbloqueadas:', usuarioActual.desbloqueadas);

    // Cargar misiones
    const misionesData = await Storage.get({ key: 'misiones' });
    if (misionesData.value) {
      // Recuperar misiones desde el almacenamiento local
      dataMisiones = JSON.parse(misionesData.value);
      console.log('Misiones cargadas desde almacenamiento local:', dataMisiones);
    } else {
      // Cargar misiones desde el archivo JSON
      const res = await fetch('/misiones.json');
      if (!res.ok) {
        throw new Error(`Error al cargar el archivo JSON: ${res.status}`);
      }
      dataMisiones = await res.json();
      console.log('Misiones cargadas desde el archivo local:', dataMisiones);
      // Guardar misiones en el almacenamiento local
      await Storage.set({ key: 'misiones', value: JSON.stringify(dataMisiones) });
    }
    console.warn('Misiones cargadas:', dataMisiones);
    // Si fechaReinicio está vacía, calcular una nueva fecha de reinicio
    if (!usuarioActual.fechaReinicio) {
      const fechaActual = new Date();
      const nuevaFechaReinicio = new Date(fechaActual.getTime() + 7 * 24 * 60 * 60 * 1000); // Sumar 7 días
      usuarioActual.fechaReinicio = nuevaFechaReinicio.toISOString(); // Guardar en formato ISO
      actualizarJugador('fechaReinicio', usuarioActual.fechaReinicio);
      console.log('Nueva fecha de reinicio calculada:', usuarioActual.fechaReinicio);
    }
  } catch (error) {
    console.error('Error al desbloquear categorias basicas:', error);
  }
}

function tieneConexion() {
  return navigator.onLine;
}

async function iniciar() {
  try {
    // Precargar imágenes
    console.time('cargarImagenes');
    await precargarImagenes(assetsList);
    console.timeEnd('cargarImagenes');
    console.log('Imágenes precargadas correctamente.');
    // Mostrar un mensaje inicial
    app.innerHTML = `<div class="cargando">
    <img src="${baseURL}/assets/GlombaGames.png" alt="Pájaro" style="width:60%; height:220px; min-width:300px; display:block; margin:0 auto 16px auto;">
    <div>
    `;

    console.time('verificarVersion');
    await verificarVersion();
    console.timeEnd('verificarVersion');

    console.time('inicializarUsuario');
    console.timeEnd('inicializarUsuario');

    setTimeout(() => {
      inicializarUsuario();
    }, 2000);

  } catch (error) {
    console.error('Error al iniciar la aplicación:', error);
    app.innerHTML = '<p>Error al cargar la aplicación. Por favor, verifica tu conexión.</p>';
  }
}

function renderMenu() {
  app.style.backgroundImage = `url(${baseURL}/assets/fondoApp.png)`;
  const totalPuntos = Object.keys(usuarioActual.puntos)
    .filter(cat => Object.keys(data).includes(cat)) // Filtrar categorías que pertenecen a esta trivia
    .reduce((total, cat) => total + usuarioActual.puntos[cat], 0);

  const botonAnuncioDisabled = !tieneConexion() || usuarioActual.intentos >= 3;

  app.innerHTML = `
  <div class="header">
    <button class="btn-volver" onclick="renderPrincipal()" tabindex="0"></button>
    <button class="btn-mochila" onclick="abrirInventario()" tabindex="0">🎒</button>
    <button class="btn-logros" onclick="abrirLogros()" tabindex="0">🏅</button>
    <button class="btn-misiones" onclick="abrirMisiones()" tabindex="0">📋</button>
    <div class="header-item" style="color:${fontColor[0]}; ${cambioFontColor}">
      <p class="coin"><img src="${baseURL}/assets/${coin}" alt="coin"> ${usuarioActual.intentos}</p>
    </div>
    <div class="header-item" style="color:${fontColor[0]}; ${cambioFontColor}">
      <button class="btn-anuncio-header" tabindex="0" onclick="verAnuncio()" ${botonAnuncioDisabled ? 'disabled' : ''}>
        <img src="${baseURL}/assets/${coins}" alt="coin">    
      </button>
    </div>
    <div class="header-item" style="color:${fontColor[0]}; ${cambioFontColor}">
      ${totalPuntos} pts
    </div>
  </div>
  <div class="logo"></div>
  <div class="saludo" style="background: ${backgroundColor}; border: 1px solid ${borderColor};">
    <div>¡Bienvenido, ${usuarioActual.nombre}!</div>
  </div>
  <div class="categorias">
    ${Object.keys(data).map((cat, i) => {
    const catNormalizada = cat.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const puntosRequeridos = i < 2 ? 0 : (i - 1) * 10;
    const yaDesbloqueada = usuarioActual.desbloqueadas
      .map(c => c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
      .includes(catNormalizada);
    const desbloqueada = yaDesbloqueada || totalPuntos >= puntosRequeridos;
    const puntos = usuarioActual.puntos[cat] || 0;
    const bloqueada = !desbloqueada;
    const puntosNecesarios = bloqueada ? `Necesitas ${puntosRequeridos} pts` : `Puntos: ${puntos}`;
    const nombreConEspacios = cat.replace(/-/g, ' '); // Reemplazar "-" por " "
    return `
      <button
        class="categoria-boton ${bloqueada ? 'locked' : ''}"
        ${(!bloqueada) ? `onclick="jugar('${cat}')"` : ''}
        ${bloqueada ? 'disabled' : ''}
        tabindex="0"
        aria-label="${bloqueada ? 'Bloqueada' : 'Jugar'} ${nombreConEspacios}"
      >
        <img class="categoria-img" src="${baseURL}/assets/${catNormalizada}.png" alt="${nombreConEspacios}" onerror="this.src='${baseURL}/assets/pajaro.png'">
        <div class="categoria-info-boton" style="background: ${backgroundColor};border: 1px solid ${borderColor};">
          <strong class="cat">${nombreConEspacios}</strong>
          <span class="category-puntos">${puntosNecesarios}</span>
          ${bloqueada ? `<span class="lock-icon">🔒</span>` : ''}
        </div>
      </button>
    `;
  }).join('')}
  </div>
  `;
}
window.renderMenu = renderMenu;

// Función para generar el contenido de otrasTrivias
function generarOtrasTrivias(trivias) {
  return `
    <div class="trivias-caja">
      ${trivias
      .map(
        (trivia) => `
        <div class="trivia">
          ${trivia.url
            ? `<a href="${trivia.url}" target="_blank">
                  <img src="${trivia.imagenUrl}" alt="${trivia.nombre}" onerror="this.src='${baseURL}/assets/proximamente.png';">
                </a>`
            : `
              <div class="trivia-contenedor">
                <img src="${trivia.imagenUrl}" alt="${trivia.nombre}" onerror="this.src='${baseURL}/assets/proximamente.png';">
                ${trivia.estado ? `<div class="trivia-overlay">${trivia.estado}</div>` : ""}
              </div>
              <p class="trivia-nombre">${trivia.nombre}</p>
            `
          }
        </div>
      `
      )
      .join("")}
    </div>
  `;
}

// Generar el contenido dinámicamente
window.otrasTrivias = generarOtrasTrivias(misTrivias);

window.nosotros = `
<div class="contenido-cartel-texto">
<h3>¿Quiénes somos?</h3>
<p><strong>GlombaGames</strong> es un estudio de desarrollo de videojuegos independiente,  Nuestro objetivo es crear experiencias únicas y entretenidas para jugadores de todas las edades.</p>
<h3>¿Qué hacemos?</h3>
<p>Nos especializamos en el desarrollo de juegos móviles y de escritorio, con un enfoque en la jugabilidad, la narrativa y la estética visual. Nos encanta experimentar con nuevas ideas y mecánicas de juego, y siempre estamos buscando formas de innovar y mejorar nuestras creaciones.</p>
<h3>¿Cómo puedes contactarnos?</h3>
<p>Si tienes alguna pregunta, comentario o sugerencia, no dudes en ponerte en contacto con nosotros. Puedes encontrarnos en nuestras redes sociales:<hr> <a href="www.facebook.com/glombagames">/GlombaGames</a><hr> <a href="www.instagram.com/glombagames">@GlombaGames</a><hr> o enviarnos un correo electrónico a:<hr> <a href="mailto:glombagamesok@gmail.com">glombagamesok@gmail.com</a></p><hr>
<p>¡Gracias por jugar a nuestros juegos y por ser parte de la comunidad de Glomba Games!</p>
<h3>¿Cómo puedes ayudarnos?</h3>
<p>Si te gusta nuestro juego, ¡ayúdanos a correr la voz! Comparte el juego con tus amigos y familiares, y déjanos una reseña en la tienda de aplicaciones. Tu apoyo significa mucho para nosotros y nos ayuda a seguir creando juegos increíbles.</p>
`;

function renderPrincipal() {
  app.style.backgroundImage = `url(${baseURL}/assets/fondoPrincipal.png)`;

  app.innerHTML = `
  <div class="ppal">
    <div></div>
    <button class="btn-jugar-ppal" onclick="renderMenu()" tabindex="0"></button>
    <button class="btn-otras-trivias" onclick="renderCartel(otrasTrivias, 'Nuestras otras Trivias')" tabindex="0"></button>
    <button class="btn-nosotros" onclick="renderCartel(nosotros, 'Nosotros')" tabindex="0"></button>
  </div>
`;
}
window.renderPrincipal = renderPrincipal;

function renderCartel(contenido, titulo) {

  app.innerHTML = `
  <div class="cartel">
  <button class="btn-volver-cartel" onclick="renderPrincipal()" tabindex="0"></button>
    <h2>${titulo}</h2>
    <div class="contenido-cartel">
      ${contenido}
    </div>
  </div>
  `;
}
window.renderCartel = renderCartel;


function proximaMeta(cat) {
  const orden = Object.keys(data);
  const index = orden.indexOf(cat);
  return index < 2 ? 0 : (index - 1) * 10; // Las primeras dos categorías requieren 0 puntos, las siguientes empiezan en 10
}
function normalizarCategoria(categoria) {
  return categoria.replace(/-/g, ' '); // Reemplaza los guiones por espacios
}

window.jugar = function jugar(categoria) {
  if (usuarioActual.intentos <= 0) {
    // Seleccionar el botón que fue presionado
    const botonesCategorias = document.querySelectorAll('.categoria-boton');
    botonesCategorias.forEach(boton => {
      const categoriaTexto = boton.querySelector('.cat')?.textContent.trim();
      if (normalizarCategoria(categoriaTexto) === normalizarCategoria(categoria)) {
        // Verificar si ya existe un mensaje superpuesto
        let mensaje = boton.querySelector('.mensaje-overlay');
        if (!mensaje) {
          // Si no existe, crear el mensaje
          mensaje = document.createElement('div');
          mensaje.className = 'mensaje-overlay';
          mensaje.innerHTML = `
            <span>No tienes suficientes</span>
            <img src="${baseURL}/assets/coin.png" alt="coin" style="width: 40px; height: 40px;">
          `;
          boton.appendChild(mensaje); // Agregar el mensaje al botón
        }

        // Reiniciar el temporizador si ya existe
        if (boton._mensajeTimeout) {
          clearTimeout(boton._mensajeTimeout); // Cancelar el temporizador anterior
        }

        // Crear un nuevo temporizador para eliminar el mensaje
        boton._mensajeTimeout = setTimeout(() => {
          mensaje.remove();
          boton._mensajeTimeout = null; // Limpiar la referencia al temporizador
        }, 2000);

        return;
      }
    });
    return;
  }

  // Si tiene intentos, iniciar la partida
  jugarPartida(categoria);
};

async function jugarPartida(categoria) {
  categoriaActual = categoria;
  index = 0;
  puntaje = 0;
  preguntaExtra = false;
  preguntasRespondidas = 0; // Reiniciar el contador de preguntas respondidas
  const preguntasData = await Storage.get({ key: 'categorias' });
  const preguntasPorCat = JSON.parse(preguntasData.value)[categoria]?.preguntas || [];

  if (preguntasPorCat.length < 11) {
    alert('No hay suficientes preguntas en esta categoría.');
    return renderMenu();
  }
  await gastarCoin(); // Gastar una moneda al iniciar la partida

  // Seleccionar y mezclar preguntas
  seleccionadas = preguntasPorCat
    .sort(() => Math.random() - 0.5)
    .slice(0, 11)
    .map(pregunta => {
      const opcionesMezcladas = [...pregunta.opciones].sort(() => Math.random() - 0.5);

      // Verificar que la respuesta correcta esté incluida en las opciones mezcladas
      if (!opcionesMezcladas.includes(pregunta.respuesta)) {
        opcionesMezcladas.push(pregunta.respuesta);
        opcionesMezcladas.sort(() => Math.random() - 0.5); // Mezclar nuevamente
      }

      return {
        ...pregunta,
        opcionesMezcladas
      };
    });

  tiempoRestante = tiempoLimite;


  const actualizarTiempo = () => {
    const tiempoElemento = document.querySelector('.header div:first-child');
    if (tiempoElemento) {
      tiempoElemento.textContent = `Tiempo: ${tiempoRestante}s`;
    }
  };

  window.actualizarTiempo = actualizarTiempo;

  const renderPregunta = () => {
    if ((index >= 10 && !preguntaExtra) || (index >= 11) || tiempoRestante <= 0) {
      clearInterval(timer);

      if (!preguntaExtra) {
        // Preguntar si quiere ver anuncio para 1 pregunta más
        app.innerHTML = `
      <div class="termino">
        <h2>¡Fin del juego!</h2>
        <p>Respondiste ${preguntasRespondidas}/10.</p>
        <p>Obtuviste ${puntaje} puntos.</p>
        <p>¿Querés una pregunta más?</p>
        <button onclick="verPreguntaExtra()">Ver anuncio y seguir</button>
        <button onclick="terminarPartida(${puntaje}, '${categoria}')">Terminar</button>
      </div>
    `;
      }
      return;
    }

    const pregunta = seleccionadas[index];

    app.innerHTML = `
    <div class="header">
      <div class="header-item-p" style="color:${fontColor[0]};${cambioFontColor}">Tiempo: ${tiempoRestante}s</div>
      <div class="header-item-p" style="color:${fontColor[0]};${cambioFontColor}">Pregunta ${!preguntaExtra ? index + 1 : preguntasRespondidas + 1} / ${preguntaExtra ? 11 : 10}</div>
    </div>
    <div class="pregunta">
      <h2>${pregunta.pregunta}</h2>
    </div>
    <div class="respuestas">
      ${pregunta.opcionesMezcladas.map(op => `
        <button class="respuesta" onclick="responder('${op}')">
          ${op === pregunta.respuesta ? `${op}` : op}
        </button>
      `).join('')}
    </div>
  `;
  };

  window.renderPregunta = renderPregunta;


  window.responder = (opcionSeleccionada) => {
    preguntasRespondidas++; // Incrementar el contador de preguntas respondidas

    const botones = document.querySelectorAll('.respuesta');
    botones.forEach(boton => boton.disabled = true);

    const pregunta = seleccionadas[index];
    const correcta = pregunta.respuesta;

    if (opcionSeleccionada === correcta) {
      puntaje++;
    }
    if (preguntaExtra) {
      clearInterval(timer);
      terminarPartida(puntaje, categoriaActual);
      return
    }
    index++;
    renderPregunta();
  };

  timer = setInterval(() => {
    tiempoRestante--;
    actualizarTiempo();

    if (tiempoRestante <= 0) {
      clearInterval(timer);
      // Mostrar la opción para ver el anuncio si no es pregunta extra
      app.innerHTML = `
      <div class="termino">
        <h2>¡Fin del juego!</h2>
        <p>Respondiste ${preguntasRespondidas}/${preguntaExtra ? 11 : 10}.</p>
        <p>Obtuviste ${puntaje} puntos.</p>
        <p>¿Querés una pregunta más?</p>
        <button onclick="verPreguntaExtra()">Ver anuncio y seguir</button>
        <button onclick="terminarPartida(${puntaje}, '${categoria}')">Terminar</button>
      </div>
    `;

    }
  }, 1000);

  renderPregunta();
}

window.verPreguntaExtra = async function verPreguntaExtra() {
  viendoAd = true; // Indicar que se está viendo un anuncio
  const visto = await showRewarded();

  if (!visto) {
    alert("Debes ver el anuncio completo para continuar.");
    terminarPartida(puntaje, categoriaActual);
    return;
  }

  // Configurar para 1 pregunta extra
  preguntaExtra = true;
  tiempoRestante = 30;
  index = 10; // Mostrar la pregunta 11
  timer = setInterval(() => {
    tiempoRestante--;
    actualizarTiempo();

    if (tiempoRestante <= 0) {
      clearInterval(timer);

      terminarPartida(puntaje, categoriaActual);

    }
  }, 1000);

  renderPregunta(); // Mostrar la nueva pregunta
};

function terminarPartida(puntaje, categoria) {
  actualizarJugador(`puntos.${categoria}`, puntaje);
  checkDesbloqueos();


  const botonAnuncioDisabled = !tieneConexion() || usuarioActual.intentos >= 3;

  app.innerHTML = `
    <div class="termino">
      <h2>¡Fin del juego!</h2>
      <p>Respondiste ${preguntasRespondidas}/${preguntaExtra ? 11 : 10}.</p>
      <h2>Obtuviste ${puntaje} puntos.</h2>
      <p>Intentos disponibles: ${usuarioActual.intentos}</p>
    </div>
    <button class="btn-reintentar" onclick="jugar('${categoria}')" ${usuarioActual.intentos > 0 ? '' : 'disabled'}>Reintentar categoría</button>
    <button class="btn-anuncio btn-anuncio-ancho" onclick="verAnuncio()" ${botonAnuncioDisabled ? 'disabled' : ''}>
      Ver anuncio para +1 intento
    </button>
    <button onclick="renderMenu()">Volver al menú</button>
  `;

  preguntaExtra = false; // Reiniciar la pregunta extra
}
window.terminarPartida = terminarPartida;

function checkDesbloqueos() {
  const total = Object.keys(usuarioActual.puntos)
    .filter(cat => Object.keys(data).includes(cat)) // Filtrar categorías que pertenecen a esta trivia
    .reduce((acc, cat) => acc + usuarioActual.puntos[cat], 0);
  const orden = Object.keys(data);

  for (let i = 0; i < orden.length; i++) {
    const cat = orden[i];
    const catNormalizada = normalizarNombre(cat);
    const necesario = i < 2 ? 0 : (i - 1) * 10; // Las primeras dos categorías no requieren puntos, la tercera empieza en 10

    // Si ya está desbloqueada, no hacer nada
    if (usuarioActual.desbloqueadas.map(normalizarNombre).includes(catNormalizada)) {
      continue;
    }

    // Desbloquear la categoría si se cumplen los puntos necesarios
    if (total >= necesario && !usuarioActual.desbloqueadas.map(normalizarNombre).includes(catNormalizada)) {
      usuarioActual.desbloqueadas.push(cat); // Guardamos el nombre original
      actualizarJugador("desbloqueadas", usuarioActual.desbloqueadas);
      alert(`¡Desbloqueaste la categoría "${cat}"!`);
    }
  }
}

window.verAnuncio = async function verAnuncio() {
  const botonVerAnuncio = app.querySelector('button[onclick^="verAnuncio"]');
  if (!tieneConexion() || !(await verificarServidor())) {
    alert('No hay conexión con el servidor.');
    if (botonVerAnuncio) botonVerAnuncio.disabled = true;
    return;
  }

  try {
    viendoAd = true; // Indicar que se está viendo un anuncio
    botonVerAnuncio.disabled = true; // Deshabilitar el botón mientras se muestra el anuncio
    app.style.pointerEvents = 'none'; // Deshabilitar interacciones con la app mientras se muestra el anuncio
    const visto = await showRewarded(); // devuelve true si fue completado
    app.style.pointerEvents = 'auto'; // Habilitar interacciones con la app después de mostrar el anuncio
    botonVerAnuncio.disabled = false; // Habilitar el botón después de mostrar el anuncio

    if (visto) {
      usuarioActual.intentos += 1;
      actualizarJugador(`monedas.${triviaName}`, usuarioActual.intentos);

      if (app.innerHTML.includes('¡Fin del juego!')) {
        const botonReintentar = app.querySelector('button[onclick^="jugar"]');
        if (botonReintentar) botonReintentar.disabled = false;

        const intentosDisponibles = app.querySelector('p:nth-of-type(2)');
        if (intentosDisponibles) {
          intentosDisponibles.textContent = `Intentos disponibles: ${usuarioActual.intentos}`;
        }

        if (usuarioActual.intentos >= 3) {
          const botonVerAnuncio = app.querySelector('button[onclick^="verAnuncio"]');
          if (botonVerAnuncio) botonVerAnuncio.disabled = true;
        }
      } else {
        renderMenu();
      }
    } else {
      alert("Debes ver el anuncio completo para recibir una recompensa.");
    }
  } catch (e) {
    console.error("Error mostrando el anuncio:", e);
    alert("No se pudo mostrar el anuncio.");
  }
};

function normalizarNombre(nombre) {
  return nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}

const inventario = [
  { nombre: "Escarabajo", descripcion: "Puede usarse en la trivia de la selva", icono: "🐞", cantidad: 3, coin: true },
  { nombre: "Lupa", descripcion: "Puede usarse en la trivia de ciencia", icono: "🔍", cantidad: 3, coin: true },
  { nombre: "Moneda", descripcion: "Puede usarse en la trivia de mitología", icono: "💰", cantidad: 3, coin: true },
  { nombre: "Ticket", descripcion: "Puede usarse en la trivia de películas", icono: "🎟️", cantidad: 3, coin: true },
  { nombre: "Eliminar respuesta", descripcion: "Elimina una respuesta incorrecta de las posibles respuestas", icono: "❌", cantidad: 1 },
  { nombre: "Poción mágica", descripcion: "Restaura un intento fallido", icono: "🧪", cantidad: 2 },
  { nombre: "Llave dorada", descripcion: "Desbloquea una categoría especial", icono: "🔑", cantidad: 1 },
  { nombre: "Mapa", descripcion: "Muestra pistas adicionales", icono: "🗺️", cantidad: 5 },
  { nombre: "Reloj", descripcion: "Añade tiempo extra", icono: "⏰", cantidad: 3 },
];
window.inventario = inventario; // Exponer el inventario globalmente

function abrirInventario() {

  const inventarioHTML = inventario.map((item, index) => `
    <div class="inventario-item" onclick="seleccionarItem(${index})" data-index="${index}">
      <div class="inventario-icon">${item.icono}</div>
      <div class="inventario-cantidad">${item.cantidad}</div>
    </div>
  `).join('');

  app.innerHTML += `
    <div class="inventario-overlay">
      <div class="inventario">
        <button class="btn-cerrar-inventario" onclick="cerrarInventario()">✖</button>
        <div class="inventario-items">
          ${inventarioHTML}
        </div>
        <div class="inventario-descripcion">
          Toca un objeto para saber más
        </div>
      </div>
    </div>
  `;
}
window.abrirInventario = abrirInventario;

function cerrarInventario() {
  const overlay = document.querySelector('.inventario-overlay');
  if (overlay) overlay.remove();
}
window.cerrarInventario = cerrarInventario;
function seleccionarItem(index) {
  const item = inventario[index];
  const descripcionDiv = document.querySelector('.inventario-descripcion');
  const items = document.querySelectorAll('.inventario-item');

  // Quitar selección previa
  items.forEach(item => item.classList.remove('seleccionado'));

  // Agregar borde amarillo al seleccionado
  const seleccionado = document.querySelector(`.inventario-item[data-index="${index}"]`);
  if (seleccionado) seleccionado.classList.add('seleccionado');

  // Mostrar descripción
  if (descripcionDiv) descripcionDiv.textContent = `${item.nombre}: ${item.descripcion}`;

  // Limpiar botones previos
  const botonesDiv = document.querySelector('.inventario-botones');
  if (botonesDiv) botonesDiv.remove();

  // Si el ítem tiene coin: true, mostrar el botón "Ir a trivia"
  if (item.coin) {
    // Buscar la trivia correspondiente en trivias.json
    const trivia = misTrivias.find(trivia => trivia.coin === item.nombre);

    if (trivia) {
      // Crear contenedor para el botón
      const botonesContainer = document.createElement('div');
      botonesContainer.className = 'inventario-botones';
      botonesContainer.style.display = 'flex';
      botonesContainer.style.justifyContent = 'center';
      botonesContainer.style.marginTop = '8px';

      // Botón "Ir a trivia"
      const irATriviaBtn = document.createElement('button');
      irATriviaBtn.textContent = 'Ir a trivia';
      irATriviaBtn.className = 'btn-ir-a-trivia';
      irATriviaBtn.style.flex = '1';
      irATriviaBtn.style.margin = '0 4px';

      // Intentar abrir la app instalada o redirigir al store
      irATriviaBtn.onclick = async () => {
        const packageName = `com.triviantis.camarade${trivia.triviaName.toLowerCase()}`; // Nombre del paquete de la app
        console.log(`Intentando abrir la app: ${packageName}`);
        const fallbackUrl = trivia.url; // URL del store o página web

        try {
          //  Aplicar delta si quedó alguno pendiente
          aplicarDeltaPendiente();
          // Verificar si la app está instalada
          const canOpen = await AppLauncher.canOpenUrl({ url: packageName });
          console.warn({ canOpen });
          if (canOpen.value) {
            console.log(`✅ Aplicación encontrada: ${canOpen.value}`);
            // Abrir la app instalada
            await AppLauncher.openUrl({ url: packageName });
            console.log(`✅ Aplicación abierta: ${packageName}`);
          } else {
            // Redirigir al store si la app no está instalada
            console.log(`⚠️ Aplicación no instalada, redirigiendo a: ${fallbackUrl}`);
            window.location.href = fallbackUrl;
          }
        } catch (error) {
          console.error('❌ Error al intentar abrir la aplicación:', error);
          // Redirigir al store como último recurso
          window.location.href = fallbackUrl;
        }
      };

      // Agregar el botón al contenedor
      botonesContainer.appendChild(irATriviaBtn);

      // Insertar el contenedor en el DOM, justo antes de la descripción
      descripcionDiv.parentNode.insertBefore(botonesContainer, descripcionDiv);
    }
  }
}
window.seleccionarItem = seleccionarItem;

const logros = [
  { nombre: "Primer paso", descripcion: "Completaste tu primera trivia", icono: "🥇" },
  { nombre: "Explorador", descripcion: "Jugaste en todas las categorías", icono: "🌍" },
  { nombre: "Maestro", descripcion: "Obtuviste 100 puntos en total", icono: "🏆" },
  { nombre: "Velocidad", descripcion: "Completaste una trivia en menos de 1 minuto", icono: "⏱️" },
];

function abrirLogros() {
  const logrosHTML = logros.map((logro, index) => `
    <div class="inventario-item" onclick="seleccionarLogro(${index})" data-index="${index}">
      <div class="inventario-icon">${logro.icono}</div>
    </div>
  `).join('');

  app.innerHTML += `
    <div class="inventario-overlay">
      <div class="inventario">
        <button class="btn-cerrar-inventario" onclick="cerrarInventario()">✖</button>
        <div class="inventario-items">
          ${logrosHTML}
        </div>
        <div class="inventario-descripcion">
          Toca un logro para saber más
        </div>
      </div>
    </div>
  `;
}
window.abrirLogros = abrirLogros;

function seleccionarLogro(index) {
  const logro = logros[index];
  const descripcionDiv = document.querySelector('.inventario-descripcion');
  const items = document.querySelectorAll('.inventario-item');

  // Quitar selección previa
  items.forEach(item => item.classList.remove('seleccionado'));

  // Agregar borde amarillo al seleccionado
  const seleccionado = document.querySelector(`.inventario-item[data-index="${index}"]`);
  if (seleccionado) seleccionado.classList.add('seleccionado');

  // Mostrar descripción
  if (descripcionDiv) descripcionDiv.textContent = `${logro.nombre}: ${logro.descripcion}`;
}
window.seleccionarLogro = seleccionarLogro;

function testFechaReinicio() {
  const nuevaFechaReinicio = new Date(Date.now() - 1); // Sumar 8 días a la fecha actual
  usuarioActual.fechaReinicio = nuevaFechaReinicio.toISOString();
  actualizarJugador('fechaReinicio', usuarioActual.fechaReinicio); // Guardar la nueva fecha de reinicio
  abrirMisiones(); // Llamar a la función para reflejar el cambio
}
window.testFechaReinicio = testFechaReinicio;

function agregarPuntos() {
  Object.keys(usuarioActual.misiones).forEach((key) => {
    usuarioActual.misiones[key] += 5;
  });
  actualizarJugador('misiones', usuarioActual.misiones);
  abrirMisiones(); // Llamar a la función para reflejar el cambio
}
window.agregarPuntos = agregarPuntos;



async function abrirMisiones() {
  if (!Array.isArray(dataMisiones.misiones) || dataMisiones.misiones.length === 0) {
    app.innerHTML = `
    <button class="btn-volver" onclick="renderMenu()" tabindex="0" style="top:50px">Volver</button>
    <p>No hay misiones disponibles en este momento.</p>`;
    return;
  }

  // Asegurarse de que usuarioActual.reclamadas esté inicializado como un array
  if (!Array.isArray(usuarioActual.reclamadas)) {
    usuarioActual.reclamadas = [];
    actualizarJugador('reclamadas', usuarioActual.reclamadas); // Guardar el cambio
  }

  let fechaReinicio = new Date(usuarioActual.fechaReinicio);
  const fechaActual = new Date();

  // Verificar si la fecha de reinicio ya pasó
  if (fechaReinicio < fechaActual) {
    // Recorrer el objeto usuarioActual.misiones y poner todas sus propiedades en 0
    Object.keys(usuarioActual.misiones).forEach((key) => {
      usuarioActual.misiones[key] = 0;
    });
    // Actualizar la información usando la función actualizarJugador
    actualizarJugador('misiones', usuarioActual.misiones);
    usuarioActual.reclamadas = []; // Reiniciar las misiones reclamadas
    actualizarJugador('reclamadas', usuarioActual.reclamadas);


    // Sumar 7 días a la fecha de reinicio
    const nuevaFechaReinicio = new Date(fechaReinicio.getTime() + 7 * 24 * 60 * 60 * 1000);
    usuarioActual.fechaReinicio = nuevaFechaReinicio.toISOString();
    actualizarJugador('fechaReinicio', usuarioActual.fechaReinicio); // Guardar la nueva fecha de reinicio
    fechaReinicio = nuevaFechaReinicio; // Actualizar la variable fechaReinicio
  }

  const tiempoRestante = fechaReinicio - fechaActual;
  const dias = Math.floor(tiempoRestante / (1000 * 60 * 60 * 24));
  const horas = Math.floor((tiempoRestante % (1000 * 60 * 60 * 24)) / (1000 * 60 * 60));
  const minutos = Math.floor((tiempoRestante % (1000 * 60 * 60)) / (1000 * 60));

  app.innerHTML = `
  <div class="misiones">
    <button class="btn-test-fecha-reinicio" onclick="testFechaReinicio()" style="position:fixed; bottom:20px; right:20px; z-index:1000;">
    Test Fecha Reinicio
    </button>
    <button onclick="agregarPuntos()" style="position:fixed; bottom:20px; left:20px; z-index:1000;">
    Agregar
    </button>
    <button class="btn-volver" onclick="renderMenu()" tabindex="0" style="top:50px">Volver</button>
    <h2>Misiones Semanales</h2>
    <p>Próximo reinicio: ${dias} días, ${horas} horas, ${minutos} minutos</p>
    ${dataMisiones.misiones.map((mision) => {
    const completada = usuarioActual.misiones[mision.progreso] >= mision.objetivo;
    const reclamada = usuarioActual.reclamadas.includes(mision.nombre);
    const icono = items[mision.premio]?.icono || '❓';
    let progreso = usuarioActual.misiones[mision.progreso] || 0;
    progreso = progreso > mision.objetivo ? mision.objetivo : progreso
    return `
        <div class="mision">
          <div class="mision-detalles">
            <div class="mision-nombre">${mision.nombre}</div>
            <div class="mision-progreso">
              <progress value="${progreso}" max="${mision.objetivo}"></progress>
              <span>${progreso} / ${mision.objetivo}</span>
            </div>
          </div>
          <div class="mision-premio">
            <div class="mision-icono">${icono}</div>
            <span>${mision.cantidad}</span>
          </div>
          <div class="mision-boton">
            <button class="btn-reclamar" ${completada && !reclamada ? '' : 'disabled'}  ${reclamada ? `style="background-color:rgb(146, 9, 9);"` : ""} onclick="reclamarPremio('${mision.nombre}')">${!reclamada ? "Reclamar" : "Reclamada"}</button>
          </div>
        </div>
      `;
  }).join('')}
  </div>
`;
}
window.abrirMisiones = abrirMisiones;

async function reclamarPremio(nombreMision) {
  dataMisiones.misiones = dataMisiones.misiones.map(mision => {
    if (mision.nombre === nombreMision) {
      alert(`Premio de la misión "${nombreMision}" reclamado.`);
      if (!usuarioActual.reclamadas.includes(mision.nombre)) {
        usuarioActual.reclamadas.push(mision.nombre); // Agregar la misión reclamada si no existe
        actualizarJugador('reclamadas', usuarioActual.reclamadas);
      }
    }
    return mision;
  });
  abrirMisiones(); // Volver a abrir las misiones para reflejar el cambio
}

function renderLogin() {
  app.style.backgroundImage = `url(${baseURL}/assets/fondoApp.png)`;

  app.innerHTML = `
    <div class="login-container" style="display: flex; flex-direction: column; align-items: center; padding: 40px; color: white;">
      <h2 style="margin-bottom: 20px;">Iniciar Sesión</h2>
      
      <input id="login-nombre" placeholder="Usuario" style="padding: 10px; margin-bottom: 10px; width: 80%; max-width: 300px;" />
      <input id="login-password" type="password" placeholder="Contraseña" style="padding: 10px; margin-bottom: 20px; width: 80%; max-width: 300px;" />
      <div style="display: flex; width: 80%; justify-content: space-between; ">
      <button style="width:45%; height: 70px; color: black;" onclick="crearCuenta()" style="padding: 10px 20px;">Crear cuenta</button>
      <button style="width:45%; height: 70px; color: black;" onclick="loginUsuario()" style="padding: 10px 20px; margin-bottom: 10px;">Entrar</button>
      </div>
    </div>
  `;
}

window.renderLogin = renderLogin;

window.loginUsuario = async function loginUsuario() {
  const nombre = document.getElementById('login-nombre').value.trim();
  const password = document.getElementById('login-password').value;

  if (!nombre || !password) {
    alert("Debes completar ambos campos.");
    return;
  }

  console.log("Intentando iniciar sesión con:", { nombre, password });
  // Acá irá la lógica de validación contra backend
  // 3. Guardamos estructura mínima en usuarioActual
  usuarioActual = { nombre };

  // 4. Pedimos estado completo al backend
  const response = await fetch('https://triviantis.com/api/getUser', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, password })
  });

  if (!response.ok) {
    throw new Error(`Error en la API: ${response.status} ${response.statusText}`);
  }

  try {
    const userData = await response.json();
    usuarioActual = userData;
    const usuario = { nombre, password }
    await Storage.set({ key: 'usuario_nombre', value: JSON.stringify(usuario) });
    console.warn("Login existoso:", nombre)
  } catch (error) {
    console.error('Error al parsear JSON:', error);
    throw new Error('La respuesta no es un JSON válido.');
  }
  if (!usuarioActual) {
    renderLogin();
  } else {
    if (usuarioActual.monedas?.[triviaName] === undefined) {
      usuarioActual.intentos = 3
      actualizarJugador(`monedas.${triviaName}`, 3);
    } else {
      usuarioActual.intentos = usuarioActual.monedas?.[triviaName];
    }
    await cargarDatosJSON();
    // 5. Aplicar delta si quedó alguno pendiente
    aplicarDeltaPendiente();
    // 6. Preparar estructura delta vacía
    batchDelta = {};

    renderPrincipal();
  }
};

window.crearCuenta = async function crearCuenta() {
  const nombre = document.getElementById('login-nombre').value.trim();
  const password = document.getElementById('login-password').value;

  if (!nombre || !password) {
    alert("Debes completar ambos campos.");
    return;
  }
  // 4. comprobamos si el usuario ya existe
  const user = await fetch('https://triviantis.com/api/getUser', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre })
  });
  if (user.ok) {
    console.error(`El usuario ya existe`);
    return;
  }
  // Acá irá la lógica para crear usuario en el backend
  const response = await fetch('https://triviantis.com/api/createUser', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ nombre, password })
  });
  try {
    const userData = await response.json();
    usuarioActual = userData;
    const usuario = { nombre, password }
    await Storage.set({ key: 'usuario_nombre', value: JSON.stringify(usuario) });
    console.warn("Crear cuenta existoso:", nombre)
  } catch (error) {
    console.error('Error al parsear JSON:', error);
    throw new Error('La respuesta no es un JSON válido.');
  }
  if (!usuarioActual) {
    renderLogin();
  } else {
    if (usuarioActual.monedas?.[triviaName] === undefined) {
      usuarioActual.intentos = 3
      actualizarJugador(`monedas.${triviaName}`, 3);
    } else {
      usuarioActual.intentos = usuarioActual.monedas?.[triviaName];
    }
    await cargarDatosJSON();
    // 5. Aplicar delta si quedó alguno pendiente
    aplicarDeltaPendiente();
    // 6. Preparar estructura delta vacía
    batchDelta = {};

    renderPrincipal();
  }
};


// Función para aplicar el delta pendiente al pausar la app
window.reclamarPremio = reclamarPremio;
document.addEventListener('pause', async () => {
  await aplicarDeltaPendiente()
})
// Función para volver a cargar el usuario actual y cargar pantalla menu al reanudar la app
document.addEventListener('resume', async () => {
  if (!viendoAd) {
    await aplicarDeltaPendiente()
    await inicializarUsuario();
    renderMenu()
  } else {
    viendoAd = false; // Reiniciar el estado de viendoAd al reanudar
  }
})


setInterval(async () => {
  if (Object.keys(batchDelta).length > 0) {
    const res = await fetch('https://triviantis.com/api/syncUserDelta', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: usuarioActual.nombre, delta: batchDelta })
    });
    batchDelta = {};
    const data = await res.json();
    if (data.retornoDelta) {
      usuarioActual.buzon = [...(usuarioActual.buzon || []), ...data.retornoDelta];
      actualizarJugador('buzon', usuarioActual.buzon);
      alert(`Tienes ${data.retornoDelta.length} nuevos mensajes en tu buzón.`); //mejorar
    }
    await Storage.remove({ key: 'batch_delta' });
  }
}, 5 * 60 * 1000); // Cada 5 minutos