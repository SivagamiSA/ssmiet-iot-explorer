export interface Card { title: string; text: string; image: string; tag?: string }

export const LEARN_ITEMS: Card[] = [
  { title: "Arduino", text: "Program microcontrollers to read inputs and control outputs.", image: "/images/components/arduino-uno.jpg" },
  { title: "Raspberry Pi", text: "Run Linux and Python on a small computer that connects to everything.", image: "/images/components/raspberry-pi.jpg" },
  { title: "ESP8266", text: "Add Wi-Fi to your projects and send data over the internet.", image: "/images/components/esp8266-nodemcu.jpg" },
  { title: "Sensors", text: "Measure temperature, humidity, light, distance and motion.", image: "/images/components/sensors.jpg" },
  { title: "Relays and Actuators", text: "Switch lamps, motors and pumps safely from code.", image: "/images/components/relay-module.jpg" },
  { title: "Breadboard Circuits", text: "Wire components correctly and read a circuit diagram with confidence.", image: "/images/components/breadboard-circuit.jpg" },
];

export const PROJECTS: Card[] = [
  { title: "Smart Plant Watering", text: "A soil moisture sensor decides when the pump should run.", tag: "Arduino, Soil sensor", image: "/images/projects/smart-irrigation.jpg" },
  { title: "Room Temperature Monitor", text: "Log temperature and humidity and view readings online.", tag: "ESP8266, DHT11", image: "/images/projects/temperature-monitor.jpg" },
  { title: "Door Alarm", text: "Get alerted the moment a door opens unexpectedly.", tag: "Arduino, Reed switch", image: "/images/projects/door-alarm.jpg" },
  { title: "Mini Weather Station", text: "Collect weather data and display it on a screen.", tag: "Raspberry Pi, BMP280", image: "/images/projects/weather-station.jpg" },
  { title: "Automatic Street Light", text: "Lights turn on at dusk and off at dawn using an LDR.", tag: "Arduino, LDR", image: "/images/projects/street-light.jpg" },
  { title: "Gas Leak Detector", text: "Sound a buzzer when gas levels cross a safe limit.", tag: "Arduino, MQ-2", image: "/images/projects/gas-leak-detector.jpg" },
];

export const ABOUT_POINTS = [
  { title: "Practical first", text: "Every concept is tied to a circuit you can actually build." },
  { title: "Guided step by step", text: "Wiring, code and expected results are explained clearly." },
  { title: "Safe to experiment", text: "Test ideas virtually before touching real hardware." },
];

export const INTERACTIVE = [
  { title: "Circuit connections", text: "See exactly which pin connects to which, with clear wiring guides for each project." },
  { title: "Coding", text: "Write and understand the code that brings your hardware to life." },
  { title: "Virtual simulation", text: "Run your circuit on screen first, so mistakes cost nothing." },
];

export const STEPS = [
  { title: "Learn", text: "Understand the component and the idea behind it." },
  { title: "Build", text: "Connect the circuit and write the code." },
  { title: "Simulate", text: "Run it virtually and watch how it behaves." },
  { title: "Test", text: "Check the result on real hardware and improve it." },
];
