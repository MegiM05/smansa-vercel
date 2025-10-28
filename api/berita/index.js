const path = require("path");
const fs = require("fs/promises");
const Busboy = require("busboy");
const { requireAuth, readDB, writeDB, sendJSON } = require("../_utils");
const IS_VERCEL = !!process.env.VERCEL;

module.exports = async (req, res) => {
  if (req.method === "GET") {
    const db = await readDB();
    return sendJSON(res, 200, db.berita || []);
  }
  if (req.method === "POST") {
    const user = requireAuth(req, res);
    if (!user) return;
    try {
      const parsed = await parseMultipart(req);
      const { judul = "", deskripsi = "", konten_lengkap = "" } = parsed.fields;
      let imageUrl = "";
      
if (parsed.file) {
        const ext = (parsed.file.filename || "").split(".").pop() || "jpg";
        const name = `${Date.now()}-${Math.random().toString(36).slice(2, 8)}.${ext}`;
        if (IS_VERCEL) {
          // Store as inline base64 to avoid file writes in serverless env
          const base64 = parsed.file.buffer.toString("base64");
          imageUrl = `data:${parsed.file.mimeType};base64,${base64}`;
        } else {
          const uploadsDir = path.join(process.cwd(), "public", "uploads");
          await fs.mkdir(uploadsDir, { recursive: true });
          const dest = path.join(uploadsDir, name);
          await fs.writeFile(dest, parsed.file.buffer);
          imageUrl = `/uploads/${name}`;
        }
      }
      const db = await readDB();

      const nextId = calcNextId(db.berita || []);
      const item = { id: nextId, judul, deskripsi, konten_lengkap, imageUrl, tanggal: new Date().toISOString() };
      db.berita = db.berita || [];
      db.berita.push(item);
      await writeDB(db);
      return sendJSON(res, 200, { ok: true, data: item });
    } catch (e) {
      console.error(e);
      return sendJSON(res, 400, { ok: false, error: "bad_request" });
    }
  }
  sendJSON(res, 405, { ok: false, error: "method_not_allowed" });
};

function calcNextId(arr) {
  if (!Array.isArray(arr) || arr.length === 0) return 1;
  const maxId = arr.reduce((m, it) => Math.max(m, parseInt(it.id) || 0), 0);
  return maxId + 1;
}

function parseMultipart(req) {
  return new Promise((resolve, reject) => {
    try {
      const busboy = Busboy({ headers: req.headers });
      const fields = {};
      let file = null;
      busboy.on("file", (name, fileStream, info) => {
        const chunks = [];
        fileStream.on("data", (d) => chunks.push(d));
        fileStream.on("end", () => {
          file = { fieldname: name, filename: info.filename, encoding: info.encoding, mimeType: info.mimeType, buffer: Buffer.concat(chunks) };
        });
      });
      busboy.on("field", (name, val) => {
        fields[name] = val;
      });
      busboy.on("error", reject);
      busboy.on("finish", () => resolve({ fields, file }));
      req.pipe(busboy);
    } catch (err) {
      reject(err);
    }
  });
}
