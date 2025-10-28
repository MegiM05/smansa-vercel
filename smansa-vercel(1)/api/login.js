const { ADMIN_PASS, setCookie, sign, sendJSON, readBody } = require("./_utils");
module.exports = async (req, res) => {
  if (req.method !== "POST") return sendJSON(res, 405, { ok: false, error: "method_not_allowed" });
  const body = await readBody(req);
  const password = (body && (body.password || body.pass)) || null;
  if (password && password === ADMIN_PASS) {
    const token = sign({ user: "admin", iat: Date.now() });
    setCookie(res, "token", token, { httpOnly: true, maxAge: 60 * 60 * 24 * 7, sameSite: "Lax" });
    return sendJSON(res, 200, { ok: true, user: "admin" });
  }
  sendJSON(res, 401, { ok: false, error: "invalid_credentials" });
};
