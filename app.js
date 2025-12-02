/* ==========================================================
   VITALIA MONITOR – BROCK AI 2025 (VERSIÓN ESTABLE FINAL)
   ========================================================== */

console.log("VitalIA + Brock inicializado correctamente...");

/* ==========================================================
   UTILIDADES
   ========================================================== */

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

  document.getElementById("hr-value").textContent = `${v.heart_rate} bpm`;
  document.getElementById("spo2-value").textContent = `${v.spo2} %`;
  document.getElementById("temp-value").textContent = `${v.temperature.toFixed(1)} °C`;

  const c_hr = document.getElementById("card-hr");
  const c_spo2 = document.getElementById("card-spo2");
  const c_temp = document.getElementById("card-temp");

  [c_hr, c_spo2, c_temp].forEach(c => {
    c.classList.remove("estado-verde", "estado-amarillo", "estado-rojo");
  });

  // HR
  if (v.heart_rate < 60) c_hr.classList.add("estado-amarillo");
  else if (v.heart_rate <= 100) c_hr.classList.add("estado-verde");
  else c_hr.classList.add("estado-rojo");

  // SpO2 (ajustado 3276 msnm)
  if (v.spo2 >= 87 && v.spo2 <= 96) c_spo2.classList.add("estado-verde");
  else if (v.spo2 >= 83 && v.spo2 <= 86) c_spo2.classList.add("estado-amarillo");
  else c_spo2.classList.add("estado-rojo");

  // Temp
  if (v.temperature >= 36.0 && v.temperature <= 37.0) c_temp.classList.add("estado-verde");
  else if (v.temperature <= 38.0) c_temp.classList.add("estado-amarillo");
  else c_temp.classList.add("estado-rojo");
}

/* ==========================================================
   DIAGNÓSTICO LOCAL
   ========================================================== */

function generarDiagnosticoLocal(v) {
  if (!v) return "Aún no tengo suficientes datos para evaluar.";

  let msg = [];

  if (v.heart_rate < 60) msg.push("El ritmo cardíaco está bajo.");
  else if (v.heart_rate <= 100) msg.push("El ritmo cardíaco está dentro de lo normal.");
  else msg.push("El ritmo cardíaco está elevado.");

  if (v.spo2 >= 87) msg.push("La oxigenación es normal para esta altitud.");
  else if (v.spo2 >= 83) msg.push("Hay hipoxia leve.");
  else if (v.spo2 >= 79) msg.push("Hay hipoxia moderada.");
  else msg.push("Hipoxia severa detectada.");

  const t = v.temperature;
  if (t >= 36.0 && t <= 37.0) msg.push("Temperatura corporal normal.");
  else if (t <= 38.0) msg.push("Febrícula.");
  else if (t <= 38.4) msg.push("Fiebre leve.");
  else if (t <= 39.0) msg.push("Fiebre moderada.");
  else msg.push("Fiebre alta.");

  return msg.join(" ");
}

function actualizarDiagnosticoTexto(v) {
  document.getElementById("diag-text").textContent = generarDiagnosticoLocal(v);
}

/* ==========================================================
   GRAFICAS
   ========================================================== */

let datosHR = [], datosSpO2 = [], datosTemp = [];
const LIMIT = 40;

function crearGrafico(id, color) {
  const ctx = document.getElementById(id).getContext("2d");
  return new Chart(ctx, {
    type: "line",
    data: { labels: [], datasets: [{ data: [], borderColor: color, borderWidth: 2, pointRadius: 0 }] },
    options: { animation: false, scales: { x: { display: false } } }
  });
}

const gHR = crearGrafico("chartHR", "#ff6b6b");
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
   LOOP PRINCIPAL
   ========================================================== */

async function loop() {
  const v = await obtenerDatos();
  if (!v) return;

  actualizarTarjetas(v);
  actualizarDiagnosticoTexto(v);
  updateChart(gHR, datosHR, v.heart_rate);
  updateChart(gSpO2, datosSpO2, v.spo2);
  updateChart(gTemp, datosTemp, v.temperature);
}

setInterval(loop, 2000);

/* ==========================================================
   CHAT IA
   ========================================================== */

