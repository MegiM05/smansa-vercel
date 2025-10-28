const path = require("path");
const fs = require("fs/promises");
const crypto = require("crypto");

const IS_VERCEL = !!process.env.VERCEL;
const DATA_DIR = IS_VERCEL ? path.join("/tmp", "data") : path.join(process.cwd(), "data");
const DB_PATH = path.join(DATA_DIR, "database.json");

const ADMIN_PASS = "admin123"; // ubah langsung di file ini
const SECRET = "ganti-ini-dengan-rahasia-yang-panjang-dan-unik";

async function ensureDB() {
  // Ensure data directory exists ("/tmp/data" on Vercel, "data" locally)
  await fs.mkdir(DATA_DIR, { recursive: true });
  try {
    // If DB exists in the runtime data dir, nothing else to do
    await fs.stat(DB_PATH);
    return;
  } catch {}
  // Try to seed from repository "data/database.json" if available (read-only on Vercel)
  try {
    const seedPath = path.join(process.cwd(), "data", "database.json");
    const seed = await fs.readFile(seedPath, "utf-8");
    await fs.writeFile(DB_PATH, seed, "utf-8");
    return;
  } catch {}
  // Otherwise initialize a new empty DB
  await fs.writeFile(DB_PATH, JSON.stringify({ siswa: [], berita: [] }, null, 2), "utf-8");
}

async function readDB() {
  await ensureDB();
  const raw = await fs.readFile(DB_PATH, "utf-8");
  try { return JSON.parse(raw); } catch { return { siswa: [], berita: [] }; }
}

async function writeDB(db) {
  await ensureDB();
  await fs.writeFile(DB_PATH, JSON.stringify(db, null, 2), "utf-8");
}

function sendJSON(res, status, obj) {
  res.statusCode = status;
  res.setHeader("Content-Type", "application/json; charset=utf-8");
  res.end(JSON.stringify(obj));
}

function readRaw(req) {
  return new Promise((resolve, reject) => {
    const chunks = [];
    req.on("data", (d) => chunks.push(d));
    req.on("end", () => resolve(Buffer.concat(chunks)));
    req.on("error", reject);
  });
}

async function readBody(req) {
  const raw = await readRaw(req);
  const ct = (req.headers["content-type"] || "").toLowerCase();
  if (ct.includes("application/json")) {
    try { return JSON.parse(raw.toString("utf-8")); } catch { return {}; }
  }
  // urlencoded or others -> parse naive
  const s = raw.toString("utf-8");
  if (!s) return {};
  const out = {};
  for (const part of s.split("&")) {
    const [k, v] = part.split("=");
    if (!k) continue;
    out[decodeURIComponent(k)] = decodeURIComponent((v || "").replace(/\+/g, " "));
  }
  return out;
}

function parseCookies(req) {
  const header = req.headers["cookie"];
  const cookies = {};
  if (!header) return cookies;
  header.split(";").forEach(part => {
    const [k, v] = part.trim().split("=");
    cookies[k] = decodeURIComponent(v || "");
  });
  return cookies;
}

function setCookie(res, name, value, opts = {}) {
  const parts = [`${name}=${encodeURIComponent(value)}`];
  if (opts.httpOnly) parts.push("HttpOnly");
  if (opts.sameSite) parts.push(`SameSite=${opts.sameSite}`);
  if (opts.maxAge) parts.push(`Max-Age=${opts.maxAge}`);
  parts.push("Path=/");
  res.setHeader("Set-Cookie", parts.join("; "));
}

function b64url(input) {
  return Buffer.from(input).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}

function sign(payload) {
  const header = b64url(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64url(JSON.stringify(payload));
  const data = `${header}.${body}`;
  const sig = crypto.createHmac("sha256", SECRET).update(data).digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
  return `${data}.${sig}`;
}

function verify(token) {
  try {
    const [h, b, s] = token.split(".");
    if (!h || !b || !s) return null;
    const data = `${h}.${b}`;
    const expected = crypto.createHmac("sha256", SECRET).update(data).digest("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
    if (expected !== s) return null;
    const payload = JSON.parse(Buffer.from(b, "base64").toString("utf-8"));
    return payload;
  } catch { return null; }
}

function requireAuth(req, res) {
  const { token } = parseCookies(req);
  const payload = token && verify(token);
  if (!payload) {
    sendJSON(res, 401, { ok: false, error: "unauthorized" });
    return null;
  }
  return payload;
}

module.exports = {
  ADMIN_PASS,
  SECRET,
  readDB,
  writeDB,
  sendJSON,
  readBody,
  parseCookies,
  setCookie,
  sign,
  verify,
  requireAuth,
};
