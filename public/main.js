import './style.css';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { PushNotifications } from '@capacitor/push-notifications';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';
let preguntasRespondidas = 0; // Contador global para preguntas respondidas
const archivoUsuario = 'usuario.json';
const tiempoLimite = 120;
let version
document.addEventListener('DOMContentLoaded', iniciar);

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

let Storage = {
  async get({ key }) {
    try {
      const contenido = await Filesystem.readFile({
        path: `${key}.json`,
        directory: Directory.Data, // Cambiado a Directory.Data
        encoding: Encoding.UTF8,
      });
      return { value: contenido.data };
    } catch (error) {
      console.warn(`No se pudo leer el archivo ${key}.json:`, error);
      return { value: null }; // Si no existe el archivo, devuelve null
    }
  },
  async set({ key, value }) {
    try {
      await Filesystem.writeFile({
        path: `${key}.json`,
        data: value,
        directory: Directory.Data, // Cambiado a Directory.Data
        encoding: Encoding.UTF8,
      });
      console.log(`Archivo ${key}.json guardado correctamente.`);
    } catch (error) {
      console.error(`Error al guardar el archivo ${key}.json:`, error);
    }
  },
  async remove({ key }) {
    try {
      await Filesystem.deleteFile({
        path: `${key}.json`,
        directory: Directory.Data, // Cambiado a Directory.Data
      });
      console.log(`Archivo ${key}.json eliminado correctamente.`);
    } catch (error) {
      console.warn(`No se pudo eliminar el archivo ${key}.json:`, error);
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

    await fetch('https://glombagames.ddns.net/registrar-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: token.token })
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
  desbloqueadas: ['Animales', 'Plantas'],
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
  progreso.desbloqueadas = ['Animales', 'Frutas']; // Guardamos los nombres originales
  progreso.actualizado = null;
  progreso.version = version


  await iniciarNotificaciones()


  console.log(progreso.nombre, 'ha sido creado.');
  await guardarProgreso();
}

async function verificarServidor() {
  try {
    const response = await fetch('https://glombagames.ddns.net/ping', { method: 'GET' });
    return response.ok; // Devuelve true si el servidor responde correctamente
  } catch (error) {
    console.error('Error al verificar el servidor:', error);
    return false; // Devuelve false si hay un error
  }
}
async function verificarVersion() {
  try {
    const response = await fetch('https://glombagames.ddns.net/version');
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
    if (actualizar && tieneConexion()) {
      // Si hay conexión y el servidor está disponible, intenta cargar los datos desde el servidor
      const res = await fetch('https://glombagames.ddns.net/categorias.json');
      data = await res.json();
      console.log('Categorias cargadas desde el servidor:');
      // Guardar los datos localmente para usarlos en modo offline
      await Storage.set({ key: 'preguntas', value: JSON.stringify(data) });
      progreso.actualizado = new Date().toISOString();
      await guardarProgreso();
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
    // Mostrar un mensaje inicial
    app.innerHTML = `<div class="cargando">
    <img src="./assets/GlombaGames.png" alt="Pájaro" style="width:60%; height:220px; min-width:300px; display:block; margin:0 auto 16px auto;">
    <div>
    `;

    // Verificar si el servidor está disponible
    await verificarVersion();

    // Inicializa los datos del usuario si no existen
    await inicializarUsuario();

    setTimeout(() => {
      // Renderiza el menú principal
      renderMenu();
    }, 2000);

  } catch (error) {
    console.error('Error al iniciar la aplicación:', error);
    app.innerHTML = '<p>Error al cargar la aplicación. Por favor, verifica tu conexión.</p>';
  }
}

function renderMenu() {
  const totalPuntos = Object.keys(progreso.puntos)
    .filter(cat => progreso.desbloqueadas.includes(cat))
    .reduce((total, cat) => total + progreso.puntos[cat], 0);

  const botonAnuncioDisabled = !tieneConexion() || progreso.intentos >= 3;

  app.innerHTML = `
    <div class="header">
    <img src="./assets/cartelHeader.png" alt="hoja1" >
    <div class="header-item">
          <img src="./assets/coin.png" alt="coin">
          ${progreso.intentos}
        </div>
        <button class="btn-anuncio btn-anuncio-header" tabindex="0" onclick="verAnuncio()" ${botonAnuncioDisabled ? 'disabled' : ''}>
          Ver AD + 1 
          <img src="./assets/coin.png" alt="coin">
        </button>
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
        return `
      <button
        class="categoria-boton ${bloqueada ? 'locked' : ''}"
        ${(!bloqueada) ? `onclick="jugar('${cat}')"` : ''}
        ${bloqueada ? 'disabled' : ''}
        tabindex="0"
        aria-label="${bloqueada ? 'Bloqueada' : 'Jugar'} ${cat}"
      >
        <img class="categoria-img" src="./assets/${catNormalizada}.png" alt="${cat}" onerror="this.src='./assets/pajaro.png'">
        <div class="categoria-info-boton">
          <strong class="cat">${cat}</strong>
          <span class="category-puntos">${puntosNecesarios}</span>
          ${bloqueada ? `<span class="lock-icon">🔒</span>` : ''}
        </div>
      </button>
    `;
      }).join('')}
    </div>
  `;
}
// Aseguramos que renderMenu esté disponible globalmente
window.renderMenu = renderMenu;

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
            <img src="./assets/coin.png" alt="coin" style="width: 40px; height: 40px;">
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
      <div>Tiempo: ${tiempoRestante}s</div>
      <div>Pregunta ${index + 1} / 10</div>
    </div>
    <div class="pregunta">
      <h2>${pregunta.pregunta}</h2>
    </div>
    <div class="respuestas">
      ${pregunta.opcionesMezcladas.map(op => `
        <button class="respuesta" onclick="responder('${op}')">
          ${op === pregunta.respuesta ? `${op} <--correcta` : op}
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


