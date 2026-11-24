import test from "node:test";
import assert from "node:assert/strict";
import { validateMongoUri, explainConnectionError, hostOf } from "../src/config/dbErrors.js";

test("connection string validation", () => {
  assert.equal(validateMongoUri("mongodb+srv://u:p@embeddediot.5ctnk8f.mongodb.net/?retryWrites=true"), null);
  assert.equal(validateMongoUri("mongodb://127.0.0.1:27017/x"), null);
  assert.match(validateMongoUri("localhost:27017"), /must start with/);
  assert.match(validateMongoUri("mongodb+srv://YOUR_USER:YOUR_PASSWORD@YOUR_CLUSTER.mongodb.net/"), /placeholder/);
});

test("querySrv ECONNREFUSED is explained as DNS/network, not as a password or IP problem, and shows no credentials", () => {
  const uri = "mongodb+srv://admin:Secret%40123@embeddediot.5ctnk8f.mongodb.net/?retryWrites=true";
  const e = explainConnectionError(new Error("querySrv ECONNREFUSED _mongodb._tcp.embeddediot.5ctnk8f.mongodb.net"), uri);
  const text = JSON.stringify(e);
  assert.match(e.title, /DNS/); assert.match(text, /8\.8\.8\.8/); assert.match(text, /non-SRV|mongodb:\/\//);
  assert.ok(!/Secret|admin:/.test(text)); assert.equal(hostOf(uri), "embeddediot.5ctnk8f.mongodb.net");
});

test("other failures are classified", () => {
  assert.match(explainConnectionError(new Error("bad auth : Authentication failed."), "mongodb+srv://a:b@h.mongodb.net").title, /username or password/);
  assert.match(explainConnectionError(new Error("Server selection timed out after 10000 ms"), "mongodb+srv://a:b@h.mongodb.net").steps.join(" "), /Network Access/);
});
