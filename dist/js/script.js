// Detecta si el dispositivo es de escritorio
const isDesktop = window.innerWidth >= 1024;

// Carrusel de paneles introductorios
const panels = document.querySelectorAll('.intro-panels .panel');
const indicators = document.querySelector('.intro-panels .panel-indicators');
const prevBtn = document.querySelector('.intro-panels .prev');
const nextBtn = document.querySelector('.intro-panels .next');
let currentIndex = 0;
let autoSlide;

function showPanel(index) {
  panels.forEach((panel, i) => {
    panel.classList.remove('active');
    if (i === index) {
      panel.classList.add('active');
    }
  });

  const dots = indicators.querySelectorAll('span');
  dots.forEach((dot, i) => {
    dot.classList.toggle('active', i === index);
  });
}

function createIndicators() {
  panels.forEach((_, i) => {
    const dot = document.createElement('span');
    if (i === 0) dot.classList.add('active');
    indicators.appendChild(dot);
  });
}

function nextPanel() {
  currentIndex = (currentIndex + 1) % panels.length;
  showPanel(currentIndex);
}

function prevPanel() {
  currentIndex = (currentIndex - 1 + panels.length) % panels.length;
  showPanel(currentIndex);
}

function startAutoSlide() {
  autoSlide = setInterval(nextPanel, 8000);
}

function stopAutoSlide() {
  clearInterval(autoSlide);
}

createIndicators();
showPanel(currentIndex);
startAutoSlide();

nextBtn.addEventListener('click', () => {
  stopAutoSlide();
  nextPanel();
  startAutoSlide();
});

prevBtn.addEventListener('click', () => {
  stopAutoSlide();
  prevPanel();
  startAutoSlide();
});


// Lore completo (sólo para escritorio)
const narrativaCompleta = `
Algo comenzó a despertar. Y vos lo sentiste.

No sabés por qué, pero lo viste.
Un símbolo.
Una torre.
Un fuego que parecía recordarte algo olvidado.

Triviantis no se construye. Se manifiesta.
Aparece cuando el saber ya no alcanza, cuando las preguntas superan a las respuestas.
Y cuando eso ocurre, el Oráculo comienza a despertar.

Pero no habla. No guía.
Solo pulsa.
Y su llamado no se oye… se siente.

A quienes lo perciben, la ciudad se les revela.
Y al entrar, comienzan a formar parte de algo mayor:
un ciclo que existe desde antes de la memoria, donde el saber se nutre de quienes se atreven a responder.

Cuando el Oráculo percibe una nueva inquietud en el mundo, el Consejo Velado manifiesta una Cámara.
Allí, un nuevo conocimiento debe construirse, piedra por piedra, respuesta por respuesta.

Porque cada Cámara que se abre en Triviantis no es un juego:
es un espacio que necesita ser llenado con saber.

El Triviante no es espectador.
Es partícipe del nuevo despertar del conocimiento.

Jugá. Respondé.
Y al hacerlo, devolvé equilibrio a la ciudad.

Consultá el Compendio de Triviantis para descubrir qué Cámaras están abiertas…
y cuáles aún aguardan ser despertadas.

Por cada acto, el Oráculo entrega sus Fragmentos.
Y el Consejo, en gratitud, ofrece nuevos Mandatos que te acercan a lo profundo del ciclo.

Desde la Plaza de las Velas, podés compartir el conocimiento con otros Triviantes y obtener recompensas.
Y si buscás poner a prueba tu sabiduría, podés desafiar a otros Triviantes en rituales autorizados por el Consejo, dentro del Círculo del Saber.
Porque el conocimiento también se honra al enfrentarlo.

Ascendé en la Jerarquía del Saber.
Reuní Fragmentos de Crónica.
Y dejá tu marca en el Salón de los Ecos.

Y si lo deseás, podés ofrecer un Tributo al Oráculo,
un acto mayor de devoción que fortalece aún más tu vínculo con la ciudad.

Triviantis no busca héroes. Busca respuestas.
¿Estás listo para responder al llamado?
`;


const p = document.querySelector(".lore .narrativa");
if (p) p.textContent = narrativaCompleta;


