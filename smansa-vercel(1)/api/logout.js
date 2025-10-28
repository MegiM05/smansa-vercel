const { setCookie, sendJSON } = require("./_utils");
module.exports = (req, res) => {
  setCookie(res, "token", "", { httpOnly: true, maxAge: 0, sameSite: "Lax" });
  sendJSON(res, 200, { ok: true });
};
