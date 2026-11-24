// Simulation lab projects. The ids are what simulation progress and project quizzes are saved against,
// so they must match src/simulation/projects/*.js (client). Generated from that list.
export const SIMULATIONS = [
  {
    "id": "ultrasonic-distance-meter",
    "name": "Ultrasonic Distance Meter",
    "difficulty": "Beginner",
    "summary": "Measure the distance of an object, show it on an LCD, and beep when it is too close."
  },
  {
    "id": "parking-distance-alert",
    "name": "Parking Distance Alert",
    "difficulty": "Beginner",
    "summary": "Beep faster as a car gets closer to an obstacle."
  },
  {
    "id": "automatic-night-lamp",
    "name": "Automatic Night Lamp",
    "difficulty": "Beginner",
    "summary": "A lamp that switches on by itself when it gets dark."
  },
  {
    "id": "ir-object-counter",
    "name": "IR Object Counter",
    "difficulty": "Intermediate",
    "summary": "Count objects as they pass in front of an IR sensor."
  },
  {
    "id": "door-entry-alert",
    "name": "Door/Entry Alert",
    "difficulty": "Beginner",
    "summary": "Sound a buzzer when a door is left open."
  },
  {
    "id": "temperature-monitor",
    "name": "Temperature Monitor",
    "difficulty": "Beginner",
    "summary": "Read and show the room temperature."
  },
  {
    "id": "humidity-monitor",
    "name": "Humidity Monitor",
    "difficulty": "Beginner",
    "summary": "Measure how humid the air is, in percent."
  },
  {
    "id": "temperature-warning-alarm",
    "name": "Temperature Warning Alarm",
    "difficulty": "Intermediate",
    "summary": "Sound an alarm when it gets too hot."
  },
  {
    "id": "soil-moisture-lcd",
    "name": "Soil Moisture Sensor + LCD Display",
    "difficulty": "Intermediate",
    "summary": "Show how wet the soil is on an LCD screen."
  },
  {
    "id": "digital-potentiometer-demo",
    "name": "Digital Potentiometer Demo",
    "difficulty": "Advanced",
    "summary": "Control a resistance with code using an SPI chip."
  },
  {
    "id": "push-button-counter",
    "name": "Push Button Counter",
    "difficulty": "Beginner",
    "summary": "Count how many times a button is pressed."
  },
  {
    "id": "buzzer-melody-patterns",
    "name": "Buzzer Melody/Beep Patterns",
    "difficulty": "Beginner",
    "summary": "Play different beep patterns on a buzzer."
  },
  {
    "id": "traffic-light-controller",
    "name": "Traffic Light Controller",
    "difficulty": "Beginner",
    "summary": "Run red, green and yellow lights in a timed cycle."
  },
  {
    "id": "pedestrian-crossing-signal",
    "name": "Pedestrian Crossing Signal",
    "difficulty": "Intermediate",
    "summary": "A push button that stops cars so people can cross."
  },
  {
    "id": "lcd-menu-system",
    "name": "LCD Menu System",
    "difficulty": "Advanced",
    "summary": "Browse a menu on an LCD using three buttons."
  },
  {
    "id": "electronic-reaction-timer",
    "name": "Electronic Reaction Timer",
    "difficulty": "Intermediate",
    "summary": "Test how fast you can press a button after an LED lights."
  },
  {
    "id": "digital-dice",
    "name": "Digital Dice",
    "difficulty": "Intermediate",
    "summary": "Press a button to roll a random number from 1 to 6."
  }
];

export const SIMULATION_IDS = new Set(SIMULATIONS.map((s) => s.id));

// Quiz ids: the general quiz plus one project quiz per simulation.
export const QUIZ_TITLES = new Map([["general", "IoT Explorer General Quiz"], ...SIMULATIONS.map((s) => [s.id, s.name])]);

// Points follow the existing level system (100 points per level, 20 per lesson). Each is awarded once.
export const SIMULATION_POINTS = 30;
export const QUIZ_POINTS = 20;
export const QUIZ_PASS_PERCENT = 60;
