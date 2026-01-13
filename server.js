import express, { json } from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";

dotenv.config();

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(json({ limit: "1mb" }));

// ===============================
// SIGNOS VITALES
// ===============================
let lastVitals = {
  heart_rate: null,
  spo2: null,
  temperature: null,
  timestamp: null,
};

app.post("/api/vitals", (req, res) => {
  const { heart_rate, spo2, temperature } = req.body;

  lastVitals = {
    heart_rate,
    spo2,
    temperature,
    timestamp: new Date().toISOString(),
  };

  console.log("🟢 Signos vitales recibidos:", lastVitals);
  res.json({ ok: true });
});

app.get("/api/getVitals", (req, res) => {
  res.json(lastVitals);
});

// ===============================
// DIAGNÓSTICO BÁSICO
// ===============================
function generarDiagnostico(v) {
  if (!v.heart_rate || !v.spo2 || !v.temperature) {
    return "Aún no tengo suficientes datos del paciente.";
  }

  let respuesta = "";

  if (v.heart_rate < 60) {
    respuesta += "El ritmo cardíaco está algo bajo. ";
  } else if (v.heart_rate <= 100) {
    respuesta += "El ritmo cardíaco está dentro de un rango normal. ";
  } else {
    respuesta += "El ritmo cardíaco está elevado. ";
  }

  if (v.spo2 >= 87) {
    respuesta += "La oxigenación es adecuada para esta altitud. ";
  } else if (v.spo2 >= 83) {
    respuesta += "La oxigenación muestra hipoxia leve. ";
  } else {
    respuesta += "La oxigenación es baja y requiere atención. ";
  }

  if (v.temperature >= 36 && v.temperature <= 37) {
    respuesta += "La temperatura corporal es normal.";
  } else if (v.temperature < 36) {
    respuesta += "La temperatura está por debajo de lo normal.";
  } else if (v.temperature <= 38) {
    respuesta += "Hay presencia de febrícula.";
  } else {
    respuesta += "Existe fiebre que debe vigilarse.";
  }

  return respuesta;
}
function generarRecomendaciones(v) {
  if (!v.heart_rate || !v.spo2 || !v.temperature) {
    return "Aún no puedo darte recomendaciones completas porque faltan datos de tus signos vitales.";
  }

  let r = "";

  // ❤️ CORAZÓN
  if (v.heart_rate > 100) {
    r += "Te recomiendo descansar, evitar esfuerzos físicos intensos y mantenerte hidratado. ";
  } else if (v.heart_rate < 60) {
    r += "Evita cambios bruscos de postura y mantente atento a mareos o fatiga. ";
  } else {
    r += "Puedes realizar actividades ligeras como caminar o estiramientos suaves. ";
  }

  // 🫁 OXIGENACIÓN
  if (v.spo2 < 85) {
    r += "Es importante que descanses, respires profundamente y evites lugares cerrados o con poco oxígeno. ";
  } else if (v.spo2 < 90) {
    r += "Procura respirar lentamente, mantener una buena postura y evitar esfuerzos prolongados. ";
  } else {
    r += "Tu oxigenación permite realizar actividades normales sin exigirte demasiado. ";
  }

  // 🌡️ TEMPERATURA
  if (v.temperature >= 38.5) {
    r += "Mantente en reposo, toma líquidos y evita el ejercicio hasta que la temperatura disminuya. ";
  } else if (v.temperature >= 37.5) {
    r += "Descansa más de lo habitual y evita el frío o cambios bruscos de temperatura. ";
  } else if (v.temperature < 36) {
    r += "Abrígate bien y evita exponerte a corrientes de aire o ambientes fríos. ";
  }

  return r;
}
function recomendacionesAlimentacion(v) {
  if (!v.heart_rate || !v.spo2 || !v.temperature) {
    return "Cuando tenga todos tus signos vitales podré recomendarte mejor tu alimentación.";
  }

  let a = "";

  if (v.heart_rate > 100) {
    a += "Evita café, bebidas energéticas y comidas muy grasosas. ";
  }

  if (v.temperature >= 37.8) {
    a += "Prioriza alimentos ligeros como sopas, frutas, verduras y líquidos abundantes. ";
  }

  if (v.spo2 < 88) {
    a += "Consume alimentos ricos en hierro como lentejas, espinaca y carnes magras. ";
  }

  a += "En general, mantén una alimentación balanceada, evita el alcohol y reduce el consumo de sal.";

  return a;
}

// ===============================
// ASISTENTE INTELIGENTE LOCAL
// ===============================
app.post("/api/chat", (req, res) => {
  const { message } = req.body;
  const texto = message.toLowerCase();

  let reply = "";

  if (texto.includes("hola") || texto.includes("buenas")) {
    reply = "Hola, soy Brock. Estoy aquí para ayudarte a cuidar tu salud.";
  }
  else if (texto.includes("como estoy") || texto.includes("mi estado")) {
    reply = generarDiagnostico(lastVitals);
  }
  else if (texto.includes("recomendacion") || texto.includes("que hago")) {
    reply = generarRecomendaciones(lastVitals);
  }
  else if (texto.includes("comer") || texto.includes("aliment")) {
    reply = recomendacionesAlimentacion(lastVitals);
  }
  else if (texto.includes("todo") || texto.includes("resumen")) {
    reply =
      generarDiagnostico(lastVitals) +
      " " +
      generarRecomendaciones(lastVitals) +
      " En cuanto a alimentación, " +
      recomendacionesAlimentacion(lastVitals);
  }
  else {
    reply =
      "Soy Brock, un asistente de salud. Puedo evaluar tu estado, darte recomendaciones y orientarte sobre alimentación según tus signos vitales.";
  }

  res.json({ reply });
});

// ===============================
// FRONTEND
// ===============================
app.use(express.static(__dirname));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`🚀 VitalIA local funcionando en puerto ${PORT}`);
});