const chatWindow = document.getElementById("chat-window");
const chatInput = document.getElementById("chat-input");

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
    hablar(reply);
  } catch (e) {
    addMessage("Error de conexión con Brock.", "bot");
  }
}

document.getElementById("chat-form").addEventListener("submit", e => {
  e.preventDefault();

  const msg = chatInput.value.trim();
  if (!msg) return;

  addMessage(msg, "user");
  chatInput.value = "";
  enviarAIA(msg);
});

/* ==========================================================
   ELEMENTOS DEL ASISTENTE (JARVIS)
   ========================================================== */

const estadoElem = document.getElementById("asistente-estado");
const botonVoz = document.getElementById("activar-voz");
const asistenteBox = document.getElementById("asistente-box");
const jarvisAnim = document.getElementById("jarvis-anim");

function setEstado(texto, clase) {
  estadoElem.textContent = texto;

  asistenteBox.classList.remove(
    "asistente-escuchando",
    "asistente-hablando",
    "asistente-inactivo"
  );

  asistenteBox.classList.add(clase);
}

/* ==========================================================
   TTS – VOZ MASCULINA
   ========================================================== */

let speaking = false;

function vozMasculina() {
  const voces = speechSynthesis.getVoices();
  const male = voces.find(v =>
    v.lang.startsWith("es") &&
    (v.name.toLowerCase().includes("hombre") ||
     v.name.toLowerCase().includes("miguel") ||
     v.name.toLowerCase().includes("carlos"))
  );
  return male || voces.find(v => v.lang.startsWith("es")) || voces[0];
}

function hablar(texto) {
  speechSynthesis.cancel();
  speaking = true;

  if (escuchando && reconocimiento) reconocimiento.stop();

  setEstado("Brock está hablando…", "asistente-hablando");

  const u = new SpeechSynthesisUtterance(cleanText(texto));
  u.lang = "es-ES";
  u.pitch = 0.92;
  u.rate = 1.05;
  u.voice = vozMasculina();

  u.onend = () => {
    speaking = false;
    if (escuchando) {
      setEstado("Brock está escuchando…", "asistente-escuchando");
      setTimeout(() => reconocimiento.start(), 200);
    }
  };

  speechSynthesis.speak(u);
}

/* ==========================================================
   STT – RECONOCIMIENTO DE VOZ
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
    setEstado("Brock está escuchando… (di OK BROCK)", "asistente-escuchando");
  };

  reconocimiento.onerror = e => console.warn("Error STT:", e);

  reconocimiento.onend = () => {
    if (escuchando && !speaking) reconocimiento.start();
  };

  reconocimiento.onresult = ev => {
    if (!escuchando) return;
    if (speaking) return;

    const text = ev.results[ev.results.length - 1][0].transcript.toLowerCase().trim();
    console.log("Oído:", text);

    if (!text.includes("brock")) return;

    let comando = text
      .replace("ok brock", "")
      .replace("oye brock", "")
      .replace("hey brock", "")
      .replace("brock", "")
      .trim();

    if (comando.length === 0) {
      hablar("Aquí estoy, ¿qué necesitas?");
      return;
    }

    addMessage(comando, "user");
    enviarAIA(comando);
  };
}

/* ==========================================================
   ACTIVAR / DESACTIVAR
   ========================================================== */

function activarEscucha() {
  escuchando = true;
  initRecon();
  reconocimiento.start();
  botonVoz.textContent = "🛑 Desactivar Brock";
  setEstado("Brock está escuchando…", "asistente-escuchando");
}

function desactivarEscucha() {
  escuchando = false;
  if (reconocimiento) reconocimiento.stop();
  speechSynthesis.cancel();
  botonVoz.textContent = "🎤 Activar Brock";
  setEstado("Brock está inactivo", "asistente-inactivo");
}

botonVoz.addEventListener("click", () => {
  escuchando ? desactivarEscucha() : activarEscucha();
});

/* ==========================================================
   AUTO ACTIVACIÓN
   ========================================================== */

window.addEventListener("load", () => {
  activarEscucha();
  speechSynthesis.onvoiceschanged = () => vozMasculina();
});
