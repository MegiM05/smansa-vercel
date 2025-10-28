const path = require("path");
const fs = require("fs/promises");
const { requireAuth, readDB, writeDB, sendJSON } = require("../_utils");

module.exports = async (req, res) => {
  if (req.method !== "DELETE") return sendJSON(res, 405, { ok: false, error: "method_not_allowed" });

  const user = requireAuth(req, res);
  if (!user) return;

  const idStr = extractId(req.url);
  if (!idStr) return sendJSON(res, 400, { ok: false, error: "missing_id" });
  const id = parseInt(idStr);

  const db = await readDB();
  const idx = (db.berita || []).findIndex((b) => parseInt(b.id) === id);
  if (idx === -1) return sendJSON(res, 404, { ok: false, error: "not_found" });

  const item = db.berita[idx];
  if (item.imageUrl && item.imageUrl.startsWith("/uploads/")) {
    try {
      const p = path.join(process.cwd(), "public", item.imageUrl.replace(/^\//, ""));
      await fs.unlink(p);
    } catch {}
  }

  db.berita.splice(idx, 1);
  await writeDB(db);
  sendJSON(res, 200, { ok: true });
};

function extractId(url) {
  try {
    const cut = url.split("/api/berita/")[1] || "";
    const id = cut.split("?")[0].split("#")[0];
    return id || null;
  } catch {
    return null;
  }
}
