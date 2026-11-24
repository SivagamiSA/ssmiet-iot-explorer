// Quiz questions from the Embedded IoT module: a general quiz plus one project question per simulation project.
export const GENERAL_QUIZ = [
  ['What does a resistor do?', ['Limits current', 'Makes light', 'Stores code'], 0],
  ['Which pin type gives ON or OFF?', ['Digital', 'Analog', 'Water'], 0],
  ['Which part makes beep sounds?', ['Buzzer', 'LDR', 'Relay'], 0],
  ['What does an LDR sense?', ['Light', 'Sound', 'Touch'], 0],
  ['What shows text and numbers?', ['LCD display', 'Servo', 'Resistor'], 0],
  ['Which part turns to exact angles?', ['Servo motor', 'LED', 'Buzzer'], 0],
  ['Which sensor measures distance with sound?', ['Ultrasonic', 'LM35', 'DHT11'], 0],
  ['Before changing wires you should...', ['Switch power off', 'Add water', 'Press reset twice'], 0],
].map(([q, o, a]) => ({ q, o, a }));

// One project-specific question per simulation project.
export const PROJECT_QUIZ = {
  'ultrasonic-distance-meter': ['Why is the echo time divided by 2?', ['Sound goes there and back', 'The sensor is slow', 'To save power'], 0],
  'parking-distance-alert': ['As the car gets closer, the beeps become...', ['Faster', 'Slower', 'Silent'], 0],
  'automatic-night-lamp': ['The lamp turns ON when the light value is...', ['Below the threshold', 'Above the threshold', 'Exactly 1023'], 0],
  'ir-object-counter': ['Why check that the state changed before counting?', ['To count each object once', 'To save memory', 'To make it faster'], 0],
  'door-entry-alert': ['What does the magnet do in a reed switch?', ['Closes the switch', 'Makes sound', 'Sends Wi-Fi'], 0],
  'temperature-monitor': ['The LM35 gives how many millivolts per degree?', ['10', '100', '1'], 0],
  'humidity-monitor': ['How often can a DHT11 be read?', ['About every 2 seconds', 'Every microsecond', 'Once a day'], 0],
  'temperature-warning-alarm': ['What does hysteresis prevent?', ['Alarm flickering', 'Overheating the UNO', 'Wi-Fi loss'], 0],
  'soil-moisture-lcd': ['Which pins carry I2C on the UNO?', ['A4 and A5', 'D0 and D1', 'D9 and D10'], 0],
  'digital-potentiometer-demo': ['Which bus controls the MCP41010?', ['SPI', 'Bluetooth', 'USB'], 0],
  'push-button-counter': ['What does INPUT_PULLUP do?', ['Keeps the pin HIGH until pressed', 'Pulls the wire', 'Plays a tone'], 0],
  'buzzer-melody-patterns': ['Which function starts a tone?', ['tone()', 'read()', 'blink()'], 0],
  'traffic-light-controller': ['Which light comes before red?', ['Yellow', 'Blue', 'White'], 0],
  'pedestrian-crossing-signal': ['When people cross, cars must see...', ['Red', 'Green', 'Yellow flashing'], 0],
  'lcd-menu-system': ['Which button opens a menu item?', ['OK', 'UP', 'Reset'], 0],
  'electronic-reaction-timer': ['What happens if you press before the LED lights?', ['Too early', 'You win', 'The LED breaks'], 0],
  'digital-dice': ['Which function makes a random number?', ['random()', 'delay()', 'tone()'], 0],
};
export const projectQuestions = (id) => {
  const p = PROJECT_QUIZ[id];
  const own = p ? [{ q: p[0], o: p[1], a: p[2] }] : [];
  return [...own, ...GENERAL_QUIZ.slice(0, own.length ? 4 : 8)];
};
