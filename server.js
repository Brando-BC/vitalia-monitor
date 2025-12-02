// ======================================================
// DEPENDENCIAS
// ======================================================
import express, { json } from "express";
import cors from "cors";
import dotenv from "dotenv";
import path from "path";
import { fileURLToPath } from "url";
import { GoogleGenerativeAI } from "@google/generative-ai";

// ======================================================
// CONFIGURAR .ENV
// ======================================================
dotenv.config();

// ======================================================
// CONFIGURAR RUTAS DE ARCHIVOS
// ======================================================
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// ======================================================
// INICIALIZAR APP
// ======================================================
const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(json({ limit: "1mb" }));

// ======================================================
// IA GEMINI
// ======================================================
const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
const modelo = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// ======================================================
// VARIABLES INTERNAS — SIGNOS VITALES
// ======================================================
let lastVitals = {
  heart_rate: null,
  spo2: null,
  temperature: null,
  timestamp: null,
};

// ======================================================
// RECIBIR DATOS DEL ESP32
// ======================================================
app.post("/api/vitals", (req, res) => {
  const { heart_rate, spo2, temperature } = req.body;

  lastVitals = {
    heart_rate,
    spo2,
    temperature,
    timestamp: new Date().toISOString(),
  };

  console.log("🟢 Nuevos signos vitales recibidos:", lastVitals);
  res.json({ ok: true });
});

// ======================================================
// ENVIAR DATOS AL FRONTEND
// ======================================================
app.get("/api/getVitals", (req, res) => {
  res.json(lastVitals);
});

// ======================================================
// GENERADOR AUTOMÁTICO DE DIAGNÓSTICO (versión médica 2025)
// ======================================================
function generarDiagnostico(v) {
  if (!v.heart_rate || !v.spo2 || !v.temperature) {
    return "Aún no tengo suficientes datos del paciente.";
  }

  const hr = v.heart_rate;
  const spo2 = v.spo2;
  const temp = v.temperature;

  let msg = [];

  // ======================================================
  // RITMO CARDÍACO — ADULTO (fuente: MedlinePlus / NCBI)
  // ======================================================
  if (hr < 60) msg.push("El ritmo cardíaco está por debajo de lo normal.");
  else if (hr <= 100) msg.push("El ritmo cardíaco está dentro del rango normal.");
  else msg.push("El ritmo cardíaco está elevado.");

  // ======================================================
  // OXIGENACIÓN ADAPTADA A ALTITUD 3276 m.s.n.m
  // Tabla: referencia clínica para altura
  // NORMAL → 87–96%
  // Hipoxia leve → 83–86%
  // Hipoxia moderada → 79–82%
  // Hipoxia severa → <79%
  // ======================================================
  if (spo2 >= 87 && spo2 <= 96) {
    msg.push("La oxigenación es normal para esta altitud.");
  }
  else if (spo2 >= 83 && spo2 <= 86) {
    msg.push("Hay signos de hipoxia leve.");
  }
  else if (spo2 >= 79 && spo2 <= 82) {
    msg.push("La oxigenación sugiere hipoxia moderada.");
  }
  else if (spo2 < 79) {
    msg.push("Oxigenación compatible con hipoxia severa. Escucha tu cuerpo y considera descansar.");
  }

  // ======================================================
  // TEMPERATURA (según tabla clínica)
  // Normal: 36.0–37.0°C
  // Febrícula: 37.1–38.0°C
  // Fiebre leve: 38.1–38.4°C
  // Fiebre moderada: 38.5–39.0°C
  // Fiebre alta: >39.0°C
  // ======================================================
  if (temp >= 36.0 && temp <= 37.0) {
    msg.push("La temperatura corporal está en el rango normal.");
  }
  else if (temp >= 37.1 && temp <= 38.0) {
    msg.push("Hay febrícula.");
  }
  else if (temp >= 38.1 && temp <= 38.4) {
    msg.push("Hay fiebre leve.");
  }
  else if (temp >= 38.5 && temp <= 39.0) {
    msg.push("Hay fiebre moderada.");
  }
  else if (temp > 39.0) {
    msg.push("Hay fiebre alta. Se recomienda vigilancia cercana.");
  }
  else if (temp < 36.0) {
    msg.push("La temperatura está por debajo del rango normal.");
  }

  return msg.join(" ");
}

// ======================================================
// CHAT CON IA — BROCK 2025
// ======================================================
app.post("/api/chat", async (req, res) => {
  const { message } = req.body;

  const diagnostico = generarDiagnostico(lastVitals);

  const prompt = `
Eres BROCK, un asistente virtual masculino, cálido, natural y profesional.
Hablas como una persona real: natural, sin símbolos, sin listas, sin markdown
y sin asteriscos. Tu tono es calmado y confiable.

INSTRUCCIONES DE COMPORTAMIENTO:

• Si la pregunta es sobre salud, analiza los signos vitales y responde con
  seriedad, claridad y tranquilidad, como un asistente médico humano.

• Si la pregunta NO es sobre salud, también puedes responder, pero menciona
  de manera natural que tu especialidad es la salud antes de continuar.

• Habla siempre como si estuvieras teniendo una conversación real. 
  Nada de listas, nada de guiones, nada de formatos raros.

• Reformula cualquier frase que parezca escrita por una IA. 
  Suena humano, masculino y profesional.

------------------------------------------------
DATOS DEL PACIENTE:
Ritmo cardíaco: ${lastVitals.heart_rate}
Oxigenación: ${lastVitals.spo2}
Temperatura: ${lastVitals.temperature}

Evaluación automática:
${diagnostico}
------------------------------------------------

Mensaje del usuario:
${message}

Responde como Brock, de forma humana, cálida y profesional.
  `;

  try {
    const result = await modelo.generateContent(prompt);
    const text = result.response.text();
    res.json({ reply: text });

  } catch (error) {
    console.error("❌ Error con Gemini:", error);
    res.json({ reply: "Hubo un problema con la IA. Intenta nuevamente." });
  }
});

// ======================================================
// SERVIR FRONTEND ESTÁTICO
// ======================================================
app.use(express.static(__dirname));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ======================================================
// INICIAR SERVIDOR
// ======================================================
app.listen(PORT, () => {
  console.log(`🚀 Servidor VitalIA escuchando en puerto ${PORT}`);
});
