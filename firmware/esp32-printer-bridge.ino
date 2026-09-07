// ManeMess ESP32 BLE-to-Serial Printer Bridge

#include <BLEDevice.h>
#include <BLEServer.h>
#include <BLEUtils.h>
#include <BLE2902.h>

#define SERVICE_UUID        "6e400001-b5a3-f393-e0a9-e50e24dcca9e"
#define CHAR_RX_UUID        "6e400002-b5a3-f393-e0a9-e50e24dcca9e"
#define CHAR_TX_UUID        "6e400003-b5a3-f393-e0a9-e50e24dcca9e"

#define PRINTER_BAUD        9600
#define PRINTER_TX_PIN      17
#define PRINTER_RX_PIN      16
#define LED_PIN             2

bool deviceConnected = false;
BLECharacteristic *pTxCharacteristic;

class ServerCallbacks : public BLEServerCallbacks {
    void onConnect(BLEServer *pServer) {
        deviceConnected = true;
        digitalWrite(LED_PIN, HIGH);
        Serial.println("BLE client connected");
    }

    void onDisconnect(BLEServer *pServer) {
        deviceConnected = false;
        digitalWrite(LED_PIN, LOW);
        Serial.println("BLE client disconnected, restarting ads");
        pServer->startAdvertising();
    }
};

class RxCallbacks : public BLECharacteristicCallbacks {
    void onWrite(BLECharacteristic *pCharacteristic) {
        String value = pCharacteristic->getValue();
        if (value.length() > 0) {
            Serial2.write((uint8_t *)value.c_str(), value.length());
            Serial.printf("Forwarded %d bytes to printer\n", value.length());
        }
    }
};

void setup() {
    Serial.begin(115200);
    delay(1000);
    Serial.println("\n\n=== ManeMess Printer Bridge ===");

    Serial2.begin(PRINTER_BAUD, SERIAL_8N1, PRINTER_RX_PIN, PRINTER_TX_PIN);
    Serial.println("[OK] Serial2 started");

    pinMode(LED_PIN, OUTPUT);
    digitalWrite(LED_PIN, LOW);

    Serial.println("[..] Initializing BLE...");
    BLEDevice::init("ManeMess-Printer");
    Serial.println("[OK] BLEDevice::init done");

    Serial.printf("[OK] BLE address: %s\n", BLEDevice::getAddress().toString().c_str());

    BLEDevice::setMTU(512);
    Serial.println("[OK] MTU set to 512");

    BLEServer *pServer = BLEDevice::createServer();
    pServer->setCallbacks(new ServerCallbacks());
    Serial.println("[OK] BLE server created");

    BLEService *pService = pServer->createService(SERVICE_UUID);
    Serial.println("[OK] BLE service created");

    pTxCharacteristic = pService->createCharacteristic(
        CHAR_TX_UUID,
        BLECharacteristic::PROPERTY_NOTIFY
    );
    pTxCharacteristic->addDescriptor(new BLE2902());
    Serial.println("[OK] TX characteristic created");

    BLECharacteristic *pRxCharacteristic = pService->createCharacteristic(
        CHAR_RX_UUID,
        BLECharacteristic::PROPERTY_WRITE | BLECharacteristic::PROPERTY_WRITE_NR
    );
    pRxCharacteristic->setCallbacks(new RxCallbacks());
    Serial.println("[OK] RX characteristic created");

    pService->start();
    Serial.println("[OK] BLE service started");

    BLEAdvertising *pAdvertising = BLEDevice::getAdvertising();
    pAdvertising->addServiceUUID(SERVICE_UUID);
    pAdvertising->setScanResponse(true);
    pAdvertising->setMinPreferred(0x06);
    pAdvertising->setMaxPreferred(0x12);
    pAdvertising->start();
    Serial.println("[OK] BLE advertising started");

    Serial.println("\n=== READY — Scan for 'ManeMess-Printer' in Chrome ===\n");

    for (int i = 0; i < 6; i++) {
        digitalWrite(LED_PIN, HIGH);
        delay(100);
        digitalWrite(LED_PIN, LOW);
        delay(100);
    }
}

void loop() {
    delay(2000);
    if (!deviceConnected) {
        digitalWrite(LED_PIN, !digitalRead(LED_PIN));
    }
}
