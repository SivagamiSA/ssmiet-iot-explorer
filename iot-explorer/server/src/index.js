import dns from "node:dns";
import { env } from "./config/env.js";
import { connectDB } from "./config/db.js";
import { createApp } from "./app.js";

dns.setServers(["8.8.8.8", "1.1.1.1"]);
await connectDB();
createApp().listen(env.port, () => console.log(`[api] Running on http://localhost:${env.port}`));
