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
// CHAT CON IA
// ======================================================
app.post("/api/chat", async (req, res) => {
  const { message } = req.body;

  const diagnostico = generarDiagnostico(lastVitals);

  const prompt = `
Eres VitalIA (Brock), un asistente de salud moderno.
Datos actuales:
- Ritmo cardíaco: ${lastVitals.heart_rate}
- SpO2: ${lastVitals.spo2}
- Temperatura: ${lastVitals.temperature}

Diagnóstico automático:
${diagnostico}

Pregunta del usuario:
${message}
`;

  try {
    const result = await modelo.generateContent(prompt);
    const text = result.response.text();
    res.json({ reply: text });

  } catch (error) {
    console.error("❌ Error con Gemini:", error);
    res.json({ reply: "Error al usar IA. Revisa API KEY." });
  }
});

// ======================================================
// SERVIR FRONTEND ESTÁTICO PARA RENDER
// ======================================================
app.use(express.static(path.join(__dirname)));

// Ruta por defecto → index.html
app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

// ======================================================
// INICIAR SERVIDOR
// ======================================================
app.listen(PORT, () => {
  console.log(`🚀 Servidor VitalIA escuchando en puerto ${PORT}`);
});
