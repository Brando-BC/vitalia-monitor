#include <WiFi.h>
#include <HTTPClient.h>
#include <WiFiClientSecure.h>
#include <Wire.h>
#include <Adafruit_GFX.h>
#include <Adafruit_SSD1306.h>
#include <Adafruit_MLX90614.h>
#include <WiFiUdp.h>
#include <NTPClient.h>
#include <time.h>
#include "MAX30105.h"
#include "spo2_algorithm.h"
#define SDA_PIN 21
#define SCL_PIN 22

#define OLED_WIDTH 128
#define OLED_HEIGHT 64
#define OLED_ADDR   0x3C

#define MIN_IR_SIGNAL 30000
#define HR_MIN 45
#define HR_MAX 160
#define SPO2_MIN 88
#define SPO2_MAX 100

#define STABILIZATION_TIME 60000UL
#define SAMPLE_BLOCK 100
#define SEND_INTERVAL 15000UL

enum SystemState {
  STABILIZING,
  MEASURING,
  SENDING
};

SystemState currentState = STABILIZING;
MAX30105 sensor;
Adafruit_MLX90614 mlx;
Adafruit_SSD1306 display(OLED_WIDTH, OLED_HEIGHT, &Wire, -1);

WiFiClientSecure secureClient;
WiFiUDP ntpUDP;
NTPClient timeClient(ntpUDP, "pool.ntp.org", -18000, 60000);

uint32_t irBuffer[SAMPLE_BLOCK];
uint32_t redBuffer[SAMPLE_BLOCK];

int32_t heartRate, spo2;
int8_t validHR, validSpO2;

float hrFinal = 75;
float spo2Final = 97;

unsigned long startTime;
unsigned long lastSendTime = 0;

bool estadoAPI = false;
String ultimoError = "";

const char* ssid = "POCO X5 Pro 5G";
const char* password = "brando13";
String serverURL = "https://vitalia-monitor.onrender.com/api/vitals";
void captureSamples() {
  for (int i = 0; i < SAMPLE_BLOCK; i++) {
    while (!sensor.available()) sensor.check();

    uint32_t ir = sensor.getIR();
    uint32_t red = sensor.getRed();

    if (ir < MIN_IR_SIGNAL) {
      irBuffer[i] = 0;
      redBuffer[i] = 0;
    } else {
      irBuffer[i] = ir;
      redBuffer[i] = red;
    }
    sensor.nextSample();
  }
}
float leerTemperatura() {
  float t = mlx.readObjectTempC();
  if (t < 20 || t > 45) return -1;
  return t + 1.4;
}
void pantallaSmartwatch(float temp) {

  time_t rawtime = timeClient.getEpochTime();
  struct tm * ti = localtime(&rawtime);

  display.clearDisplay();
  display.setTextSize(1);
  display.setTextColor(SSD1306_WHITE);

  display.setCursor(8, 0);
  display.print("VITALIA SMARTWATCH");
  display.setCursor(0, 10);
  display.print("------------------------");

  display.setCursor(0, 22);
  display.print("<3: ");
  display.print(hrFinal);

  display.setCursor(70, 22);
  display.print("O2: ");
  display.print(spo2Final);
  display.print(" %");

  display.setCursor(0, 34);
  display.print("T: ");
  if (temp > 0) {
    display.print(temp, 1);
    display.print(" C");
  } else {
    display.print("ERR");
  }

  display.setCursor(75, 34);
  display.print("WiFi:");
  display.print(WiFi.status() == WL_CONNECTED ? "OK" : "X");

  display.setCursor(0, 46);
  display.print("API: ");
  display.print(estadoAPI ? "OK" : "---");

  display.setCursor(0, 56);
  display.print(timeClient.getFormattedTime());

  display.setCursor(60, 56);
  if (ti->tm_mday < 10) display.print("0");
  display.print(ti->tm_mday); display.print("/");
  if ((ti->tm_mon + 1) < 10) display.print("0");
  display.print(ti->tm_mon + 1); display.print("/");
  display.print(ti->tm_year + 1900);

  display.display();
}
void enviarDatos() {
  if (WiFi.status() != WL_CONNECTED) {
    estadoAPI = false;
    ultimoError = "WiFi";
    Serial.println("❌ Envío cancelado: No WiFi");
    return;
  }

  float temp = leerTemperatura();
  if (temp < 0) {
    estadoAPI = false;
    ultimoError = "TEMP";
    Serial.println("❌ Temperatura inválida");
    return;
  }

  secureClient.setInsecure();
  HTTPClient http;

  http.begin(secureClient, serverURL);
  http.addHeader("Content-Type", "application/json");

  String payload =
    "{\"heart_rate\":" + String(hrFinal) +
    ",\"spo2\":" + String(spo2Final) +
    ",\"temperature\":" + String(temp, 1) + "}";

  Serial.println("📤 Enviando JSON:");
  Serial.println(payload);

  int code = http.POST(payload);
  estadoAPI = (code == 200);

  Serial.println(code == 200 ? "✅ Envío OK" : "❌ Error HTTP");

  http.end();
}
void setup() {
  Serial.begin(115200);
  delay(1500);

  Serial.println("🚀 VITALIA SMARTWATCH INICIANDO");

  Wire.begin(SDA_PIN, SCL_PIN);
  Wire.setClock(400000);

  display.begin(SSD1306_SWITCHCAPVCC, OLED_ADDR);
  mlx.begin();

  sensor.begin(Wire, I2C_SPEED_FAST);
  sensor.setup(70, 16, 2, 100, 411, 4096);

  WiFi.mode(WIFI_STA);
  WiFi.begin(ssid, password);

  timeClient.begin();
  timeClient.update();

  startTime = millis();
  Serial.println("⏳ Estabilizando sensores (60 s)");
}
void loop() {
  timeClient.update();

  switch (currentState) {

    case STABILIZING:
      captureSamples();
      Serial.print("STABILIZING: ");
      Serial.print((millis() - startTime) / 1000);
      Serial.println(" s");

      pantallaSmartwatch(-1);

      if (millis() - startTime >= STABILIZATION_TIME) {
        Serial.println("✅ Estabilización completa");
        currentState = MEASURING;
      }
      delay(1000);
      break;

    case MEASURING:
      Serial.println("📊 MEASURING");

      captureSamples();

      maxim_heart_rate_and_oxygen_saturation(
        irBuffer, SAMPLE_BLOCK, redBuffer,
        &spo2, &validSpO2,
        &heartRate, &validHR
      );

      if (validHR && heartRate >= HR_MIN && heartRate <= HR_MAX)
        hrFinal = heartRate;

      if (validSpO2 && spo2 >= SPO2_MIN && spo2 <= SPO2_MAX)
        spo2Final = spo2;

      pantallaSmartwatch(leerTemperatura());

      if (millis() - lastSendTime >= SEND_INTERVAL)
        currentState = SENDING;

      delay(500);
      break;

    case SENDING:
      Serial.println("📡 SENDING");
      enviarDatos();
      lastSendTime = millis();
      currentState = MEASURING;
      break;
  }
}
