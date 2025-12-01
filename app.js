/* ==========================================================
   CONFIGURACIÓN GENERAL
   ========================================================== */

console.log("VitalIA cargado correctamente...");

/* ==========================================================
   OBTENER DATOS DEL BACKEND /api/getVitals
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

  document.getElementById("hr-value").textContent = v.heart_rate + " bpm";
  document.getElementById("spo2-value").textContent = v.spo2 + " %";
  document.getElementById("temp-value").textContent = v.temperature + " °C";

  // Colores dinámicos
  const c_hr = document.getElementById("card-hr");
  const c_spo2 = document.getElementById("card-spo2");
  const c_temp = document.getElementById("card-temp");

  // Reset clases
  [c_hr, c_spo2, c_temp].forEach(c => {
    c.classList.remove("estado-verde", "estado-amarillo", "estado-rojo");
  });

  // HR
  if (v.heart_rate < 60) c_hr.classList.add("estado-amarillo");
  else if (v.heart_rate <= 100) c_hr.classList.add("estado-verde");
  else c_hr.classList.add("estado-rojo");

  // SpO2
  if (v.spo2 >= 97) c_spo2.classList.add("estado-verde");
  else if (v.spo2 >= 94) c_spo2.classList.add("estado-amarillo");
  else c_spo2.classList.add("estado-rojo");

  // Temperatura
  if (v.temperature < 37.5) c_temp.classList.add("estado-verde");
  else if (v.temperature < 38) c_temp.classList.add("estado-amarillo");
  else c_temp.classList.add("estado-rojo");
}

/* ==========================================================
   ACTUALIZAR DIAGNÓSTICO IA (AUTOMÁTICO)
   ========================================================== */

async function actualizarDiagnostico(v) {
  if (!v || !v.heart_rate) return;

  const diag = [];

  if (v.heart_rate < 60) diag.push("Ritmo cardíaco bajo.");
  else if (v.heart_rate <= 100) diag.push("Ritmo cardíaco normal.");
  else diag.push("Ritmo cardíaco elevado.");

  if (v.spo2 >= 97) diag.push("Oxigenación excelente.");
  else if (v.spo2 >= 94) diag.push("Oxigenación aceptable.");
  else diag.push("Oxigenación baja.");

  if (v.temperature < 37.5) diag.push("Temperatura normal.");
  else if (v.temperature < 38) diag.push("Febrícula.");
  else diag.push("Fiebre detectada.");

  document.getElementById("diag-text").textContent = diag.join(" ");
}

/* ==========================================================
   GRAFICAS Chart.js
   ========================================================== */

let datosHR = [];
let datosSPO2 = [];
let datosTEMP = [];

const limites = 40; // puntos visibles

function crearGrafico(id, label, color) {
  return new Chart(document.getElementById(id), {
    type: "line",
    data: {
      labels: [],
      datasets: [{
        label,
        data: [],
        borderColor: color,
        borderWidth: 2,
        pointRadius: 0
      }]
    },
    options: {
      scales: {
        x: { display: false },
        y: { beginAtZero: false }
      }
    }
  });
}

const gHR = crearGrafico("chartHR", "Ritmo cardíaco", "#ff6b6b");
const gSPO2 = crearGrafico("chartSPO2", "SpO₂", "#4fc3f7");
const gTEMP = crearGrafico("chartTEMP", "Temperatura", "#f6c343");

// Añadir un punto
function actualizarGrafico(grafico, arreglo, nuevoValor) {
  arreglo.push(nuevoValor);
  if (arreglo.length > limites) arreglo.shift();

  grafico.data.labels = arreglo.map((_, i) => i);
  grafico.data.datasets[0].data = arreglo;
  grafico.update();
}

/* ==========================================================
   LOOP PRINCIPAL — Actualización cada 2s
   ========================================================== */

async function loop() {
  const v = await obtenerDatos();
  if (!v) return;

  actualizarTarjetas(v);
  actualizarDiagnostico(v);

  actualizarGrafico(gHR, datosHR, v.heart_rate);
  actualizarGrafico(gSPO2, datosSPO2, v.spo2);
  actualizarGrafico(gTEMP, datosTEMP, v.temperature);
}

setInterval(loop, 2000);

/* ==========================================================
   CHAT IA REAL — /api/chat
   ========================================================== */

const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");

function addMessage(text, from = "bot") {
  const div = document.createElement("div");
  div.classList.add("message", from);

  const span = document.createElement("span");
  span.textContent = text;
  div.appendChild(span);

  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

chatForm.addEventListener("submit", async (e) => {
  e.preventDefault();

  const msg = chatInput.value.trim();
  if (!msg) return;

  addMessage(msg, "user");
  chatInput.value = "";

  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: msg })
  });

  const data = await res.json();
  addMessage(data.reply, "bot");

  hablar(data.reply);
});

/* ==========================================================
   ASISTENTE BROCK — Voz
   ========================================================== */

const estadoElem = document.getElementById("asistente-estado");
const botonVoz = document.getElementById("activar-voz");

let reconocimiento;
let escuchando = false;

// Voz masculina
function hablar(texto) {
  const voz = new SpeechSynthesisUtterance(texto);
  voz.lang = "es-ES";
  speechSynthesis.speak(voz);
}

function iniciarReconocimiento() {
  const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
  reconocimiento = new SpeechRecognition();
  reconocimiento.lang = "es-ES";

  reconocimiento.onresult = (event) => {
    const texto = event.results[0][0].transcript.toLowerCase();
    addMessage("🎤 " + texto, "user");

    if (texto.includes("ok brock") || texto.includes("hey brock")) {
      hablar("Estoy escuchando.");
      estadoElem.textContent = "Brock escuchando...";
      return;
    }

    enviarPregunta(texto);
  };

  reconocimiento.onend = () => {
    if (escuchando) reconocimiento.start();
  };
}

async function enviarPregunta(texto) {
  const res = await fetch("/api/chat", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ message: texto })
  });

  const data = await res.json();
  addMessage(data.reply, "bot");
  hablar(data.reply);
}

botonVoz.addEventListener("click", () => {
  if (!escuchando) {
    escuchando = true;
    estadoElem.textContent = "Brock está escuchando...";
    iniciarReconocimiento();
    reconocimiento.start();
  } else {
    escuchando = false;
    estadoElem.textContent = "Brock está inactivo";
    reconocimiento.stop();
  }
});
