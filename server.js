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
// DIAGNÓSTICO (AMIGABLE + CLÍNICO)
// ===============================
function generarDiagnostico(v) {
  if (!v)
    return "Aún no tengo suficientes datos para evaluar tu estado de salud. Cuando registre tus signos vitales podré ayudarte mejor.";

  let r = "Según los datos actuales, este es tu estado: ";

  if (v.heart_rate < 60)
    r += "tu ritmo cardíaco está un poco bajo, lo que puede provocar cansancio o mareos. ";
  else if (v.heart_rate <= 100)
    r += "tu ritmo cardíaco se encuentra dentro de un rango saludable. ";
  else
    r += "tu ritmo cardíaco está elevado, posiblemente por esfuerzo, estrés o fiebre. ";

  if (v.spo2 >= 87)
    r += "La oxigenación es adecuada considerando la altitud. ";
  else if (v.spo2 >= 83)
    r += "La oxigenación está ligeramente disminuida, lo que indica hipoxia leve. ";
  else
    r += "La oxigenación es baja y requiere especial atención. ";

  if (v.temperature < 36)
    r += "La temperatura corporal está por debajo de lo normal. ";
  else if (v.temperature <= 37)
    r += "La temperatura corporal es normal. ";
  else if (v.temperature <= 38)
    r += "Se observa una elevación leve de la temperatura. ";
  else if (v.temperature <= 39)
    r += "Presentas fiebre moderada. ";
  else
    r += "Presentas fiebre alta, lo cual es un signo importante de alerta. ";

  return r;
}

// ===============================
// RECOMENDACIONES GENERALES
// ===============================
function generarRecomendaciones(v) {
  if (!v)
    return "Todavía no puedo brindarte recomendaciones personalizadas. Registra primero tus signos vitales.";

  let r = "";

  if (v.heart_rate > 100)
    r += "Es recomendable descansar, evitar esfuerzos físicos y reducir el estrés. ";
  else if (v.heart_rate < 60)
    r += "Evita levantarte rápidamente y mantente atento a mareos o debilidad. ";
  else
    r += "Puedes realizar actividades suaves sin exigirte demasiado. ";

  if (v.spo2 < 85)
    r += "Descansa, ventila bien el ambiente y evita actividades demandantes. ";
  else if (v.spo2 < 90)
    r += "Controla tu respiración y evita sobreesfuerzos. ";

  if (v.temperature >= 38.5)
    r += "Permanece en reposo, hidrátate bien y controla la fiebre. ";
  else if (v.temperature < 36)
    r += "Abrígate adecuadamente y evita el frío. ";

  return r.trim();
}

// ===============================
// ALIMENTACIÓN
// ===============================
function recomendacionesAlimentacion(v) {
  if (!v)
    return "Aún no puedo recomendarte una alimentación específica sin tus signos vitales.";

  let a = "";

  if (v.heart_rate > 100)
    a += "Evita café, bebidas energéticas y alimentos muy grasosos. ";

  if (v.temperature >= 37.8)
    a += "Prefiere comidas ligeras como sopas, frutas y verduras. ";

  if (v.spo2 < 88)
    a += "Incluye alimentos ricos en hierro como lentejas, espinaca y carnes magras. ";

  a += "Mantén una dieta balanceada, buena hidratación y evita el alcohol.";

  return a;
}

// ===============================
// RIESGO
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

// ===============================
// ALERTAS
// ===============================
function generarAlerta(v) {
  const r = evaluarRiesgo(v);

  if (r === "crítico")
    return "🚨 Alerta crítica: busca atención médica inmediata.";
  if (r === "alto")
    return "⚠️ Advertencia importante: descansa y mantente en observación.";
  if (r === "medio")
    return "ℹ️ Aviso preventivo: cuida tu cuerpo y evita exigirte.";

  return "✅ No se detectan alertas importantes en este momento.";
}

// ===============================
// PREDICCIÓN SIMPLE
// ===============================
function prediccionSimple() {
  if (vitalsHistory.length < 6)
    return "Aún no hay suficientes datos para evaluar una tendencia clara.";

  const ult = vitalsHistory.slice(-6);
  let score = 0;

  if (ult[5].heart_rate < ult[0].heart_rate) score++;
  if (ult[5].spo2 > ult[0].spo2) score++;
  if (ult[5].temperature < ult[0].temperature) score++;

  if (score >= 2)
    return "La tendencia es positiva, se observan signos de mejoría.";
  if (score === 1)
    return "Tu estado se mantiene estable, sin cambios importantes.";

  return "La tendencia no es favorable, algunos valores han empeorado.";
}

