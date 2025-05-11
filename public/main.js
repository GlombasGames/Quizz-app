let Storage;

// Detección de entorno: si estamos en Capacitor, usamos su API
if (window.Capacitor && window.Capacitor.isNativePlatform) {
  import('@capacitor/storage').then(mod => {
    Storage = mod.Storage;
    iniciar(); // iniciamos la app después de cargar el módulo
  });
} else {
  // Modo navegador: usar localStorage
  Storage = {
    async get({ key }) {
      return { value: localStorage.getItem(key) };
    },
    async set({ key, value }) {
      localStorage.setItem(key, value);
    },
    async remove({ key }) {
      localStorage.removeItem(key);
    }
  };
  iniciar(); // iniciamos la app directamente
}

let fcmToken = null;

async function iniciarNotificaciones() {
  if (!('Notification' in window)) {
    console.log("Este navegador no soporta notificaciones.");
    return;
  }

  try {
    const messaging = firebase.messaging();
    await Notification.requestPermission();

    const registration = await navigator.serviceWorker.register('firebase-messaging-sw.js');
    messaging.useServiceWorker(registration);

    fcmToken = await messaging.getToken({ vapidKey: 'TU_PUBLIC_VAPID_KEY' }); // opcional
    console.log("Token FCM:", fcmToken);

    // Enviar token a tu backend para guardar y poder enviarle notificaciones después
    await fetch('https://TU_DOMINIO/registrar-token', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ token: fcmToken })
    });
  } catch (err) {
    console.error("Error obteniendo token FCM:", err);
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

async function guardarProgreso() {
  await Storage.set({ key: 'progreso', value: JSON.stringify(progreso) });
}

async function cargarProgreso() {
  const res = await Storage.get({ key: 'progreso' });
  if (res.value) {
    progreso = JSON.parse(res.value);
  } else {
    await pedirNombre();
  }
}

async function pedirNombre() {
  const nombre = prompt('Ingresa tu nombre para comenzar:');
  progreso.nombre = nombre || 'Jugador';
  progreso.intentos = 3;
  progreso.puntos = {};
  progreso.desbloqueadas = ['Geografía', 'Cine']; // Guardamos los nombres originales
  progreso.actualizado = null;
  await guardarProgreso();
  iniciarNotificaciones()
}

async function cargarDatosJSON() {
  // Simula la primera carga desde el servidor
  const res = await fetch('./categorias.json');
  data = await res.json();
  // Guardamos localmente si es la primera vez
  if (!progreso.actualizado) {
    await Storage.set({ key: 'preguntas', value: JSON.stringify(data) });
    progreso.actualizado = new Date().toISOString();
    await guardarProgreso();
  }
}

async function iniciar() {
  await cargarProgreso();
  await cargarDatosJSON();
  renderMenu();
}

function renderMenu() {
  app.innerHTML = `
    <div class="header">
      <div>Hola, ${progreso.nombre}</div>
      <div>Intentos: ${progreso.intentos}</div>
    </div>
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
          ${puntosNecesarios} <br/>
          ${!bloqueada && progreso.intentos > 0
        ? `<button tabindex="0" onclick="jugar('${cat}')">Jugar</button>`
        : ''}
        </div>
      `;
  }).join('')}
    ${progreso.intentos < 3
      ? `<button tabindex="0" onclick="verAnuncio()">Ver anuncio para +1 intento</button>`
      : ''}
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
  const tiempoLimite = 30;
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
      <h2>${pregunta.pregunta}</h2>
      ${pregunta.opcionesMezcladas.map(op => `
        <button onclick="responder('${op}')">${op}</button>
      `).join('')}
    `;
  };

  window.responder = (opcionSeleccionada) => {
    const pregunta = seleccionadas[index];
    const correcta = pregunta.respuesta; // La respuesta correcta ahora es un texto
    if (opcionSeleccionada === correcta) { // Comparar directamente el contenido
      puntaje++;
    }
    index++;
    renderPregunta();
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

  app.innerHTML = `
    <h2>¡Fin del juego!</h2>
    <p>Obtuviste ${puntaje} puntos.</p>
    <p>Intentos disponibles: ${progreso.intentos}</p>
    <button onclick="jugar('${categoria}')" ${progreso.intentos > 0 ? '' : 'disabled'}>Reintentar categoría</button>
    <button onclick="renderMenu()">Volver al menú</button>
    ${progreso.intentos < 3
      ? `<button onclick="verAnuncio()">Ver anuncio para +1 intento</button>`
      : ''}
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

window.verAnuncio = function verAnuncio() {
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