// Cámaras del Compendio
const camaras = [
  {
    nombre: "Cámara de Mitología",
    estado: "Activa",
    url: isDesktop ? "/mitologia/" : "https://play.google.com/store/apps/details?id=com.triviantis.camarademitologia",
    imagen: "img/camaras/mitologia.png"
  },
  {
    nombre: "Cámara de Ciencia",
    estado: "Activa",
    url: isDesktop ? "/ciencia/" : "https://play.google.com/store/apps/details?id=com.triviantis.camaradeciencia",
    imagen: "img/camaras/ciencia.png"
  },
  {
    nombre: "Cámara de Religiones",
    estado: "Inactiva",
    url: isDesktop ? "/religiones/" : "https://play.google.com/store/apps/details?id=com.triviantis.camaradereligiones",
    imagen: "img/camaras/default.png"
  },
  {
    nombre: "Cámara de Cine",
    estado: "Activa",
    url: isDesktop ? "/peliculas/" : "https://play.google.com/store/apps/details?id=com.triviantis.camaradecine",
    imagen: "img/camaras/cine.png"
  },
  {
    nombre: "Cámara de Selva",
    estado: "Activa",
    url: isDesktop ? "/selva/" : "https://play.google.com/store/apps/details?id=com.triviantis.camaradeselva",
    imagen: "img/camaras/selva.png"
  },
  {
    nombre: "Cámara de Astronomía",
    estado: "Inactiva",
    url: isDesktop ? "/astronomia/" : "https://play.google.com/store/apps/details?id=com.triviantis.camaradeastronomia",
    imagen: "img/camaras/default.png"
  },
  {
    nombre: "Cámara de Mundo",
    estado: "Inactiva",
    url: isDesktop ? "/mundo/" : "https://play.google.com/store/apps/details?id=com.triviantis.camarademundo",
    imagen: "img/camaras/mundo.png"
  },
  {
    nombre: "Cámara de Música",
    estado: "Inactiva",
    url: isDesktop ? "/musica/" : "https://play.google.com/store/apps/details?id=com.triviantis.camarademusica",
    imagen: "img/camaras/default.png"
  },
  {
    nombre: "Cámara de Civilizaciones",
    estado: "Inactiva",
    url: isDesktop ? "/civilizaciones/" : "https://play.google.com/store/apps/details?id=com.triviantis.camaradcivilizaciones",
    imagen: "img/camaras/default.png"
  },
  {
    nombre: "Cámara de Comidas",
    estado: "Inactiva",
    url: isDesktop ? "/comidas/" : "https://play.google.com/store/apps/details?id=com.triviantis.camaradecomidas",
    imagen: "img/camaras/default.png"
  },
  {
    nombre: "Cámara de Historia",
    estado: "Inactiva",
    url: isDesktop ? "/historia/" : "https://play.google.com/store/apps/details?id=com.triviantis.camaradehistoria",
    imagen: "img/camaras/default.png"
  },
];

const grid = document.querySelector(".camaras-grid");
if (grid) {
  camaras.forEach((c) => {
    const card = document.createElement("a");
    card.className = "camara-card";
    card.href = c.estado === "Activa" ? c.url : "";
    card.style.pointerEvents = c.estado !== "Activa" ? "none" : "auto";
    card.target = "_blank";
    card.rel = "noopener noreferrer";
    if (c.estado !== "Activa") {
      card.style.opacity = "0.5";
    }

    card.innerHTML = `
      <div class="card-img" style="background-image: url('${c.imagen}');"></div>
      <div class="card-text">
        <h3>${c.nombre}</h3>
        <p>${c.estado === "Activa" ? 'Jugar Ahora' : 'Proximamente'}</p>
      </div>
    `;

    grid.appendChild(card);
  });
}

function activarBotonFlotanteSiEsMobile() {
  const fixedBtn = document.querySelector(".btn-mobile-fixed");
  const triggerBtn = document.querySelector(".hero .btn-download");

  if (!fixedBtn || !triggerBtn) return;

  const activarObserver = () => {
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting) {
          fixedBtn.classList.add("visible");
        } else {
          fixedBtn.classList.remove("visible");
        }
      },
      { threshold: 0.1 }
    );
    observer.observe(triggerBtn);
  };

  if (window.innerWidth <= 768) {
    activarObserver();
    isDesktop = false;
  } else {
    isDesktop = true;
  }
}

// Ejecutar al cargar
activarBotonFlotanteSiEsMobile();

// Ejecutar al redimensionar
window.addEventListener("resize", () => {
  activarBotonFlotanteSiEsMobile();
});