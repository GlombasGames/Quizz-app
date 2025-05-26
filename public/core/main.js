
const triviaName = window.TRIVIA_ID || 'sinNombre'; // Por defecto, selva
const isAndroid = __IS_ANDROID__
const baseURL = isAndroid ? '' : `/${triviaName}`



console.log("Entraste a tivia: ", triviaName)



import './style.css';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { PushNotifications } from '@capacitor/push-notifications';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
import misTrivias from './trivias.json';

const tiempoLimite = 120;

const assetsList = [
  `${baseURL}/assets/fondoPrincipal.png`,
  `${baseURL}/assets/fondoSelvaMarco.png`,
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
  mitologia: 'libro',
  cliencia: 'lupas',
  peliculas: 'pochoclos'
}

const coin = 'coin.png'; // Nombre del archivo de la moneda
const coinName = coinsNames[triviaName]; // Nombre de la moneda según la trivia
const coins = 'ad.png'; // Nombre del archivo de la moneda


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
  header.style.backgroundImage = `url('${baseURL}/assets/cartelTopIguana.png')`;
  const logo = document.querySelector('.logo');
  logo.style.backgroundImage = `url('${baseURL}/assets/iconoTriviaSelva.png')`;
  const btnJugarPpal = document.querySelector('.btn-jugar-ppal');
  btnJugarPpal.style.backgroundImage = `url('${baseURL}/assets/jugar.png')`;
  const btnOtrasTrivias = document.querySelector('.btn-otras-trivias');
  btnOtrasTrivias.style.backgroundImage = `url('${baseURL}/assets/otrasTrivias.png')`;
  const btnNosotros = document.querySelector('.btn-nosotros');
  btnNosotros.style.backgroundImage = `url('${baseURL}/assets/nosotros.png')`;
  const cartelDiv = document.querySelector('.ppal div');
  cartelDiv.style.backgroundImage = `url('${baseURL}/assets/trivian.png')`;


});

