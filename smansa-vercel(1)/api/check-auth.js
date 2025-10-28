const { verify, parseCookies, sendJSON } = require("./_utils");
module.exports = async (req, res) => {
  const cookies = parseCookies(req);
  const payload = verify(cookies.token || "");
  if (!payload) return sendJSON(res, 401, { ok: false, user: null });
  sendJSON(res, 200, { ok: true, user: payload.user });
};
