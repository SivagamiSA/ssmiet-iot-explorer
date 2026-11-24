import bcrypt from "bcryptjs";

const COST = 12;
export const hashPassword = (plain) => bcrypt.hash(plain, COST);
export const checkPassword = (plain, hash) => bcrypt.compare(plain, hash);

// Compared when the account doesn't exist, so "unknown user" takes as long as "wrong password".
const DUMMY_HASH = bcrypt.hashSync("not-a-real-password", COST);
export const burnTime = (plain) => bcrypt.compare(plain, DUMMY_HASH);
