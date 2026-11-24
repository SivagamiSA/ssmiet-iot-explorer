// Lesson content for the Learning phase. Ids MUST match server/src/data/catalog.js (progress is saved against them).
export interface LessonSection { title: string; paragraphs?: string[]; bullets?: string[]; code?: { caption: string; text: string } }
export interface LessonContent {
  id: string; title: string; minutes: number; intro: string; objectives: string[];
  sections: LessonSection[]; keyPoints: string[];
}

export const LESSON_CONTENT: LessonContent[] = [
  {
    id: "arduino", title: "Arduino basics", minutes: 10,
    intro: "Arduino is a small, beginner-friendly microcontroller board. It reads inputs (buttons, sensors), runs your program, and controls outputs (LEDs, motors).",
    objectives: ["Explain what a microcontroller is", "Name the parts of an Arduino Uno", "Understand setup() and loop()", "Blink an LED with code"],
    sections: [
      { title: "What is a microcontroller?", paragraphs: ["A microcontroller is a tiny computer on one chip. It has a processor, memory and input/output pins. It does one job over and over, such as reading a sensor and switching a light.", "The Arduino Uno uses the ATmega328P chip. It runs at 16 MHz with 32 KB of program memory and works with 5 V logic."] },
      { title: "Parts of the Uno", bullets: ["Digital pins 0–13: read or write ON/OFF (HIGH/LOW). Pins 3, 5, 6, 9, 10, 11 also give PWM (simulated dimming).", "Analog pins A0–A5: read a voltage from 0 to 5 V as a number from 0 to 1023.", "Power pins: 5V, 3.3V and GND (ground).", "USB port: powers the board and uploads your program."] },
      { title: "The two functions every sketch has", paragraphs: ["setup() runs once when the board starts. loop() then runs again and again forever."], code: { caption: "Blink: turn the built-in LED on and off every second", text: "void setup() {\n  pinMode(LED_BUILTIN, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(LED_BUILTIN, HIGH); // LED on\n  delay(1000);                     // wait 1 second\n  digitalWrite(LED_BUILTIN, LOW);  // LED off\n  delay(1000);\n}" } },
      { title: "Upload your first program", bullets: ["Install the Arduino IDE and connect the board with a USB cable.", "Choose Tools > Board > Arduino Uno, then pick the correct Port.", "Press Upload. The built-in LED (pin 13) should start blinking."] },
    ],
    keyPoints: ["A microcontroller is a small computer that controls hardware.", "setup() runs once; loop() repeats forever.", "pinMode, digitalWrite and analogRead are the three commands you will use most."],
  },
  {
    id: "raspberry-pi", title: "Raspberry Pi basics", minutes: 10,
    intro: "A Raspberry Pi is a full computer the size of a card. Unlike an Arduino it runs an operating system (Linux), so it can run Python, host websites and store lots of data.",
    objectives: ["Tell the difference between a Pi and an Arduino", "Know what GPIO pins are", "Respect the 3.3 V limit", "Blink an LED using Python"],
    sections: [
      { title: "Pi vs Arduino", bullets: ["Arduino: one program, starts instantly, ideal for reading sensors and driving outputs.", "Raspberry Pi: runs Linux, many programs at once, Wi-Fi, USB, camera and display support.", "Together: an Arduino often handles the hardware while a Pi stores and shows the data."] },
      { title: "GPIO pins", paragraphs: ["The 40-pin header on the Pi has GPIO (General Purpose Input/Output) pins. Each can be set as an input or an output from your code.", "Important: Pi pins work at 3.3 V and are NOT 5 V tolerant. Connecting a 5 V signal directly can damage the board."] },
      { title: "Blink an LED with Python", code: { caption: "LED with a resistor on GPIO 17 (using the gpiozero library)", text: "from gpiozero import LED\nfrom time import sleep\n\nled = LED(17)\n\nwhile True:\n    led.on()\n    sleep(1)\n    led.off()\n    sleep(1)" } },
      { title: "Where Pis fit in IoT", paragraphs: ["A Pi can act as a small server or gateway: it collects readings from many devices, saves them, and shows a dashboard."] },
    ],
    keyPoints: ["A Pi is a computer; an Arduino is a microcontroller.", "GPIO pins are 3.3 V only.", "Python makes controlling hardware on the Pi simple."],
  },
  {
    id: "esp8266", title: "ESP8266 and Wi-Fi", minutes: 12,
    intro: "The ESP8266 is a low-cost microcontroller with built-in Wi-Fi. It lets your project send data to the internet or be controlled from a phone.",
    objectives: ["Explain why Wi-Fi matters for IoT", "Know the ESP8266 voltage rules", "Connect an ESP8266 to Wi-Fi", "Understand what 'sending data' means"],
    sections: [
      { title: "Why the ESP8266?", paragraphs: ["It costs very little, runs at 80 MHz and can be programmed from the Arduino IDE. The NodeMCU board adds a USB port and pin labels, so it is easy to use on a breadboard."] },
      { title: "Things to remember", bullets: ["Logic level is 3.3 V, not 5 V.", "It has only one analog input (A0).", "Use the board's own USB power or a stable supply; weak power causes random resets."] },
      { title: "Connect to Wi-Fi", code: { caption: "Join your Wi-Fi network and print the IP address", text: "#include <ESP8266WiFi.h>\n\nconst char* ssid = \"YOUR_WIFI_NAME\";\nconst char* password = \"YOUR_WIFI_PASSWORD\";\n\nvoid setup() {\n  Serial.begin(115200);\n  WiFi.begin(ssid, password);\n  while (WiFi.status() != WL_CONNECTED) {\n    delay(500);\n    Serial.print(\".\");\n  }\n  Serial.println(WiFi.localIP());\n}\n\nvoid loop() {}" } },
      { title: "Sending data", paragraphs: ["Once connected, the board can send sensor readings to a web server using HTTP requests, or publish them with a protocol such as MQTT. A website or phone app then shows the values."] },
    ],
    keyPoints: ["ESP8266 = microcontroller + Wi-Fi.", "It is a 3.3 V device.", "Keep Wi-Fi passwords out of code you share publicly."],
  },
  {
    id: "sensors", title: "Sensors", minutes: 12,
    intro: "Sensors turn real-world conditions such as heat, light, motion or distance into electrical signals your microcontroller can read.",
    objectives: ["Tell digital and analog sensors apart", "Read a sensor value in code", "Name common sensors and what they measure", "Understand why readings need calibration"],
    sections: [
      { title: "Digital vs analog", bullets: ["Digital sensors give ON/OFF (for example a PIR motion sensor) or send data in a set format (for example the DHT11).", "Analog sensors give a changing voltage (for example an LDR or soil moisture probe). The Arduino converts it to a number from 0 to 1023."] },
      { title: "Common sensors", bullets: ["DHT11: temperature and humidity.", "LDR: light level.", "PIR: motion of warm bodies.", "HC-SR04 ultrasonic: distance.", "MQ-2: gas and smoke.", "Soil moisture: how wet the soil is."] },
      { title: "Reading an analog sensor", code: { caption: "Read a light sensor circuit on A0 and print the value", text: "void setup() {\n  Serial.begin(9600);\n}\n\nvoid loop() {\n  int value = analogRead(A0); // 0 to 1023\n  Serial.println(value);\n  delay(500);\n}" } },
      { title: "Making sense of the numbers", paragraphs: ["Raw numbers do not mean much by themselves. Test the sensor in known conditions (dark room, bright lamp, dry soil, wet soil) and choose a threshold, such as 'if the value is below 300 it is dark'."] },
    ],
    keyPoints: ["Sensors convert physical conditions into signals.", "Analog gives a range; digital gives ON/OFF or coded data.", "Always test and calibrate with real conditions."],
  },
  {
    id: "actuators", title: "Actuators", minutes: 12,
    intro: "Actuators are the outputs of an IoT system. They make something happen: a light turns on, a pump starts, a door unlocks.",
    objectives: ["Name common actuators", "Explain why a relay is used", "Switch a relay from code", "Follow basic safety rules"],
    sections: [
      { title: "Common actuators", bullets: ["LED: light.", "Buzzer: sound alert.", "Servo motor: turns to a set angle.", "DC motor or pump: continuous movement (needs a driver).", "Relay: an electrically controlled switch for bigger loads."] },
      { title: "Why not connect a pump straight to the board?", paragraphs: ["A microcontroller pin can supply only a few milliamps (about 20 mA on an Arduino). Pumps, motors and lamps need much more current. A relay or driver lets a small signal switch a bigger load safely."] },
      { title: "Switching a relay", code: { caption: "Relay input on pin 7. Many modules switch ON when the pin is LOW, so check yours.", text: "const int RELAY = 7;\n\nvoid setup() {\n  pinMode(RELAY, OUTPUT);\n}\n\nvoid loop() {\n  digitalWrite(RELAY, LOW);  // relay on (active-low module)\n  delay(3000);\n  digitalWrite(RELAY, HIGH); // relay off\n  delay(3000);\n}" } },
      { title: "Safety first", bullets: ["Practise with low-voltage loads only (a small lamp or pump on a battery).", "Never touch or wire mains (230 V) electricity unless a qualified teacher supervises.", "Power off before changing wires."] },
    ],
    keyPoints: ["Actuators turn decisions into actions.", "Use a relay or driver for loads bigger than a pin can handle.", "Mains voltage is dangerous; stay with low voltage in class."],
  },
  {
    id: "iot-applications", title: "IoT applications", minutes: 8,
    intro: "Now put it together. Every IoT system follows the same pattern: sense, think, act and share. This lesson shows how that pattern appears in real life.",
    objectives: ["Describe the sense-think-act-share pattern", "Match projects to real-world uses", "Plan a simple IoT idea of your own"],
    sections: [
      { title: "The pattern", bullets: ["Sense: sensors collect data.", "Think: the microcontroller compares it with a rule.", "Act: an actuator responds.", "Share: Wi-Fi sends the data to a phone or website."] },
      { title: "Examples", bullets: ["Smart farming: a soil sensor starts a pump only when the soil is dry.", "Smart home: lights switch on at dusk using an LDR.", "Safety: a gas sensor sounds a buzzer above a safe level.", "Weather: a station logs temperature, humidity and pressure online.", "Security: a door sensor alerts you when a door opens."] },
      { title: "Plan your own idea", paragraphs: ["Write one sentence for each step. For example: Sense: soil moisture. Think: if the value is above 600 the soil is dry. Act: run the pump for 5 seconds. Share: send the reading to a phone. If you can fill all four lines, you have a project."] },
    ],
    keyPoints: ["Sense, think, act, share: every IoT project follows it.", "Start with a real problem, then choose the parts.", "Next, explore the Components and build a project."],
  },
];

export const lessonById = (id: string) => LESSON_CONTENT.find((l) => l.id === id);
