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
// SIGNOS VITALES + HISTORIAL
// ===============================
let lastVitals = null;
let vitalsHistory = [];
const MAX_HISTORY = 60;

app.post("/api/vitals", (req, res) => {
  const { heart_rate, spo2, temperature } = req.body;

  const registro = {
    heart_rate,
    spo2,
    temperature,
    timestamp: Date.now()
  };

  lastVitals = registro;
  vitalsHistory.push(registro);

  if (vitalsHistory.length > MAX_HISTORY) {
    vitalsHistory.shift();
  }

  console.log("🟢 Signos vitales:", registro);
  res.json({ ok: true });
});

app.get("/api/getVitals", (req, res) => {
  res.json(lastVitals || {});
});

// ===============================
// DIAGNÓSTICO
// ===============================
function generarDiagnostico(v) {
  if (!v) return "Aún no tengo suficientes datos del paciente.";

  let r = "";

  if (v.heart_rate < 60) r += "El ritmo cardíaco está bajo. ";
  else if (v.heart_rate <= 100) r += "El ritmo cardíaco está dentro del rango normal. ";
  else r += "El ritmo cardíaco está elevado. ";

  if (v.spo2 >= 87) r += "La oxigenación es adecuada para esta altitud. ";
  else if (v.spo2 >= 83) r += "La oxigenación indica hipoxia leve. ";
  else r += "La oxigenación es baja y requiere atención. ";

  if (v.temperature <= 37) r += "La temperatura es normal.";
  else if (v.temperature <= 38) r += "Hay febrícula.";
  else if (v.temperature <= 39) r += "Hay fiebre moderada.";
  else r += "Hay fiebre alta.";

  return r;
}

// ===============================
// RECOMENDACIONES
// ===============================
function generarRecomendaciones(v) {
  if (!v) return "Aún no puedo darte recomendaciones.";

  let r = "";

  if (v.heart_rate > 100)
    r += "Evita esfuerzos físicos y descansa más de lo habitual. ";
  else if (v.heart_rate < 60)
    r += "Evita cambios bruscos de postura. ";
  else
    r += "Puedes realizar actividades ligeras. ";

  if (v.spo2 < 85)
    r += "Descansa y evita ambientes cerrados o con poco oxígeno. ";
  else if (v.spo2 < 90)
    r += "Respira lentamente y evita sobreesfuerzos. ";

  if (v.temperature >= 38.5)
    r += "Mantente en reposo e hidrátate bien. ";
  else if (v.temperature < 36)
    r += "Abrígate y evita el frío. ";

  return r;
}

function recomendacionesAlimentacion(v) {
  if (!v) return "Aún no puedo recomendarte alimentación.";

  let a = "";

  if (v.heart_rate > 100)
    a += "Evita café, bebidas energéticas y comidas muy grasosas. ";

  if (v.temperature >= 37.8)
    a += "Prefiere sopas, frutas y alimentos ligeros. ";

  if (v.spo2 < 88)
    a += "Consume alimentos ricos en hierro como lentejas y carnes magras. ";

  a += "Mantén una dieta balanceada y evita el alcohol.";

  return a;
}

// ===============================
// RIESGO Y ALERTAS
// ===============================
function evaluarRiesgo(v) {
  if (!v) return "desconocido";

  if (v.spo2 < 80 || v.temperature >= 39.5 || v.heart_rate > 130)
    return "crítico";
  if (v.spo2 < 85 || v.temperature >= 38.5 || v.heart_rate > 110)
    return "alto";
  if (v.spo2 < 90 || v.temperature >= 37.5 || v.heart_rate > 100)
    return "medio";
  return "bajo";
}

function generarAlerta(v) {
  const r = evaluarRiesgo(v);

  if (r === "crítico")
    return "Alerta urgente. Busca atención médica de inmediato.";
  if (r === "alto")
    return "Advertencia importante. Descansa y mantente en observación.";
  if (r === "medio")
    return "Aviso preventivo. Cuida tu cuerpo y evita exigirte.";

  return "No se detectan alertas actualmente.";
}

// ===============================
// PREDICCIÓN SIMPLE
// ===============================
function prediccionSimple() {
  if (vitalsHistory.length < 6)
    return "Aún no hay suficientes datos para evaluar una tendencia.";

  const ult = vitalsHistory.slice(-6);

  let score = 0;
  if (ult[5].heart_rate < ult[0].heart_rate) score++;
  if (ult[5].spo2 > ult[0].spo2) score++;
  if (ult[5].temperature < ult[0].temperature) score++;

  if (score >= 2)
    return "La tendencia es positiva. Hay signos de mejoría.";
  if (score === 1)
    return "Tu estado se mantiene relativamente estable.";
  return "La tendencia no es favorable. Algunos valores empeoran.";
}

