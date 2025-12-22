#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>

#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_MLX90614.h>

#include <WiFiUdp.h>
#include <NTPClient.h>

// =====================
// DISPLAY CONFIG
// =====================
#define OLED_WIDTH 128
#define OLED_HEIGHT 64
#define OLED_ADDR   0x3C

Adafruit_MLX90614 mlx = Adafruit_MLX90614();
Adafruit_SSD1306 display(OLED_WIDTH, OLED_HEIGHT, &Wire, -1);

// =====================
// WIFI CONFIG
// =====================
const char* ssid     = "POCO X5 Pro 5G";
const char* password = "brando13";

// =====================
// SERVER URL
// =====================
String serverURL = "https://vitalia-monitor.onrender.com/api/vitals";

WiFiClientSecure secureClient;

// =====================
// NTP CLIENT
// =====================
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", -18000, 60000);

// =====================
// TIMERS
// =====================
unsigned long previousMillis = 0;
const unsigned long intervaloEnvio = 2000;

bool estadoAPI = false;

// =====================
// RANDOM DATA
// =====================
int generarHR() { return 60 + random(0, 51); }
int generarSpO2() { return 94 + random(0, 6); }
float generarTemp() {

  float tSkin = mlx.readObjectTempC();       // °C directo del sensor
  float tRoom = mlx.readAmbientTempC();      // soporte compensación

  // FILTRO ANTI RUIDO (evita saltos electrónicos)
  static float filtro = tSkin;
  filtro = 0.85 * filtro + 0.15 * tSkin;

  // CALIBRACIÓN PARA MUÑECA
  float tCorregida = filtro + 1.4;

  return tCorregida;
}

// =====================
// WIFI HANDLER
// =====================
void conectarWiFi() {
  if (WiFi.status() == WL_CONNECTED) return;
  WiFi.begin(ssid, password);
  unsigned long start = millis();
  while (WiFi.status() != WL_CONNECTED && millis() - start < 6000) {
    delay(200);
  }
}

// =====================
// DRAW SCREEN
// =====================
void pantallaSmartwatch(int hr, int spo2, float temp)
{
  display.clearDisplay();
  display.setTextColor(SSD1306_WHITE);

  display.setTextSize(1);
  display.setCursor(8, 0);
  display.print("VITALIA SMARTWATCH");

  display.setCursor(0, 10);
  display.print("------------------------");

  // HR + SpO2
  display.setCursor(0, 22);
  display.print("<3: ");
  display.print(hr);
  display.print(" bpm");

  display.setCursor(75, 22);
  display.print("O2: ");
  display.print(spo2);
  display.print(" %");

  // TEMP + WIFI STATUS
  display.setCursor(0, 34);
  display.print("T: ");
  display.print(temp);
  display.print(" C");

  display.setCursor(75, 34);
  display.print("WiFi:");
  display.print(WiFi.status() == WL_CONNECTED ? "OK" : "X");

  // API STATUS
  display.setCursor(0, 46);
  display.print("API: ");
  display.print(estadoAPI ? "OK" : "ERR");

  // TIME + DATE
  display.setCursor(0, 56);
  display.print(timeClient.getFormattedTime());

  int dia  = (timeClient.getEpochTime() % 2592000) / 86400 + 1;
  int mes  = ((timeClient.getEpochTime() / 2592000) % 12) + 1;
  int anio = 1970 + timeClient.getEpochTime() / 31556926;

  display.setCursor(75, 56);
  display.print(dia);
  display.print("/");
  display.print(mes);
  display.print("/");
  display.print(anio);

  display.display();
}

// =====================
// POST JSON
// =====================
void enviarDatos() {

  conectarWiFi();

  if (WiFi.status() != WL_CONNECTED) {
    estadoAPI = false;
    return;
  }

  secureClient.setInsecure();
  HTTPClient http;

  http.begin(secureClient, serverURL);
  http.addHeader("Content-Type", "application/json");

  int hr     = generarHR();
  int spo2   = generarSpO2();
  float temp = generarTemp();

  String jsonData =
      "{\"heart_rate\":" + String(hr) +
      ",\"spo2\":" + String(spo2) +
      ",\"temperature\":" + String(temp) + "}";

  int code = http.POST(jsonData);

  estadoAPI = (code == 200);
  http.end();

  pantallaSmartwatch(hr, spo2, temp);
}

// =====================
// SETUP
// =====================
void setup() {

  Serial.begin(115200);
  randomSeed(esp_random());

  WiFi.mode(WIFI_STA);
  conectarWiFi();

  Wire.begin(21, 22);
  display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR);
  display.clearDisplay();
  display.display();

  timeClient.begin();
  timeClient.update();

  if (!mlx.begin()) {
  Serial.println("MLX90614 no encontrado!");
  while (1);
}

}

// =====================
// LOOP
// =====================
void loop() {

  timeClient.update();

  unsigned long currentMillis = millis();

  if (currentMillis - previousMillis >= intervaloEnvio) {
    previousMillis = currentMillis;
    enviarDatos();
  }
}
