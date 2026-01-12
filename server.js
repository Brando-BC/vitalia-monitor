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
  res.json({ ok: true });
});

app.get("/api/getVitals", (req, res) => {
  res.json(lastVitals);
});

function generarDiagnostico(v) {
  if (!v.heart_rate || !v.spo2 || !v.temperature) {
    return "Aún no tengo suficientes datos del paciente.";
  }

  const hr = v.heart_rate;
  const spo2 = v.spo2;
  const temp = v.temperature;
  let msg = [];

  if (hr < 60) msg.push("El ritmo cardíaco está por debajo de lo normal.");
  else if (hr <= 100) msg.push("El ritmo cardíaco está dentro del rango normal.");
  else msg.push("El ritmo cardíaco está elevado.");

  if (spo2 >= 87 && spo2 <= 96) msg.push("La oxigenación es normal para esta altitud.");
  else if (spo2 >= 83) msg.push("Hay signos de hipoxia leve.");
  else if (spo2 >= 79) msg.push("La oxigenación sugiere hipoxia moderada.");
  else msg.push("Oxigenación compatible con hipoxia severa.");

  if (temp >= 36.0 && temp <= 37.0) msg.push("La temperatura corporal está en el rango normal.");
  else if (temp <= 38.0) msg.push("Hay febrícula.");
  else if (temp <= 38.4) msg.push("Hay fiebre leve.");
  else if (temp <= 39.0) msg.push("Hay fiebre moderada.");
  else if (temp > 39.0) msg.push("Hay fiebre alta.");
  else msg.push("La temperatura está por debajo del rango normal.");

  return msg.join(" ");
}

app.post("/api/chat", async (req, res) => {
  const { message } = req.body;
  const diagnostico = generarDiagnostico(lastVitals);

  const prompt = `
Eres BROCK, un asistente virtual masculino, cálido, natural y profesional.
Hablas como una persona real, sin listas ni símbolos.

Ritmo cardíaco: ${lastVitals.heart_rate}
Oxigenación: ${lastVitals.spo2}
Temperatura: ${lastVitals.temperature}

Evaluación automática:
${diagnostico}

Mensaje del usuario:
${message}

Responde de forma humana, clara y confiable.
`;

  try {
    const response = await fetch("https://api.deepseek.com/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify({
        model: "deepseek-chat",
        messages: [{ role: "user", content: prompt }],
        temperature: 0.6
      })
    });

    const data = await response.json();
    res.json({ reply: data.choices[0].message.content });
  } catch (e) {
    console.error(e);
    res.json({ reply: "Hubo un problema con la IA. Intenta nuevamente." });
  }
});

app.use(express.static(__dirname));

app.get("*", (req, res) => {
  res.sendFile(path.join(__dirname, "index.html"));
});

app.listen(PORT, () => {
  console.log(`Servidor activo en puerto ${PORT}`);
});
