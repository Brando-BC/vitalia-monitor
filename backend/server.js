import express from "express";
import cors from "cors";
import bodyParser from "body-parser";
import dotenv from "dotenv";

// Cargar .env
dotenv.config({ path: "./.env" });

// SDK NUEVO (2025)
import { GoogleGenerativeAI } from "@google/generative-ai";

const app = express();
const PORT = process.env.PORT || 3000;

app.use(cors());
app.use(bodyParser.json());

// ======================================================
// CONFIGURAR GEMINI — API 2025
// ======================================================

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);

// 🔥 Modelo recomendado 2025 (rápido y estable)
// Alternativas:
// - "gemini-2.0-pro" para mayor inteligencia
// - "gemini-2.0-flash" para máxima velocidad
const modelo = genAI.getGenerativeModel({ model: "gemini-2.0-flash" });

// ======================================================
// VARIABLES PARA SIGNOS VITALES
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

  console.log("Nuevos signos vitales:", lastVitals);
  res.json({ ok: true });
});

// ======================================================
// GENERADOR AUTOMÁTICO DE DIAGNÓSTICO
// ======================================================

function generarDiagnostico(v) {
  if (!v.heart_rate) return "Aún no tengo suficientes datos del paciente.";

  let msg = [];

  if (v.heart_rate < 60) msg.push("Ritmo cardíaco bajo.");
  else if (v.heart_rate <= 100) msg.push("Ritmo cardíaco normal.");
  else msg.push("Ritmo cardíaco elevado.");

  if (v.spo2 >= 97) msg.push("Oxigenación excelente.");
  else if (v.spo2 >= 94) msg.push("Oxigenación aceptable.");
  else msg.push("Oxigenación baja.");

  if (v.temperature < 37.5) msg.push("Temperatura normal.");
  else if (v.temperature < 38) msg.push("Febrícula.");
  else msg.push("Fiebre detectada.");

  return msg.join(" ");
}

// ======================================================
// CHAT CON IA REAL (GEMINI 2025)
// ======================================================

app.post("/api/chat", async (req, res) => {
  const { message } = req.body;

  const diagnostico = generarDiagnostico(lastVitals);

  const prompt = `
Eres VitalIA, una IA médica moderna (2025) que responde con claridad,
calidez y precisión, similar a Alexa pero enfocada en salud.

Datos actuales del paciente:
- Ritmo cardíaco: ${lastVitals.heart_rate}
- SpO2: ${lastVitals.spo2}
- Temperatura: ${lastVitals.temperature}

Diagnóstico automático basado en parámetros médicos:
${diagnostico}

Si la pregunta NO es de salud:
Responde como un asistente amigable.

Pregunta del usuario:
${message}
`;

  try {
    const result = await modelo.generateContent(prompt);
    const text = result.response.text();
    res.json({ reply: text });

  } catch (error) {
    console.error("Error con Gemini:", error);
    res.json({ reply: "Error al usar IA real. Revisa tu API Key o el modelo." });
  }
});

// ======================================================
// INICIAR SERVIDOR
// ======================================================

app.listen(PORT, () => {
  console.log("Servidor IA (Gemini 2025) escuchando en puerto", PORT);
});
