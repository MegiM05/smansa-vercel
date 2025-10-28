const { requireAuth, readDB, writeDB, sendJSON, readBody } = require("./_utils");

module.exports = async (req, res) => {
  if (req.method !== "POST") {
    return sendJSON(res, 405, { ok: false, error: "method_not_allowed" });
  }
  const user = requireAuth(req, res);
  if (!user) return;

  const body = await readBody(req);

  if (body && Array.isArray(body.siswa)) {
    const db = await readDB();
    db.siswa = body.siswa;
    await writeDB(db);
    return sendJSON(res, 200, { ok: true, message: "siswa updated" });
  }

  const db = await readDB();
  const entry = {
    id: Date.now(),
    ...body,
    createdAt: new Date().toISOString()
  };
  db.siswa.unshift(entry);
  await writeDB(db);
  return sendJSON(res, 200, { ok: true, data: entry });
};
