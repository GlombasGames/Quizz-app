import './style.css';
import { Filesystem, Directory, Encoding } from '@capacitor/filesystem';
import { PushNotifications } from '@capacitor/push-notifications';
import { FirebaseMessaging } from '@capacitor-firebase/messaging';

const archivoUsuario = 'usuario.json';
document.addEventListener('DOMContentLoaded', iniciar);

// Ejemplo de uso
async function inicializarUsuario() {

  const datos = await Storage.get({ key: 'usuario' });

  if (!datos?.value || !JSON.parse(datos.value).nombre) {
    // Si el archivo no existe o no tiene nombre, inicializa el progreso
    await pedirNombre();
    return progreso; // Devuelve el progreso inicializado por pedirNombre
  } else {
    // Si el archivo existe, carga los datos
    progreso = JSON.parse(datos.value);
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
    console.log('Token FCM:', token.token);

    // Enviar el token al servidor
    if (tieneConexion()) {
      await fetch('http://192.168.1.106:3001/registrar-token', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: token.token })
      });
      console.log('Token registrado correctamente en el servidor.');
    } else {
      console.warn('No se pudo registrar el token porque no hay conexión.');
    }

    // Manejar notificaciones recibidas
    PushNotifications.addListener('pushNotificationReceived', (notification) => {
      console.log('Notificación recibida:', notification);
    });

    // Manejar notificaciones cuando se tocan
    PushNotifications.addListener('pushNotificationActionPerformed', (notification) => {
      console.log('Notificación tocada:', notification);
    });
  } catch (err) {
    console.error('Error al inicializar notificaciones:', err);
  }
}


const app = document.getElementById('app');


let data = {};
let progreso = {
  nombre: '',
  intentos: 3,
  puntos: {},
  desbloqueadas: ['Geografía', 'Cine'],
  actualizado: null
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
  progreso.desbloqueadas = ['Geografía', 'Cine']; // Guardamos los nombres originales
  progreso.actualizado = null;
  await guardarProgreso();
  await iniciarNotificaciones()
}

async function verificarServidor() {
  try {
    const response = await fetch('http://192.168.1.106:3001/ping', { method: 'GET' });
    return response.ok; // Devuelve true si el servidor responde correctamente
  } catch (error) {
    console.error('Error al verificar el servidor:', error);
    return false; // Devuelve false si hay un error
  }
}


async function cargarDatosJSON(servidorDisponible) {
  try {
    if (servidorDisponible && tieneConexion()) {
      // Si hay conexión y el servidor está disponible, intenta cargar los datos desde el servidor
      const res = await fetch('http://192.168.1.106:3001/categorias.json');
      data = await res.json();

      // Guardar los datos localmente para usarlos en modo offline
      await Storage.set({ key: 'preguntas', value: JSON.stringify(data) });
      progreso.actualizado = new Date().toISOString();
      await guardarProgreso();
    } else {
      // Si no hay conexión o el servidor no está disponible, cargar los datos desde el almacenamiento local
      const preguntasData = await Storage.get({ key: 'preguntas' });
      if (preguntasData.value) {
        data = JSON.parse(preguntasData.value);
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
    app.innerHTML = '<p>Cargando la aplicación...</p>';

    // Verificar si el servidor está disponible
    const servidorDisponible = await verificarServidor();

    // Inicializa los datos del usuario si no existen
    await inicializarUsuario();

    // Carga los datos JSON de las categorías
    await cargarDatosJSON(servidorDisponible);

    // Renderiza el menú principal
    renderMenu();

  } catch (error) {
    console.error('Error al iniciar la aplicación:', error);
    app.innerHTML = '<p>Error al cargar la aplicación. Por favor, verifica tu conexión.</p>';
  }
}

function renderMenu() {
  const totalPuntos = Object.keys(progreso.puntos)
    .filter(cat => progreso.desbloqueadas.includes(cat)) // Solo categorías desbloqueadas
    .reduce((total, cat) => total + progreso.puntos[cat], 0); // Suma los puntos

  const botonAnuncioDisabled = !tieneConexion() || progreso.intentos >= 3;

  app.innerHTML = `
    <div class="saludo">
      <div>¡Bienvenido, ${progreso.nombre}!</div>
    </div>
    <div class="header">
      <div>Intentos: ${progreso.intentos}</div>
      <div>Total: ${totalPuntos} pts</div>
    </div>
    <button class="btn-anuncio" tabindex="0" onclick="verAnuncio()" ${botonAnuncioDisabled ? 'disabled' : ''}>
      Ver anuncio para +1 intento
    </button>
    <h2>Categorías</h2>
    ${Object.keys(data).map(cat => {
    const catNormalizada = cat.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''); // Normaliza y elimina tildes
    const desbloqueada = progreso.desbloqueadas
      .map(c => c.toLowerCase().normalize('NFD').replace(/[\u0300-\u036f]/g, ''))
      .includes(catNormalizada);
    const puntos = progreso.puntos[cat] || 0;
    const bloqueada = !desbloqueada;
    const puntosNecesarios = bloqueada ? `Necesitas ${proximaMeta(cat)} pts` : `Puntos: ${puntos}`;
    return `
        <div class="category ${bloqueada ? 'locked' : ''}">
          <strong>${cat}</strong> <br/>
          <div class="category-info">
            <span>${puntosNecesarios}</span>
            ${bloqueada ? `<span class="lock-icon">🔒</span>` : ''}
            ${!bloqueada && progreso.intentos > 0
        ? `<button tabindex="0" onclick="jugar('${cat}')">Jugar</button>`
        : ''}
          </div>
        </div>
      `;
  }).join('')}
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
  jugarPartida(categoria)
};
async function jugarPartida(categoria) {
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
    .map(pregunta => ({
      ...pregunta,
      opcionesMezcladas: [...pregunta.opciones].sort(() => Math.random() - 0.5) // Mezclar opciones una sola vez
    }));

  let puntaje = 0;
  let index = 0;
  const tiempoLimite = 60;
  let tiempoRestante = tiempoLimite;
  let timer;

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
        <button class="respuesta" onclick="responder('${op}')">${op}</button>
      `).join('')}
    </div>
  `;
    // Asegurarse de que los botones estén habilitados
    const botones = document.querySelectorAll('.respuesta');
    botones.forEach(boton => {
      boton.disabled = false;
      boton.style.transition = 'none'; // Desactiva cualquier animación de transición
    });
  };

  window.responder = (opcionSeleccionada) => {
    // Deshabilitar todos los botones de respuesta
    const botones = document.querySelectorAll('.respuesta');
    botones.forEach(boton => boton.disabled = true);

    const pregunta = seleccionadas[index];
    const correcta = pregunta.respuesta;

    if (opcionSeleccionada === correcta) {
      puntaje++;
    }

    // Agregar un retraso antes de avanzar a la siguiente pregunta
    setTimeout(() => {
      index++;
      renderPregunta();
    }, 300); // 300 ms de retraso
  };

  timer = setInterval(() => {
    tiempoRestante--;
    if (tiempoRestante <= 0) {
      clearInterval(timer);
    }
    renderPregunta();
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
    <h2>¡Fin del juego!</h2>
    <p>Obtuviste ${puntaje} puntos.</p>
    <p>Intentos disponibles: ${progreso.intentos}</p>
    <button onclick="jugar('${categoria}')" ${progreso.intentos > 0 ? '' : 'disabled'}>Reintentar categoría</button>
    <button class="btn-anuncio" onclick="verAnuncio()" ${botonAnuncioDisabled ? 'disabled' : ''}>
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
    if (total >= necesario) {
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
          botonVerAnuncio.remove();
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


