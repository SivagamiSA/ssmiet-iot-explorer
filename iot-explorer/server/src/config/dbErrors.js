// Turns raw MongoDB connection failures into an accurate explanation, and checks the connection string before connecting.
// No credentials are ever printed: only the scheme and host are shown.

export function validateMongoUri(uri) {
  if (!/^mongodb(\+srv)?:\/\//.test(uri)) return "MONGODB_URI must start with mongodb+srv:// (Atlas) or mongodb://.";
  if (/YOUR_PASSWORD|YOUR_USER|YOUR_CLUSTER|<password>|<username>|<db_password>/i.test(uri)) return "MONGODB_URI still contains placeholder text (YOUR_USER / YOUR_PASSWORD / <password>). Paste your real Atlas connection string.";
  return null;
}

export const hostOf = (uri) => { const m = /@([^/?]+)/.exec(uri ?? ""); return m ? m[1] : "(host not found in MONGODB_URI)"; };

/** { title, steps[] } for the most likely real cause of a failed connect. Never claims a fix that was not verified. */
export function explainConnectionError(err, uri) {
  const msg = String(err?.message ?? err);
  const host = hostOf(uri);
  if (/querySrv|ENOTFOUND _mongodb|ESERVFAIL|ETIMEOUT.*_mongodb/i.test(msg)) {
    return { title: `DNS lookup for the Atlas SRV record failed (${msg.split(" ").slice(0, 3).join(" ")}).`, steps: [
      "This is a DNS / network problem on THIS computer or network, not a problem with your password or with the app code. The database was never contacted.",
      `1. Check the cluster host in MONGODB_URI is correct (${host}); copy it again from Atlas > Connect > Drivers.`,
      "2. Check you are online, then try another network (a phone hotspot is a quick test). College/ISP DNS and some routers refuse SRV lookups.",
      "3. Switch the computer's DNS to 8.8.8.8 / 1.1.1.1, or set MONGODB_DNS_SERVERS=8.8.8.8,1.1.1.1 in .env (makes only this app use them).",
      "4. Or use Atlas's non-SRV string: Connect > Drivers > choose an older driver version, copy the mongodb://... (not +srv) string into MONGODB_URI.",
    ] };
  }
  if (/bad auth|Authentication failed|auth failed/i.test(msg)) return { title: "Atlas rejected the username or password.", steps: ["Check the database user and password in MONGODB_URI (Atlas > Database Access). URL-encode special characters in the password (@ becomes %40)."] };
  if (/ENOTFOUND|EAI_AGAIN/i.test(msg)) return { title: `The host name could not be resolved (${host}).`, steps: ["Check the host in MONGODB_URI and your internet / DNS connection."] };
  if (/ECONNREFUSED|ETIMEDOUT|Server selection timed out|MongoServerSelectionError|ReplicaSetNoPrimary/i.test(msg)) {
    return { title: "The database server could not be reached.", steps: [
      "Atlas > Network Access: add the IP address the server runs from (on Render, add Render's outbound IPs from the service's Connect menu, or 0.0.0.0/0 while testing).",
      "Check the Atlas cluster is not paused, and that your network allows outbound port 27017.",
    ] };
  }
  return { title: "Could not connect to MongoDB.", steps: ["See the message above. Check MONGODB_URI and Atlas Network Access."] };
}
