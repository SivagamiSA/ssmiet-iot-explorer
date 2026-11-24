import crypto from "node:crypto";
import { createRequire } from "node:module";

// The 300-question final assessment bank (200 project + 100 component questions).
// It lives on the SERVER on purpose: the browser only ever receives the 10 questions of one attempt, without answers.
const bank = createRequire(import.meta.url)("./finalAssessment.json");

export const FINAL_QUIZ_ID = "final-assessment";
export const FINAL_TITLE = "Embedded IoT Experience Session";
export const COLLEGE_NAME = "SSM Institute of Engineering and Technology (Autonomous)"; // also printed on the blue certificate template
export const FINAL_QUESTION_COUNT = 50;
export const FINAL_PASS_PERCENT = 60; // 60% or more passes (6 of 10)
export const FINAL_POINTS = 50; // awarded once, on the first pass
export const FINAL_ATTEMPT_HOURS = 3; // an unfinished attempt is resumed for this long (e.g. after a page refresh)

// Flatten both groups into one pool. The key is unique across all 300 questions.
export const POOL = [
  ...Object.entries(bank.project_categories.projects).flatMap(([topic, list]) => list.map((q) => ({ ...q, kind: "Project", topic, key: `p|${topic}|${q.id}` }))),
  ...Object.entries(bank.component_categories.components).flatMap(([topic, list]) => list.map((q) => ({ ...q, kind: "Component", topic, key: `c|${topic}|${q.id}` }))),
];
export const POOL_BY_KEY = new Map(POOL.map((q) => [q.key, q]));

// Fisher-Yates with a cryptographic random source (a plain sort(() => Math.random() - 0.5) is biased).
export function shuffle(list) {
  const a = [...list];
  for (let i = a.length - 1; i > 0; i--) {
    const j = crypto.randomInt(i + 1);
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** Shuffles all 300 questions and takes the first 10; the A-D options of each are shuffled too. */
export const pickQuestions = (n = FINAL_QUESTION_COUNT) =>
  shuffle(POOL).slice(0, n).map((q) => ({ key: q.key, order: shuffle(["A", "B", "C", "D"]) }));

/** What the browser is allowed to see for one picked question: text and options, never the answer. */
export const publicQuestion = ({ key, order }) => {
  const q = POOL_BY_KEY.get(key);
  return { kind: q.kind, topic: q.topic, question: q.question, options: order.map((letter) => q.options[letter]) };
};

/** True when the chosen position (0-3 in the shuffled order) is the right answer. */
export const isCorrect = ({ key, order }, picked) => Number.isInteger(picked) && POOL_BY_KEY.get(key).answer === order[picked];
