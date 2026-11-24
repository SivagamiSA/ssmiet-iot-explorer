import { P, UNO } from '../utils/partDefs.js';
export default {
  id: 'ultrasonic-distance-meter', no: 1, name: 'Ultrasonic Distance Meter (Arduino UNO)', category: 'Sensors', difficulty: 'Beginner',
  description: 'Measure the distance of an object, show it on an LCD, and beep when it is too close.',
  objective: 'Use an HC-SR04 to measure distance in cm, display it on a 16x2 I2C LCD, and sound a buzzer below a limit.',
  components: ['Arduino UNO', 'HC-SR04 ultrasonic sensor', '16x2 LCD with I2C backpack', 'Piezo buzzer'],
  pins: { 'HC-SR04 TRIG': 'D9', 'HC-SR04 ECHO': 'D10', BUZZER: 'D8', 'LCD SDA': 'A4', 'LCD SCL': 'A5' },
  electrical: [
    'HC-SR04 needs 5 V and about 15 mA, so the UNO 5 V pin can power it. ECHO outputs 5 V, which is safe for UNO inputs.',
    'The LCD uses an I2C backpack (address 0x27). On the UNO, SDA = A4 and SCL = A5.',
    'A small piezo buzzer draws about 10 mA, within the UNO pin limit (20 mA). For loud buzzers use a transistor.',
  ],
  parts: [UNO, P('hc', 'ultra', 40, 'HC-SR04'), P('lcd', 'lcd', 225, 'LCD 16x2 I2C'), P('bz', 'buzz', 430, 'Buzzer')],
  wires: [
    ['uno.5V', 'hc.vcc'], ['uno.D9', 'hc.trig'], ['uno.D10', 'hc.echo'], ['uno.GND', 'hc.gnd'],
    ['uno.5V', 'lcd.vcc'], ['uno.GND2', 'lcd.gnd'], ['uno.A4', 'lcd.sda'], ['uno.A5', 'lcd.scl'],
    ['uno.D8', 'bz.p'], ['uno.GND3', 'bz.n'],
  ],
  code: `#include <Wire.h>
#include <LiquidCrystal_I2C.h>

const int TRIG_PIN = 9;
const int ECHO_PIN = 10;
const int BUZZER_PIN = 8;
const float LIMIT_CM = 20.0;        // closer than this = too close

LiquidCrystal_I2C lcd(0x27, 16, 2);

void setup() {
  pinMode(TRIG_PIN, OUTPUT);
  pinMode(ECHO_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  lcd.init();
  lcd.backlight();
}

void loop() {
  digitalWrite(TRIG_PIN, LOW);
  delayMicroseconds(2);
  digitalWrite(TRIG_PIN, HIGH);     // 10 us trigger pulse
  delayMicroseconds(10);
  digitalWrite(TRIG_PIN, LOW);

  long duration = pulseIn(ECHO_PIN, HIGH, 30000);
  float cm = duration * 0.0343 / 2; // sound there and back

  lcd.setCursor(0, 0);
  if (duration == 0) lcd.print("Dist: ---       ");
  else { lcd.print("Dist: "); lcd.print(cm, 1); lcd.print(" cm   "); }

  lcd.setCursor(0, 1);
  if (duration == 0) {
    lcd.print("Out of range    ");
    noTone(BUZZER_PIN);
  } else if (cm < LIMIT_CM) {
    lcd.print("TOO CLOSE!      ");
    tone(BUZZER_PIN, 2500, 150);    // beep
  } else {
    lcd.print("Distance OK     ");
    noTone(BUZZER_PIN);
  }
  delay(300);
}`,
  explain: [
    ['pulseIn()', 'Measures how long ECHO stays HIGH: the sound travel time.'],
    ['duration * 0.0343 / 2', 'Sound travels there and back, so the time is divided by 2.'],
    ['lcd.setCursor(0, 1)', 'Moves the LCD cursor to column 0 of row 2.'],
    ['cm < LIMIT_CM', 'When the object is closer than the limit, the LCD warns and the buzzer beeps.'],
  ],
  sim: 'ultralcd',
  params: [
    { k: 'dist', label: 'Object distance', min: 2, max: 450, step: 1, def: 100, unit: 'cm' },
    { k: 'limit', label: 'Too-close limit', min: 5, max: 100, step: 1, def: 20, unit: 'cm' },
  ],
  live: (o) => ({ lcd: o.lines, bz: o.buzz }),
  practice: 'Wire the HC-SR04, the LCD and the buzzer. Run it, move the object closer than the limit, and check the LCD and buzzer.',
  hints: [
    'There are three parts to connect to the UNO: sensor, LCD and buzzer. Each needs power and ground.',
    'The sensor uses two digital pins, the LCD uses the two I2C pins, the buzzer uses one digital pin.',
    'TRIG = D9, ECHO = D10, buzzer = D8, LCD SDA = A4, LCD SCL = A5.',
  ],
  tests: [
    { name: 'LCD shows about 100 cm, no alarm', steps: [{ set: { dist: 100, limit: 20 }, wait: 100, expect: { close: false, buzz: false, lines: (v) => /^Dist: (99|100)/.test(v[0]) && v[1].trim() === 'Distance OK' } }] },
    { name: 'Too close: LCD warning and buzzer beep', steps: [{ set: { dist: 10, limit: 20 }, wait: 100, expect: { close: true, buzz: true, lines: (v) => v[1].trim() === 'TOO CLOSE!' } }] },
    { name: 'Limit setting changes the alarm point', steps: [{ set: { dist: 30, limit: 20 }, wait: 100, expect: { close: false } }, { set: { limit: 40 }, wait: 100, expect: { close: true } }] },
    { name: 'Out of range is reported', steps: [{ set: { dist: 430 }, wait: 100, expect: { reading: null, buzz: false, lines: (v) => v[1].trim() === 'Out of range' } }] },
  ],
  completion: 'Wiring is correct, the LCD shows the distance, and the buzzer beeps when the object is too close.',
};