// ===============================
// UTILIDAD
// ===============================
function contiene(texto, palabras) {
  return palabras.some(p => texto.includes(p));
}

// ===============================
// ASISTENTE INTELIGENTE (CATÁLOGO)
// ===============================
app.post("/api/chat", (req, res) => {
  const text = req.body.message.toLowerCase();
  let reply = "";

  if (contiene(text, ["Cómo estoy", "Cómo estoy hoy", "Cuál es mi estado", "Cómo se encuentra mi cuerpo", "Estoy bien", "Mi estado es normal", "Qué tal están mis signos", "Evalúame"
                     , "Dime cómo estoy", "Cómo me siento según mis signos", "Mi cuerpo está estable", "Todo está bien conmigo"])) {
    reply = generarDiagnostico(lastVitals);
  }
  else if (contiene(text, ["Cuál es mi riesgo", "Tengo algún riesgo", "Mi estado es peligroso", "Es grave lo que tengo", "Estoy en peligro", "Qué tan serio es mi estado", "Debo preocuparme",
                     "Mi condición es estable", "Mi riesgo es alto", "Mi riesgo es bajo", "Mi estado es crítico", "Hay algo que no esté bien", "grave"])) {
    reply = `Tu nivel de riesgo actual es ${evaluarRiesgo(lastVitals)}.`;
  }
  else if (contiene(text, [
  "Hay alguna alerta",
  "Tengo una alerta",
  "Hay algo urgente",
  "Necesito ayuda médica",
  "Debo ir al médico",
  "Hay algo anormal",
  "Hay alguna advertencia",
  "Es una emergencia",
  "Debo buscar ayuda",
  "Mi situación es urgente",
  "Hay peligro ahora"
]
)) {
    reply = generarAlerta(lastVitals);
  }
  else if (contiene(text, [
  "Qué debo hacer",
  "Qué me recomiendas",
  "Dame recomendaciones",
  "Cómo debo cuidarme",
  "Qué puedo hacer ahora",
  "Qué no debo hacer",
  "Debo descansar",
  "Puedo hacer ejercicio",
  "Puedo salir",
  "Puedo trabajar",
  "Debo evitar esfuerzos",
  "Puedo caminar",
  "Debo quedarme en reposo"
]
)) {
    reply = generarRecomendaciones(lastVitals);
  }
  else if (contiene(text, [
  "Qué puedo comer",
  "Qué no debo comer",
  "Dame recomendaciones de comida",
  "Qué alimentos me ayudan",
  "Debo evitar algo en la comida",
  "Puedo tomar café",
  "Puedo tomar alcohol",
  "Qué debo beber",
  "Qué comer hoy",
  "Qué alimentos me recomiendas",
  "Puedo comer normal",
  "Debo cambiar mi dieta"
]
)) {
    reply = recomendacionesAlimentacion(lastVitals);
  }
  else if (contiene(text, [
  "Muéstrame mi historial",
  "Historial de signos vitales",
  "Cómo he estado hoy",
  "He mejorado",
  "He empeorado",
  "Evolución de mis signos",
  "Cambios en mis valores",
  "Comparación de hoy",
  "Cómo han cambiado mis signos",
  "Mis valores están subiendo o bajando",
  "Cómo he evolucionado"
]
)) {
    reply = `Tengo registrados ${vitalsHistory.length} registros recientes de tus signos vitales.`;
  }
  else if (contiene(text, [
  "Voy mejorando",
  "Voy empeorando",
  "Cómo voy",
  "Qué tendencia tengo",
  "Mi estado está mejorando",
  "Cómo estaré si sigo así",
  "Estoy estable",
  "Hay progreso",
  "Mi salud está mejorando",
  "Voy por buen camino",
  "Qué pasará si sigo igual"
]
)) {
    reply = prediccionSimple();
  }
  else if (contiene(text, [
  "Dame un resumen",
  "Resumen completo",
  "Dame todo",
  "Todo",
  "Resumen de mi estado",
  "Informe general",
  "Evaluación completa",
  "Estado general completo",
  "Resumen clínico",
  "Informe de salud",
  "Síntesis de mi estado"
]
)) {
    reply = `
${generarDiagnostico(lastVitals)}
${generarAlerta(lastVitals)}
${prediccionSimple()}
Recomendaciones: ${generarRecomendaciones(lastVitals)}
Alimentación: ${recomendacionesAlimentacion(lastVitals)}
    `.replace(/\n/g, " ");
  }
  else {
    reply =
      "Puedo ayudarte con tu estado de salud, riesgo, alertas, recomendaciones, alimentación, historial y evolución.";
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
  console.log(`🚀 VitalIA + Brock local funcionando en puerto ${PORT}`);
});
