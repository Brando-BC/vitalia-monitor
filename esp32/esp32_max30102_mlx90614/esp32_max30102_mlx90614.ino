/******************************************************
 * VITALIA ESP32 — ENVÍO DE SIGNOS VITALES (RANDOM)
 * 
 * Envía cada 2 segundos:
 * - Ritmo cardíaco (60–110 bpm)
 * - SpO2 (94–99%)
 * - Temperatura (36.0–38.0 °C)
 *
 * POST en formato JSON → /api/vitals
 ******************************************************/

#include <WiFi.h>
#include <HTTPClient.h>

// =============================
// CONFIGURACIÓN WIFI
// =============================
const char* ssid     = "POCO X5 Pro 5G";
const char* password = "brando13";

// =============================
// URL DEL SERVIDOR (LOCAL O RENDER)
// =============================

// LOCAL:
// String serverURL = "http://192.168.1.50:3000/api/vitals";

// RENDER (se agregará luego):
String serverURL = "https://vitalia-monitor.onrender.com";

// =============================
// FUNCIÓN DE DATOS RANDOM
// =============================
int generarHR() {
  return random(60, 111);    // 60–110 bpm
}

int generarSpO2() {
  return random(94, 100);    // 94–99%
}

float generarTemp() {
  return random(360, 380) / 10.0;   // 36.0–38.0 °C
}

void enviarDatos() {
  if (WiFi.status() != WL_CONNECTED) {
    Serial.println("❌ No conectado a WiFi");
    return;
  }

  HTTPClient http;

  http.begin(serverURL);
  http.addHeader("Content-Type", "application/json");

  int hr   = generarHR();
  int spo2 = generarSpO2();
  float temp = generarTemp();

  // Crear JSON
  String jsonData = "{\"heart_rate\":" + String(hr) +
                    ",\"spo2\":" + String(spo2) +
                    ",\"temperature\":" + String(temp) + "}";

  Serial.println("📤 Enviando JSON:");
  Serial.println(jsonData);

  // Enviar datos
  int httpResponseCode = http.POST(jsonData);

  if (httpResponseCode > 0) {
    Serial.print("🟢 Servidor respondió: ");
    Serial.println(httpResponseCode);
  } else {
    Serial.print("❌ Error POST: ");
    Serial.println(httpResponseCode);
  }

  http.end();
}

void setup() {
  Serial.begin(115200);
  delay(1000);

  Serial.println("\n===== VITALIA ESP32 =====");
  Serial.println("Conectando a WiFi...");

  WiFi.begin(ssid, password);

  int intentos = 0;
  while (WiFi.status() != WL_CONNECTED && intentos < 20) {
    delay(500);
    Serial.print(".");
    intentos++;
  }

  if (WiFi.status() == WL_CONNECTED) {
    Serial.println("\n🟢 WiFi conectado");
    Serial.print("IP: ");
    Serial.println(WiFi.localIP());
  } else {
    Serial.println("\n❌ No se pudo conectar al WiFi");
  }

  randomSeed(analogRead(0)); // Semilla de aleatorios
}

void loop() {
  enviarDatos();
  delay(1000);  // Cada 2 segundos
}
