// Fixed learning catalogue and gamification rules. Lesson CONTENT is added in Part 2;
// the ids below are what progress is saved against, so keep them stable.
export const LESSONS = [
  { id: "arduino", title: "Arduino basics" },
  { id: "raspberry-pi", title: "Raspberry Pi basics" },
  { id: "esp8266", title: "ESP8266 and Wi-Fi" },
  { id: "sensors", title: "Sensors" },
  { id: "actuators", title: "Actuators" },
  { id: "iot-applications", title: "IoT applications" },
];

export const POINTS_PER_LEVEL = 100;
export const LESSON_POINTS = 20; // awarded once per lesson, the first time it is completed

// Badges are worked out from a student's saved progress every time the dashboard loads.
export const BADGES = [
  { key: "first-lesson", title: "First Step", description: "Complete your first lesson.", earned: (s) => s.lessonsDone >= 1 },
  { key: "half-way", title: "Half Way There", description: "Complete half of the lessons.", earned: (s) => s.totalLessons > 0 && s.lessonsDone * 2 >= s.totalLessons },
  { key: "all-lessons", title: "IoT Scholar", description: "Complete every lesson.", earned: (s) => s.totalLessons > 0 && s.lessonsDone >= s.totalLessons },
  { key: "first-sim", title: "Circuit Builder", description: "Finish a circuit simulation.", earned: (s) => s.simsPassed >= 1 },
  { key: "first-quiz", title: "Quiz Taker", description: "Take your first quiz.", earned: (s) => s.quizzesTaken >= 1 },
  { key: "quiz-ace", title: "Quiz Ace", description: "Score 80% or more in a quiz.", earned: (s) => s.bestQuizPercent >= 80 },
  { key: "certified", title: "Certified Explorer", description: "Earn a certificate.", earned: (s) => s.certificates >= 1 },
];

export const levelFor = (points) => {
  const level = Math.floor(points / POINTS_PER_LEVEL) + 1;
  return { level, pointsIntoLevel: points % POINTS_PER_LEVEL, pointsForNext: POINTS_PER_LEVEL };
};
