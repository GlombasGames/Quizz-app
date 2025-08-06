// Detecta si el dispositivo es de escritorio
const isDesktop = window.innerWidth >= 1024;

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

if (isDesktop) {
  const p = document.querySelector(".lore .narrativa");
  if (p) p.textContent = narrativaCompleta;
}

// Placeholder de Cámaras (para desarrollo)
const camaras = [
  { nombre: "Cámara de Civilizaciones", estado: "Activa" },
  { nombre: "Cámara de Mitología", estado: "Inactiva" },
  { nombre: "Cámara de Halloween", estado: "Inactiva" },
  { nombre: "Cámara de Mundo", estado: "Activa" },
  { nombre: "Cámara de Ciencia", estado: "Inactiva" },
  { nombre: "Cámara de Cine", estado: "Activa" },
];

const grid = document.querySelector(".camaras-grid");
if (grid) {
  camaras.forEach((c) => {
    const card = document.createElement("div");
    card.className = "camara";
    card.style.background = c.estado === "Activa" ? "#2e8b57" : "#555";
    card.style.padding = "1rem";
    card.style.borderRadius = "8px";
    card.style.textAlign = "center";
    card.innerHTML = `<h3>${c.nombre}</h3><p>${c.estado}</p>`;
    grid.appendChild(card);
  });
}
