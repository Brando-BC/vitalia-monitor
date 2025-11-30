/* ==========================================================
   VitalIA — Datos random para pruebas
   ========================================================== */

// Función para simular signos vitales realistas
function generarSignosRandom() {
  return {
    hr: Math.floor(Math.random() * (110 - 60 + 1)) + 60,      // 60 a 110 bpm
    spo2: Math.floor(Math.random() * (99 - 94 + 1)) + 94,     // 94% a 99%
    temp: (Math.random() * (37.8 - 36.0) + 36.0).toFixed(1)    // 36.0 a 37.8 °C
  };
}

/* ==========================================================
   IA DE DIAGNÓSTICO (Simulada)
   ========================================================== */

function diagnosticoIA(hr, spo2, temp) {
  let mensajes = [];

  // Diagnóstico HR
  if (hr < 60) mensajes.push("El ritmo cardíaco está ligeramente bajo.");
  else if (hr <= 100) mensajes.push("El ritmo cardíaco está dentro de lo normal.");
  else mensajes.push("El ritmo cardíaco está un poco elevado, revisa si estás nervioso o en actividad.");

  // Diagnóstico SpO2
  if (spo2 >= 97) mensajes.push("Tu oxigenación es excelente.");
  else if (spo2 >= 94) mensajes.push("Tu oxigenación es aceptable.");
  else mensajes.push("Oxigenación baja, deberías observar si sientes dificultad para respirar.");

  // Diagnóstico temperatura
  if (temp < 37.5) mensajes.push("Tu temperatura corporal es normal.");
  else if (temp < 38.0) mensajes.push("Tienes febrícula (leve aumento de temperatura).");
  else mensajes.push("Presentas fiebre, observa otros síntomas.");

  return mensajes.join(" ");
}

/* ==========================================================
   ACTUALIZACIÓN AUTOMÁTICA DE TARJETAS
   ========================================================== */

function actualizarValores() {
  const datos = generarSignosRandom();

  document.getElementById("hr-value").textContent = datos.hr + " bpm";
  document.getElementById("spo2-value").textContent = datos.spo2 + " %";
  document.getElementById("temp-value").textContent = datos.temp + " °C";

  const diag = diagnosticoIA(datos.hr, datos.spo2, parseFloat(datos.temp));
  document.getElementById("diag-text").textContent = diag;
}

// Ejecutar al inicio y luego cada 3 segundos
actualizarValores();
setInterval(actualizarValores, 3000);

/* ==========================================================
   CHAT IA — Responde como Alexa (Simulado)
   ========================================================== */

const chatWindow = document.getElementById("chat-window");
const chatForm = document.getElementById("chat-form");
const chatInput = document.getElementById("chat-input");

// Agregar mensajes al chat
function addMessage(text, from = "bot") {
  const div = document.createElement("div");
  div.classList.add("message", from);

  const span = document.createElement("span");
  span.textContent = text;
  div.appendChild(span);

  chatWindow.appendChild(div);
  chatWindow.scrollTop = chatWindow.scrollHeight;
}

// Respuestas IA simuladas
function respuestaIA(texto) {
  const mensaje = texto.toLowerCase();

  // Chistes
  if (mensaje.includes("chiste")) {
    return "Claro 😄: ¿Qué le dice un bit al otro bit? — Nos vemos en el bus.";
  }

  // Saludos
  if (mensaje.includes("hola") || mensaje.includes("buenas")) {
    return "¡Hola! Estoy aquí para ayudarte. Puedes preguntarme sobre tu salud o cualquier otra cosa.";
  }

  // Preguntas generales
  if (mensaje.includes("cómo estás") || mensaje.includes("como estas")) {
    return "Estoy funcionando al 100% ⚡. ¿Y tú cómo te sientes hoy?";
  }

  // Pregunta sobre signos vitales
  if (mensaje.includes("salud") || mensaje.includes("signos") || mensaje.includes("cardiaco")) {
    return "Mis sensores virtuales dicen que tus signos vitales se están actualizando cada 3 segundos. Todo está bajo control 😎.";
  }

  // Default
  return "Interesante 🤔. Puedo contarte un chiste, hablar contigo o darte una idea general de tu salud. ¡Pregúntame algo!";
}

// Manejo del chat
chatForm.addEventListener("submit", (e) => {
  e.preventDefault();
  const texto = chatInput.value.trim();
  if (!texto) return;

  addMessage(texto, "user");       // mostrar mensaje del usuario
  chatInput.value = "";

  const respuesta = respuestaIA(texto);
  setTimeout(() => addMessage(respuesta, "bot"), 400);   // pequeña pausa estilo Alexa
});

// Mensaje inicial
addMessage("Hola 👋, soy la IA de VitalIA. Puedo hablar contigo y darte una idea general de tus signos vitales.");
