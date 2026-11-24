import jwt from "jsonwebtoken";
import { env } from "../config/env.js";

export function signToken(user) {
  return jwt.sign({ role: user.role }, env.jwtSecret, {
    subject: String(user._id),
    expiresIn: env.jwtExpiresIn,
    algorithm: "HS256",
    issuer: "iot-explorer",
  });
}

export function verifyToken(token) {
  return jwt.verify(token, env.jwtSecret, { algorithms: ["HS256"], issuer: "iot-explorer" });
}
