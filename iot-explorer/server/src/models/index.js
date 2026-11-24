// All models live in the SAME database (`iot_explorer`). Add each future collection here, one file per model.
// Reference students with: { type: mongoose.Schema.Types.ObjectId, ref: "Student" }
export { default as Student } from "./Student.js";
export { default as Admin } from "./Admin.js";
export { default as StudentProgress } from "./StudentProgress.js";
export { default as Project } from "./Project.js";
export { default as Event } from "./Event.js";
export { default as Certificate } from "./Certificate.js";
export { default as AuditLog } from "./AuditLog.js";
export { default as School } from "./School.js";
export { default as Component } from "./Component.js";
export { default as Setting } from "./Setting.js";
export { default as FinalAttempt } from "./FinalAttempt.js";