// ===============================
// UTILIDAD
// ===============================
function contiene(texto, palabras) {
  return palabras.some(p => texto.includes(p.toLowerCase()));
}

// ===============================
// ASISTENTE INTELIGENTE (CATÁLOGO INTACTO)
// ===============================
app.post("/api/chat", (req, res) => {
  const text = req.body.message.toLowerCase();
  let reply = "";

  if (contiene(text, ["cómo estoy", "cómo estoy hoy", "cuál es mi estado", "cómo se encuentra mi cuerpo", "estoy bien",
    "mi estado es normal", "qué tal están mis signos", "evalúame", "dime cómo estoy",
    "cómo me siento según mis signos", "mi cuerpo está estable", "todo está bien conmigo"])) {
    reply = generarDiagnostico(lastVitals);
  }
  else if (contiene(text, ["cuál es mi riesgo", "tengo algún riesgo", "mi estado es peligroso", "es grave lo que tengo",
    "estoy en peligro", "qué tan serio es mi estado", "debo preocuparme", "mi condición es estable",
    "mi riesgo es alto", "mi riesgo es bajo", "mi estado es crítico", "hay algo que no esté bien", "grave"])) {
    reply = `Tu nivel de riesgo actual es ${evaluarRiesgo(lastVitals)}.`;
  }
  else if (contiene(text, ["hay alguna alerta", "tengo una alerta", "hay algo urgente", "necesito ayuda médica",
    "debo ir al médico", "hay algo anormal", "hay alguna advertencia", "es una emergencia",
    "debo buscar ayuda", "mi situación es urgente", "hay peligro ahora"])) {
    reply = generarAlerta(lastVitals);
  }
  else if (contiene(text, ["qué debo hacer", "qué me recomiendas", "dame recomendaciones", "cómo debo cuidarme",
    "qué puedo hacer ahora", "qué no debo hacer", "debo descansar", "puedo hacer ejercicio",
    "puedo salir", "puedo trabajar", "debo evitar esfuerzos", "puedo caminar", "debo quedarme en reposo"])) {
    reply = generarRecomendaciones(lastVitals);
  }
  else if (contiene(text, ["qué puedo comer", "qué no debo comer", "dame recomendaciones de comida",
    "qué alimentos me ayudan", "debo evitar algo en la comida", "puedo tomar café",
    "puedo tomar alcohol", "qué debo beber", "qué comer hoy", "qué alimentos me recomiendas",
    "puedo comer normal", "debo cambiar mi dieta"])) {
    reply = recomendacionesAlimentacion(lastVitals);
  }
  else if (contiene(text, ["muéstrame mi historial", "historial de signos vitales", "cómo he estado hoy",
    "he mejorado", "he empeorado", "evolución de mis signos", "cambios en mis valores",
    "comparación de hoy", "cómo han cambiado mis signos", "mis valores están subiendo o bajando",
    "cómo he evolucionado"])) {
    reply = `Tengo registrados ${vitalsHistory.length} controles recientes de tus signos vitales.`;
  }
  else if (contiene(text, ["voy mejorando", "voy empeorando", "cómo voy", "qué tendencia tengo",
    "mi estado está mejorando", "cómo estaré si sigo así", "estoy estable", "hay progreso",
    "mi salud está mejorando", "voy por buen camino", "qué pasará si sigo igual"])) {
    reply = prediccionSimple();
  }
  else if (contiene(text, ["dame un resumen", "resumen completo", "dame todo", "todo",
    "resumen de mi estado", "informe general", "evaluación completa",
    "estado general completo", "resumen clínico", "informe de salud", "síntesis de mi estado"])) {
    reply = `
${generarDiagnostico(lastVitals)}
${generarAlerta(lastVitals)}
${prediccionSimple()}
Recomendaciones: ${generarRecomendaciones(lastVitals)}
Alimentación: ${recomendacionesAlimentacion(lastVitals)}
    `.replace(/\n/g, " ");
  }
  else {
    reply = "Puedo ayudarte a evaluar tu estado de salud, riesgo, alertas, recomendaciones, alimentación y evolución.";
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
  console.log(`🚀 VitalIA funcionando correctamente en el puerto ${PORT}`);
});
