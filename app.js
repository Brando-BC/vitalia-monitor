/* ==========================================================
   VITALIA MONITOR – APP.JS (BROCK IA 2025)
   ========================================================== */

console.log("VitalIA + Brock cargado correctamente...");

/* ==========================================================
   UTILIDADES
   ========================================================== */

// Limpia texto para que Brock no lea símbolos
function cleanText(text) {
  if (!text) return "";
  return text.replace(/[*_`>#-]/g, " ").replace(/\s+/g, " ").trim();
}

/* ==========================================================
   OBTENER DATOS DEL BACKEND
   ========================================================== */

async function obtenerDatos() {
  try {
    const res = await fetch("/api/getVitals");
    return await res.json();
  } catch (e) {
    console.error("Error obteniendo datos:", e);
    return null;
  }
}

/* ==========================================================
   ACTUALIZAR TARJETAS
   ========================================================== */

function actualizarTarjetas(v) {
  if (!v || !v.heart_rate) return;

  document.getElementById("hr-value").textContent   = `${v.heart_rate} bpm`;
  document.getElementById("spo2-value").textContent = `${v.spo2} %`;
  document.getElementById("temp-value").textContent = `${v.temperature.toFixed(1)} °C`;

  const c_hr   = document.getElementById("card-hr");
  const c_spo2 = document.getElementById("card-spo2");
  const c_temp = document.getElementById("card-temp");

  [c_hr, c_spo2, c_temp].forEach(c => {
    c.classList.remove("estado-verde", "estado-amarillo", "estado-rojo");
  });

  // HR
  if (v.heart_rate < 60) c_hr.classList.add("estado-amarillo");
  else if (v.heart_rate <= 100) c_hr.classList.add("estado-verde");
  else c_hr.classList.add("estado-rojo");

  // SpO₂ ajustado a 3276 msnm
  if (v.spo2 >= 87 && v.spo2 <= 96) c_spo2.classList.add("estado-verde");
  else if (v.spo2 >= 83 && v.spo2 <= 86) c_spo2.classList.add("estado-amarillo");
  else c_spo2.classList.add("estado-rojo");

  // Temperatura
  if (v.temperature >= 36.0 && v.temperature <= 37.0) c_temp.classList.add("estado-verde");
  else if (v.temperature <= 38.0) c_temp.classList.add("estado-amarillo");
  else c_temp.classList.add("estado-rojo");
}

/* ==========================================================
   DIAGNÓSTICO LOCAL
   ========================================================== */

function generarDiagnosticoLocal(v) {
  if (!v) return "Aún no tengo suficientes datos.";

  let msg = [];

  // HR
  if (v.heart_rate < 60) msg.push("El ritmo cardíaco está por debajo de lo normal.");
  else if (v.heart_rate <= 100) msg.push("El ritmo cardíaco está bien.");
  else msg.push("El ritmo cardíaco está elevado.");

  // SpO₂ ajustado
  if (v.spo2 >= 87) msg.push("La oxigenación es normal para esta altitud.");
  else if (v.spo2 >= 83) msg.push("Hay signos de hipoxia leve.");
  else if (v.spo2 >= 79) msg.push("Hay hipoxia moderada.");
  else msg.push("Oxigenación muy baja, posible hipoxia severa.");

  // Temperatura
  const t = v.temperature;
  if (t >= 36.0 && t <= 37.0) msg.push("Temperatura normal.");
  else if (t <= 38.0) msg.push("Hay febrícula.");
  else if (t <= 38.4) msg.push("Fiebre leve.");
  else if (t <= 39.0) msg.push("Fiebre moderada.");
  else msg.push("Fiebre alta.");

  return msg.join(" ");
}

function actualizarDiagnosticoTexto(v) {
  document.getElementById("diag-text").textContent = generarDiagnosticoLocal(v);
}
/* ==========================================================
   GRÁFICAS (Chart.js)
   ========================================================== */

let datosHR = [];
let datosSpO2 = [];
let datosTemp = [];
const LIMIT = 40; // puntos visibles en pantalla

function crearGrafico(id, color) {
  const ctx = document.getElementById(id).getContext("2d");

  return new Chart(ctx, {
    type: "line",
    data: {
      labels: [],
      datasets: [
        {
          data: [],
          borderColor: color,
          borderWidth: 2,
          pointRadius: 0,
          tension: 0.25
        }
      ]
    },
    options: {
      animation: false,
      scales: {
        x: { display: false },
        y: {
          beginAtZero: false,
          grid: { color: "#222" },
          ticks: { color: "#999" }
        }
      },
      plugins: {
        legend: { display: false }
      }
    }
  });
}

const gHR   = crearGrafico("chartHR", "#ff6b6b");
const gSpO2 = crearGrafico("chartSPO2", "#4fc3f7");
const gTemp = crearGrafico("chartTEMP", "#f6c343");

function updateChart(g, arr, val) {
  arr.push(val);
  if (arr.length > LIMIT) arr.shift();

  g.data.labels = arr.map((_, i) => i);
  g.data.datasets[0].data = arr;
  g.update();
}

/* ==========================================================
   LOOP PRINCIPAL — Actualiza cada 2 segundos
   ========================================================== */

async function loop() {
  const data = await obtenerDatos();
  if (!data) return;

  actualizarTarjetas(data);
  actualizarDiagnosticoTexto(data);

  updateChart(gHR,   datosHR,   data.heart_rate);
  updateChart(gSpO2, datosSpO2, data.spo2);
  updateChart(gTemp, datosTemp, data.temperature);
}

setInterval(loop, 2000);

/* ==========================================================
   CHAT IA (Texto)
   ========================================================== */

const chatWindow = document.getElementById("chat-window");
const chatInput  = document.getElementById("chat-input");

function addMessage(text, from = "bot") {
  const div = document.createElement("div");
  div.className = `message ${from}`;
  div.innerHTML = `<span>${text}</span>`;
  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

async function enviarAIA(texto) {
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ message: texto })
    });

    const data = await res.json();
    const reply = cleanText(data.reply);

    addMessage(reply, "bot");
    hablar(reply);   // Habla la respuesta

  } catch (e) {
    addMessage("Error al contactar a Brock.", "bot");
  }
}

document.getElementById("chat-form").addEventListener("submit", (e) => {
  e.preventDefault();

  const msg = chatInput.value.trim();
  if (!msg) return;

  addMessage(msg, "user");
  chatInput.value = "";

  enviarAIA(msg);
});
/* ==========================================================
   TTS (HABLAR) — Voz masculina natural
   ========================================================== */

let speaking = false;

function vozMasculina() {
  const voices = speechSynthesis.getVoices();

  // Prioridad: voces masculinas
  const male = voices.find(v =>
    v.lang.startsWith("es") &&
    (
      v.name.toLowerCase().includes("male")   ||
      v.name.toLowerCase().includes("hombre") ||
      v.name.toLowerCase().includes("miguel") ||
      v.name.toLowerCase().includes("carlos") ||
      v.name.toLowerCase().includes("jorge")
    )
  );

  return male || voices.find(v => v.lang.startsWith("es")) || voices[0];
}

function hablar(texto) {
  speechSynthesis.cancel();
  speaking = true;

  if (escuchando && reconocimiento) reconocimiento.stop();

  // Activar animación Jarvis
  document.getElementById("jarvis-anim").style.opacity = 1;
  document.getElementById("asistente-estado").textContent = "Brock está hablando…";

  const u = new SpeechSynthesisUtterance(cleanText(texto));
  u.lang  = "es-ES";
  u.pitch = 0.95;
  u.rate  = 1.03;
  u.voice = vozMasculina();

  u.onend = () => {
    speaking = false;
    document.getElementById("jarvis-anim").style.opacity = 0;
    document.getElementById("asistente-estado").textContent = "Brock está escuchando…";

    if (escuchando) setTimeout(() => reconocimiento.start(), 200);
  };

  speechSynthesis.speak(u);
}

/* ==========================================================
   STT — Reconocimiento de voz "OK BROCK"
   ========================================================== */

let reconocimiento = null;
let escuchando = false;

function initRecon() {
  const R = window.SpeechRecognition || window.webkitSpeechRecognition;
  reconocimiento = new R();
  reconocimiento.lang = "es-ES";
  reconocimiento.continuous = true;
  reconocimiento.interimResults = false;

  reconocimiento.onstart = () => {
    document.getElementById("asistente-estado").textContent =
      "Brock está escuchando… (di OK BROCK)";
    document.getElementById("jarvis-anim").style.opacity = 0.3;
  };

  reconocimiento.onerror = (e) => {
    console.log("Reconocimiento error:", e);
  };

  reconocimiento.onend = () => {
    if (escuchando && !speaking) reconocimiento.start();
  };

  reconocimiento.onresult = (ev) => {
    if (!escuchando) return;
    if (speaking) return; // Anti-eco

    const text = ev.results[ev.results.length - 1][0].transcript.toLowerCase().trim();
    console.log("Oído:", text);

    // Si no menciona "Brock", ignorar
    if (!text.includes("brock")) return;

    // Si dice solo "ok brock"
    if (text === "ok brock" || text === "oye brock" || text === "hey brock") {
      hablar("Aquí estoy, ¿qué necesitas?");
      return;
    }

    // Eliminalo del texto final
    let comando = text
      .replace("ok brock", "")
      .replace("oye brock", "")
      .replace("hey brock", "")
      .replace("brock", "")
      .trim();

    addMessage(comando, "user");
    enviarAIA(comando);
  };
}

/* ==========================================================
   ACTIVAR / DESACTIVAR ESCUCHA
   ========================================================== */

const botonVoz = document.getElementById("activar-voz");

function activarEscucha() {
  escuchando = true;
  initRecon();
  reconocimiento.start();

  botonVoz.textContent = "🛑 Desactivar Brock";
  document.getElementById("asistente-estado").textContent = "Brock está escuchando…";
  document.getElementById("jarvis-anim").style.opacity = 0.3;
}

function desactivarEscucha() {
  escuchando = false;

  if (reconocimiento) reconocimiento.stop();
  speechSynthesis.cancel();

  botonVoz.textContent = "🎤 Activar Brock";
  document.getElementById("asistente-estado").textContent = "Brock está inactivo";
  document.getElementById("jarvis-anim").style.opacity = 0;
}

botonVoz.addEventListener("click", () => {
  escuchando ? desactivarEscucha() : activarEscucha();
});
/* ==========================================================
   AUTO ACTIVACIÓN AL CARGAR
   ========================================================== */

window.addEventListener("load", () => {
  // Cargar voces
  speechSynthesis.onvoiceschanged = () => {
    vozMasculina();
  };

  // Activar escucha automática
  activarEscucha();

  // Estado inicial Jarvis
  document.getElementById("jarvis-anim").style.transition = "0.3s";
  document.getElementById("jarvis-anim").style.opacity = 0.3;
});

/* ==========================================================
   ANIMACIÓN JARVIS (CSS DINÁMICO)
   ========================================================== */

const jarvisCSS = document.createElement("style");
jarvisCSS.innerHTML = `
  .jarvis-circles {
    width: 40px;
    height: 40px;
    margin-left: auto;
    border-radius: 50%;
    border: 3px solid #58a6ff;
    box-shadow: 0 0 10px #58a6ff;
    animation: pulse 1.2s infinite ease-in-out;
    opacity: 0;
  }

  @keyframes pulse {
    0%   { transform: scale(0.9); opacity: 0.3; }
    50%  { transform: scale(1.1); opacity: 0.9; }
    100% { transform: scale(0.9); opacity: 0.3; }
  }
`;
document.head.appendChild(jarvisCSS);
