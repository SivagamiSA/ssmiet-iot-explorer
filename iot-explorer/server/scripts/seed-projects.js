// Adds the 5 starter projects as APPROVED so students can see them. Safe to run again.  Run: npm run seed
import mongoose from "mongoose";
import { connectDB } from "../src/config/db.js";
import { Project } from "../src/models/index.js";

const PROJECTS = [
  { slug: "led-blinking", title: "LED Blinking", summary: "Make an LED turn on and off with your first Arduino program.", difficulty: "Beginner", image: "/images/projects/led-blinking.jpg" },
  { slug: "ultrasonic-distance", title: "Ultrasonic Distance Detector", summary: "Measure how far away an object is using sound waves.", difficulty: "Beginner", image: "/images/projects/ultrasonic-distance.jpg" },
  { slug: "temperature-monitoring", title: "Temperature Monitoring", summary: "Read the room temperature and show it on a screen.", difficulty: "Beginner", image: "/images/projects/temperature-monitor.jpg" },
  { slug: "smart-irrigation", title: "Smart Irrigation", summary: "A soil moisture sensor decides when the pump should run.", difficulty: "Intermediate", image: "/images/projects/smart-irrigation.jpg" },
  { slug: "buzzer-alert", title: "Buzzer Alert System", summary: "Sound a buzzer when something gets too close.", difficulty: "Beginner", image: "/images/projects/buzzer-alert.jpg" },
];

await connectDB();
for (const [i, p] of PROJECTS.entries()) {
  // $set keeps the text current; status is only set on first insert so an admin can later un-approve a project.
  await Project.updateOne({ slug: p.slug }, { $set: { ...p, order: i }, $setOnInsert: { status: "approved" } }, { upsert: true });
}
console.log(`Seeded ${PROJECTS.length} projects.`);
await mongoose.disconnect();
