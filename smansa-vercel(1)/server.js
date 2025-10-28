const http = require("http");
const path = require("path");
const fs = require("fs");
const fsp = require("fs/promises");

const PORT = process.env.PORT || 3000;
const PUBLIC_DIR = path.join(process.cwd(), "public");

const routes = {
  "/api/health": require("./api/health"),
  "/api/login": require("./api/login"),
  "/api/logout": require("./api/logout"),
  "/api/check-auth": require("./api/check-auth"),
  "/api/siswa": require("./api/siswa"),
  "/api/simpan": require("./api/simpan"),
  "/api/berita": require("./api/berita/index"),
};

const mime = {
  ".html":"text/html; charset=utf-8",".css":"text/css; charset=utf-8",".js":"application/javascript; charset=utf-8",
  ".json":"application/json; charset=utf-8",".png":"image/png",".jpg":"image/jpeg",".jpeg":"image/jpeg",
  ".gif":"image/gif",".svg":"image/svg+xml",".ico":"image/x-icon",".webp":"image/webp",".txt":"text/plain; charset=utf-8",
};

function render404(res) {
  try {
    const p = path.join(PUBLIC_DIR, "404.html");
    if (fs.existsSync(p)) {
      res.statusCode = 404;
      res.setHeader("Content-Type","text/html; charset=utf-8");
      return fs.createReadStream(p).pipe(res);
    }
  } catch {}
  res.statusCode = 404;
  res.setHeader("Content-Type", "text/plain; charset=utf-8");
  res.end("Not found");
}

async function serveStatic(req, res, pathname) {
  let rel = decodeURIComponent(pathname);
  rel = path.normalize(rel).replace(/^(\.\.[\/\\])+/, "");

  const aliases = {
    "/": "index.html",
    "/index": "index.html",
    "/login": "login.html",
    "/admin": "settings.html",
    "/event": "event.html",
    "/view-daftar": "view-daftar.html",
    "/404": "404.html",
  };

  if (aliases[rel]) rel = aliases[rel];

  if (!path.extname(rel)) {
    const tryHtml = path.join(PUBLIC_DIR, rel + ".html");
    try {
      const st = await fsp.stat(tryHtml);
      if (st.isFile()) {
        res.statusCode = 200;
        res.setHeader("Content-Type", mime[".html"]);
        return fs.createReadStream(tryHtml).pipe(res);
      }
    } catch {}
  }

  rel = rel.replace(/^\/+/, "");
  const filePath = path.join(PUBLIC_DIR, rel);
  try {
    const stat = await fsp.stat(filePath);
    if (!stat.isFile()) return render404(res);
    const ext = path.extname(filePath).toLowerCase();
    res.statusCode = 200;
    res.setHeader("Content-Type", mime[ext] || "application/octet-stream");
    fs.createReadStream(filePath).pipe(res);
  } catch {
    return render404(res);
  }
}

const server = http.createServer(async (req, res) => {
  try {
    const url = new URL(req.url, `http://${req.headers.host}`);
    const pathname = url.pathname;

    if (pathname.startsWith("/api/berita/")) {
      const handler = require("./api/berita/[id]");
      return handler(req, res);
    }

    if (routes[pathname]) {
      return routes[pathname](req, res);
    }

    return serveStatic(req, res, pathname);
  } catch (e) {
    console.error(e);
    res.statusCode = 500;
    res.setHeader("Content-Type", "text/plain; charset=utf-8");
    res.end("Internal Server Error");
  }
});

server.listen(PORT, () => console.log(`Server running at http://localhost:${PORT}`));
