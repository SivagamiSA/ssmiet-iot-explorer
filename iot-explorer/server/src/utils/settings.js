import { Setting } from "../models/index.js";

export const SETTING_DEFAULTS = { registrationOpen: true };

/** Current platform settings. Missing document or field = the default (everything open, as before this feature existed). */
export async function getPlatformSettings() {
  const doc = await Setting.findOne({ key: "platform" }).lean();
  return { ...SETTING_DEFAULTS, ...(doc ? { registrationOpen: doc.registrationOpen !== false } : {}) };
}
