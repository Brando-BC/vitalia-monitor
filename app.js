console.log("VitalIA + Brock inicializado correctamente...");

function cleanText(t) {
  if (!t) return "";
  return t.replace(/[*_`>#-]/g, " ").replace(/\s+/g, " ").trim();
}

async function obtenerDatos() {
  try {
    const res = await fetch("/api/getVitals");
    return await res.json();
  } catch { return null; }
}

function actualizarTarjetas(v) {
  if (!v || !v.heart_rate) return;

  document.getElementById("hr-value").textContent   = `${v.heart_rate} bpm`;
  document.getElementById("spo2-value").textContent = `${v.spo2} %`;
  document.getElementById("temp-value").textContent = `${v.temperature.toFixed(1)} °C`;

  const hr = document.getElementById("card-hr");
  const sp = document.getElementById("card-spo2");
  const tp = document.getElementById("card-temp");

  [hr, sp, tp].forEach(x => x.className = "card");

  if (v.heart_rate < 60) hr.classList.add("estado-amarillo");
  else if (v.heart_rate <= 100) hr.classList.add("estado-verde");
  else hr.classList.add("estado-rojo");

  if (v.spo2 >= 87) sp.classList.add("estado-verde");
  else if (v.spo2 >= 83) sp.classList.add("estado-amarillo");
  else sp.classList.add("estado-rojo");

  if (v.temperature <= 37.0) tp.classList.add("estado-verde");
  else if (v.temperature <= 38.0) tp.classList.add("estado-amarillo");
  else tp.classList.add("estado-rojo");
}

function generarDiagnosticoLocal(v) {
  if (!v) return "Aún no tengo suficientes datos.";

  let m = [];

  if (v.heart_rate < 60) m.push("Ritmo cardíaco bajo.");
  else if (v.heart_rate <= 100) m.push("Ritmo cardíaco dentro de lo normal.");
  else m.push("Ritmo cardíaco elevado.");

  if (v.spo2 >= 87) m.push("Oxigenación adecuada para esta altitud.");
  else if (v.spo2 >= 83) m.push("Hipoxia leve.");
  else if (v.spo2 >= 79) m.push("Hipoxia moderada.");
  else m.push("Hipoxia severa.");

  const t = v.temperature;
  if (t <= 37.0) m.push("Temperatura normal.");
  else if (t <= 38.0) m.push("Febrícula.");
  else if (t <= 38.4) m.push("Fiebre leve.");
  else if (t <= 39.0) m.push("Fiebre moderada.");
  else m.push("Fiebre alta.");

  return m.join(" ");
}

function actualizarDiagnosticoTexto(v) {
  document.getElementById("diag-text").textContent = generarDiagnosticoLocal(v);
}

let dHR = [], dS = [], dT = [];
const LIM = 40;

function crearGrafico(id, color) {
  return new Chart(document.getElementById(id), {
    type: "line",
    data: { labels: [], datasets: [{ data: [], borderColor: color, borderWidth: 2, pointRadius: 0, tension: 0.25 }] },
    options: { animation: false, scales: { x: { display: false } }, plugins: { legend: { display: false } } }
  });
}

const gHR = crearGrafico("chartHR", "#ff6b6b");
const gSO = crearGrafico("chartSPO2", "#4fc3f7");
const gTP = crearGrafico("chartTEMP", "#f6c343");

function updateChart(g, arr, val) {
  arr.push(val);
  if (arr.length > LIM) arr.shift();
  g.data.labels = arr.map((_, i) => i);
  g.data.datasets[0].data = arr;
  g.update();
}

async function loop() {
  const v = await obtenerDatos();
  if (!v) return;

  actualizarTarjetas(v);
  actualizarDiagnosticoTexto(v);
  updateChart(gHR, dHR, v.heart_rate);
  updateChart(gSO, dS, v.spo2);
  updateChart(gTP, dT, v.temperature);
}

setInterval(loop, 2000);

const chatWindow = document.getElementById("chat-window");
const chatInput  = document.getElementById("chat-input");

function addMessage(txt, from = "bot") {
  const d = document.createElement("div");
  d.className = `message ${from}`;
  d.innerHTML = `<span>${txt}</span>`;
  chatWindow.appendChild(d);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

async function enviarAIA(txt) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: txt })
  });

  const data = await res.json();
  const reply = cleanText(data.reply);

  addMessage(reply, "bot");
  hablar(reply);
}

document.getElementById("chat-form").addEventListener("submit", e => {
  e.preventDefault();
  const msg = chatInput.value.trim();
  if (!msg) return;
  addMessage(msg, "user");
  chatInput.value = "";
  enviarAIA(msg);
});

let speaking = false;

function vozMasculina() {
  const v = speechSynthesis.getVoices();
  const male = v.find(x => x.lang.startsWith("es") &&
    (x.name.toLowerCase().includes("male") ||
     x.name.toLowerCase().includes("hombre") ||
     x.name.toLowerCase().includes("miguel") ||
     x.name.toLowerCase().includes("carlos") ||
     x.name.toLowerCase().includes("jorge")));
  return male || v.find(x => x.lang.startsWith("es")) || v[0];
}

function hablar(txt) {
  speechSynthesis.cancel();
  speaking = true;
  if (escuchando && reconocimiento) reconocimiento.stop();

  document.getElementById("jarvis-anim").style.opacity = 1;
  document.getElementById("asistente-estado").textContent = "Brock está hablando…";

  const u = new SpeechSynthesisUtterance(cleanText(txt));
  u.lang = "es-ES";
  u.pitch = 0.95;
  u.rate = 1.03;
  u.voice = vozMasculina();

  u.onend = () => {
    speaking = false;
    document.getElementById("jarvis-anim").style.opacity = 0.3;
    document.getElementById("asistente-estado").textContent = "Brock está escuchando…";
    if (escuchando) setTimeout(() => reconocimiento.start(), 250);
  };

  speechSynthesis.speak(u);
}

let reconocimiento = null;
let escuchando = false;
let modoActivo = false;

const activadores = [
  "brock","brok","proc","block","bro","ok bro",
  "okay bro","ok brock","oye brock","hey brock"
];

function initRecon() {
  const R = window.SpeechRecognition || window.webkitSpeechRecognition;
  reconocimiento = new R();
  reconocimiento.lang = "es-ES";
  reconocimiento.continuous = true;
  reconocimiento.interimResults = false;

  reconocimiento.onresult = ev => {
    if (!escuchando || speaking) return;

    let t = ev.results[ev.results.length - 1][0].transcript.toLowerCase().trim();
    console.log("Oído:", t);

    if (t.includes("apágate") || t.includes("apagate") || t.includes("desactívate")) {
      modoActivo = false;
      hablar("De acuerdo, estaré en silencio.");
      return;
    }

    if (t.includes("detente") || t.includes("cállate")) {
      speechSynthesis.cancel();
      speaking = false;
      return;
    }

    const activo = activadores.some(a => t.includes(a));
    let cmd = t;
    activadores.forEach(a => cmd = cmd.replace(a, ""));
    cmd = cmd.trim();

    if (activo && cmd.length === 0) {
      modoActivo = true;
      hablar("Aquí estoy, dime.");
      return;
    }

    if (activo && cmd.length > 0) {
      modoActivo = true;
      addMessage(cmd, "user");
      enviarAIA(cmd);
      return;
    }

    if (modoActivo) {
      addMessage(t, "user");
      enviarAIA(t);
    }
  };

  reconocimiento.onend = () => {
    if (escuchando && !speaking) reconocimiento.start();
  };
}

const botonVoz = document.getElementById("activar-voz");

function activarEscucha() {
  escuchando = true;
  modoActivo = false;
  initRecon();
  reconocimiento.start();
  botonVoz.textContent = "🛑 Desactivar Brock";
  document.getElementById("asistente-estado").textContent = "Brock está escuchando…";
}

function desactivarEscucha() {
  escuchando = false;
  modoActivo = false;
  reconocimiento.stop();
  speechSynthesis.cancel();
  botonVoz.textContent = "🎤 Activar Brock";
  document.getElementById("asistente-estado").textContent = "Brock está inactivo";
  document.getElementById("jarvis-anim").style.opacity = 0;
}

botonVoz.addEventListener("click", () => {
  escuchando ? desactivarEscucha() : activarEscucha();
});

window.addEventListener("load", () => {
  speechSynthesis.onvoiceschanged = () => vozMasculina();
  activarEscucha();
});

