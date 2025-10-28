const { requireAuth, readDB, writeDB, sendJSON, readBody } = require("./_utils");

module.exports = async (req, res) => {
  if (req.method === "GET") {
    const db = await readDB();
    return sendJSON(res, 200, { siswa: db.siswa });
  }
  if (req.method === "POST") {
    const user = requireAuth(req, res);
    if (!user) return;
    const body = await readBody(req);
    const entry = {
      id: Date.now(),
      ...body,
      createdAt: new Date().toISOString()
    };
    const db = await readDB();
    db.siswa.unshift(entry);
    await writeDB(db);
    return sendJSON(res, 200, { ok: true, data: entry });
  }
  sendJSON(res, 405, { ok: false, error: "method_not_allowed" });
};