// Ejemplo de uso
async function inicializarUsuario() {

  let datos = await Storage.get({ key: 'usuario' });
  datos = JSON.parse(datos.value);
  if (!datos || !datos.nombre || !datos.version || datos.version !== version) {
    // Si el archivo no existe o no tiene nombre, inicializa el progreso
    await pedirNombre();
    // Carga los datos JSON de las categorías
    await cargarDatosJSON(true);
    return progreso; // Devuelve el progreso inicializado por pedirNombre
  } else {
    await cargarDatosJSON(false);
    // Si el archivo existe, carga los datos
    progreso = datos;
    return progreso;
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
    progreso.token = token.token;
    console.log('Token FCM:', token.token);

    // Enviar el token al servidor

    await fetch('https://glombagames.ddns.net/api/registrar-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        nombre: progreso.nombre,
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
const body = document.getElementById('body');


let data = {};
let progreso = {
  nombre: '',
  intentos: 3,
  puntos: {},
  desbloqueadas: [],
  actualizado: null,
  termino: false
};

// Guardar progreso
async function guardarProgreso() {
  await Storage.set({ key: 'usuario', value: JSON.stringify(progreso) });
}


async function pedirNombre() {
  const nombre = prompt('Ingresa tu nombre para comenzar:');
  progreso.nombre = nombre || 'Jugador';
  progreso.intentos = 3;
  progreso.puntos = {};
  progreso.desbloqueadas = []; // Guardamos los nombres originales
  progreso.actualizado = null;
  progreso.version = version


  await iniciarNotificaciones()


  console.log(progreso.nombre, 'ha sido creado.');
  await guardarProgreso();
}

async function verificarServidor() {
  try {
    const response = await fetch('https://glombagames.ddns.net/api/ping', { method: 'GET' });
    return response.ok; // Devuelve true si el servidor responde correctamente
  } catch (error) {
    console.error('Error al verificar el servidor:', error);
    return false; // Devuelve false si hay un error
  }
}
async function verificarVersion() {
  try {
    const response = await fetch('https://glombagames.ddns.net/api/version');
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


async function cargarDatosJSON(actualizar) {
  try {
    if (actualizar) {
      // Si hay conexión y el servidor está disponible, intenta cargar los datos desde el servidor
      const res = await fetch(`https://glombagames.ddns.net/api/categorias.json?triviaId=${triviaName}`);
      data = await res.json();
      console.log('Categorias cargadas desde el servidor:');
      // Guardar los datos localmente para usarlos en modo offline
      await Storage.set({ key: 'preguntas', value: JSON.stringify(data) });
      progreso.actualizado = new Date().toISOString();
    } else {
      // Si no hay conexión o el servidor no está disponible, cargar los datos desde el almacenamiento local
      const preguntasData = await Storage.get({ key: 'preguntas' });
      if (preguntasData.value) {
        data = JSON.parse(preguntasData.value);
        console.log('Categorias cargadas desde Archivos locales');
      } else {
        console.error('No se encontraron datos locales para las preguntas.');
        alert('No se puede cargar el juego sin conexión y sin datos locales.');
        return;
      }
    }

    // Actualizar las categorías desbloqueadas con las primeras dos categorías del archivo JSON
    const categorias = Object.keys(data);
    const primerasCategorias = categorias.slice(0, 2); // Tomar las primeras dos categorías

    // Asegurarse de que las primeras dos categorías estén en progreso.desbloqueadas
    primerasCategorias.forEach((categoria) => {
      if (!progreso.desbloqueadas.includes(categoria)) {
        progreso.desbloqueadas.push(categoria); // Agregar solo si no está ya en el array
      }
    });

    console.log('Categorías desbloqueadas:', progreso.desbloqueadas);

    await guardarProgreso();
  } catch (error) {
    console.error('Error al cargar datos JSON:', error);
    alert('No se pudo cargar el juego. Verifica tu conexión a Internet.');
  }
}

function tieneConexion() {
  return navigator.onLine;
}

async function iniciar() {
  try {
    // Precargar imágenes
    await precargarImagenes(assetsList);
    console.log('Imágenes precargadas correctamente.');
    // Mostrar un mensaje inicial
    app.innerHTML = `<div class="cargando">
    <img src="${baseURL}/assets/GlombaGames.png" alt="Pájaro" style="width:60%; height:220px; min-width:300px; display:block; margin:0 auto 16px auto;">
    <div>
    `;

    // Verificar si el servidor está disponible
    await verificarVersion();

    // Inicializa los datos del usuario si no existen
    await inicializarUsuario();

    setTimeout(() => {
      // Renderiza el menú principal
      renderPrincipal();
    }, 2000);

  } catch (error) {
    console.error('Error al iniciar la aplicación:', error);
    app.innerHTML = '<p>Error al cargar la aplicación. Por favor, verifica tu conexión.</p>';
  }
}

function renderMenu() {
  app.style.backgroundImage = `url(${baseURL}/assets/fondoSelvaMarco.png)`;
  const totalPuntos = Object.keys(progreso.puntos)
    .filter(cat => progreso.desbloqueadas.includes(cat))
    .reduce((total, cat) => total + progreso.puntos[cat], 0);

  const botonAnuncioDisabled = !tieneConexion() || progreso.intentos >= 3;

  app.innerHTML = `
  <div class="header">
  <button class="btn-volver" onclick="renderPrincipal()" tabindex="0"></button>
     <div class="header-item">
         <p class="coin"><img src="${baseURL}/assets/${coin}" alt="coin"> ${progreso.intentos}</p>
     </div>
     <div class="header-item">
      <button class="btn-anuncio-header" tabindex="0" onclick="verAnuncio()" ${botonAnuncioDisabled ? 'disabled' : ''}>
       <img src="${baseURL}/assets/${coins}" alt="coin">    
      </button>
     </div>
     <div class="header-item">
     ${totalPuntos} pts
     </div>
    </div>
    <div class="logo"></div>
    <div class="saludo">
      <div>¡Bienvenido, ${progreso.nombre}!</div>
    </div>
    <div class="categorias">
      ${Object.keys(data).map((cat, i) => {
    const catNormalizada = cat.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
    const puntosRequeridos = i < 2 ? 0 : (i - 1) * 10;
    const yaDesbloqueada = progreso.desbloqueadas
      .map(c => c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
      .includes(catNormalizada);
    const desbloqueada = yaDesbloqueada || totalPuntos >= puntosRequeridos;
    const puntos = progreso.puntos[cat] || 0;
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
        <div class="categoria-info-boton">
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
<p>Si tienes alguna pregunta, comentario o sugerencia, no dudes en ponerte en contacto con nosotros. Puedes encontrarnos en nuestras redes sociales:<hr> <a href="www.facebook.com/glombagames">/GlombaGames</a><hr> <a href="www.instagram.com/glombagames">@GlombaGames</a><hr> o enviarnos un correo electrónico a:<hr> <a href="mailto:glombagames@gmail.com">glombagames@gmail.com</a></p><hr>
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

window.jugar = function jugar(categoria) {
  if (progreso.intentos <= 0) {
    // Seleccionar el botón que fue presionado
    const botonesCategorias = document.querySelectorAll('.categoria-boton');
    botonesCategorias.forEach(boton => {
      const categoriaTexto = boton.querySelector('.cat')?.textContent.trim();
      if (categoriaTexto === categoria) {
        // Verificar si ya existe un mensaje superpuesto
        let mensaje = boton.querySelector('.mensaje-overlay');
        if (!mensaje) {
          // Si no existe, crear el mensaje
          mensaje = document.createElement('div');
          mensaje.className = 'mensaje-overlay';
          mensaje.innerHTML = `
            <span>No tienes suficientes</span>
            <img src="${baseURL}/assets/${coin}" alt="coin" style="width: 40px; height: 40px;">
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
  preguntasRespondidas = 0; // Reiniciar el contador de preguntas respondidas
  const preguntasData = await Storage.get({ key: 'preguntas' });
  const preguntasPorCat = JSON.parse(preguntasData.value)[categoria]?.preguntas || [];

  if (preguntasPorCat.length < 10) {
    alert('No hay suficientes preguntas en esta categoría.');
    return renderMenu();
  }

  // Seleccionar y mezclar preguntas
  const seleccionadas = preguntasPorCat
    .sort(() => Math.random() - 0.5)
    .slice(0, 10)
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

  let puntaje = 0;
  let index = 0;

  let tiempoRestante = tiempoLimite;
  let timer;

  const actualizarTiempo = () => {
    const tiempoElemento = document.querySelector('.header div:first-child');
    if (tiempoElemento) {
      tiempoElemento.textContent = `Tiempo: ${tiempoRestante}s`;
    }
  };

  const renderPregunta = () => {
    if (index >= seleccionadas.length || tiempoRestante <= 0) {
      clearInterval(timer);
      return terminarPartida(puntaje, categoria);
    }

    const pregunta = seleccionadas[index];

    app.innerHTML = `
    <div class="header">
      <div class="header-item-p">Tiempo: ${tiempoRestante}s</div>
      <div class="header-item-p">Pregunta ${index + 1} / 10</div>
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

  window.responder = (opcionSeleccionada) => {
    preguntasRespondidas++; // Incrementar el contador de preguntas respondidas

    const botones = document.querySelectorAll('.respuesta');
    botones.forEach(boton => boton.disabled = true);

    const pregunta = seleccionadas[index];
    const correcta = pregunta.respuesta;

    if (opcionSeleccionada === correcta) {
      puntaje++;
    }

    index++;
    renderPregunta();
  };

  timer = setInterval(() => {
    tiempoRestante--;
    actualizarTiempo();

    if (tiempoRestante <= 0) {
      clearInterval(timer);
      terminarPartida(puntaje, categoria);
    }
  }, 1000);

  renderPregunta();
}

function terminarPartida(puntaje, categoria) {
  progreso.intentos -= 1;
  progreso.puntos[categoria] = puntaje; // Sobrescribe el puntaje en lugar de sumarlo
  checkDesbloqueos();
  guardarProgreso();

  const botonAnuncioDisabled = !tieneConexion() || progreso.intentos >= 3;

  app.innerHTML = `
    <div class="termino">
      <h2>¡Fin del juego!</h2>
      <p>Respondiste ${preguntasRespondidas}/10.</p>
      <h2>Obtuviste ${puntaje} puntos.</h2>
      <p>Intentos disponibles: ${progreso.intentos}</p>
    </div>
    <button class="btn-reintentar" onclick="jugar('${categoria}')" ${progreso.intentos > 0 ? '' : 'disabled'}>Reintentar categoría</button>
    <button class="btn-anuncio btn-anuncio-ancho" onclick="verAnuncio()" ${botonAnuncioDisabled ? 'disabled' : ''}>
      Ver anuncio para +1 intento
    </button>
    <button onclick="renderMenu()">Volver al menú</button>
  `;
}

function checkDesbloqueos() {
  const total = Object.values(progreso.puntos).reduce((acc, pts) => acc + pts, 0);
  const orden = Object.keys(data);

  for (let i = 0; i < orden.length; i++) {
    const cat = orden[i];
    const catNormalizada = normalizarNombre(cat);
    const necesario = i < 2 ? 0 : (i - 1) * 10; // Las primeras dos categorías no requieren puntos, la tercera empieza en 10

    // Si ya está desbloqueada, no hacer nada
    if (progreso.desbloqueadas.map(normalizarNombre).includes(catNormalizada)) {
      continue;
    }

    // Desbloquear la categoría si se cumplen los puntos necesarios
    if (total >= necesario && !progreso.desbloqueadas.map(normalizarNombre).includes(catNormalizada)) {
      progreso.desbloqueadas.push(cat); // Guardamos el nombre original
      alert(`¡Desbloqueaste la categoría "${cat}"!`);
    }
  }
}

window.verAnuncio = async function verAnuncio() {
  // Verificar si hay conexión a Internet
  if (!tieneConexion() || !(await verificarServidor())) {
    alert('No hay conexión con el servidor. Pero puedes gastar tus intentos sin conexion.');
    // Deshabilitar el botón dinámicamente
    const botonVerAnuncio = app.querySelector('button[onclick^="verAnuncio"]');
    if (botonVerAnuncio) {
      botonVerAnuncio.disabled = true;
    }
    return;
  }
  // Simulación de anuncio rewarded
  progreso.intentos += 1;
  guardarProgreso().then(() => {
    // Si estamos en la pantalla de "Fin del juego", recargarla
    if (app.innerHTML.includes('¡Fin del juego!')) {
      const botonReintentar = app.querySelector('button[onclick^="jugar"]');
      if (botonReintentar) {
        botonReintentar.disabled = false; // Habilitar el botón
      }
      const intentosDisponibles = app.querySelector('p:nth-of-type(2)');
      if (intentosDisponibles) {
        intentosDisponibles.textContent = `Intentos disponibles: ${progreso.intentos}`;
      }
      // Ocultar el botón "Ver anuncio" si los intentos son 3 o más
      if (progreso.intentos >= 3) {
        const botonVerAnuncio = app.querySelector('button[onclick^="verAnuncio"]');
        if (botonVerAnuncio) {
          botonVerAnuncio.disabled = true;
        }
      }
    } else {
      renderMenu(); // Si no, redirigir al menú principal
    }
  });
};

function normalizarNombre(nombre) {
  return nombre.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, '');
}


