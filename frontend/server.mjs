import { createReadStream, existsSync } from "node:fs";
import { stat } from "node:fs/promises";
import { createServer } from "node:http";
import { extname, join, normalize, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = fileURLToPath(new URL(".", import.meta.url));
const port = Number.parseInt(process.env.PORT || "4173", 10);
const host = process.env.HOST || "0.0.0.0";

const contentTypes = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "text/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml; charset=utf-8",
};

function resolvePath(requestUrl) {
  const url = new URL(requestUrl, `http://${host}:${port}`);
  const pathname = decodeURIComponent(url.pathname);
  const normalized = normalize(pathname).replace(/^(\.\.[/\\])+/, "");
  const target = join(root, normalized === "/" ? "index.html" : normalized);
  const rel = relative(root, target);

  if (rel.startsWith("..") || rel === "") {
    return join(root, "index.html");
  }

  return target;
}

const server = createServer(async (req, res) => {
  if (!req.url || !["GET", "HEAD"].includes(req.method || "")) {
    res.writeHead(405);
    res.end("Method Not Allowed");
    return;
  }

  try {
    let filePath = resolvePath(req.url);
    if (!existsSync(filePath)) {
      filePath = join(root, "index.html");
    }
    const fileStat = await stat(filePath);
    if (fileStat.isDirectory()) {
      filePath = join(filePath, "index.html");
    }

    res.writeHead(200, {
      "Content-Type": contentTypes[extname(filePath)] || "application/octet-stream",
      "Cache-Control": "no-store",
      "Content-Security-Policy": "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self' http://127.0.0.1:4000; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
      "Referrer-Policy": "no-referrer",
      "X-Content-Type-Options": "nosniff",
      "X-Frame-Options": "DENY",
    });
    if (req.method === "HEAD") {
      res.end();
      return;
    }
    createReadStream(filePath).pipe(res);
  } catch {
    res.writeHead(404, { "Content-Type": "text/plain; charset=utf-8" });
    res.end("Not Found");
  }
});

server.listen(port, host, () => {
  const displayHost = host === "0.0.0.0" ? "127.0.0.1" : host;
  console.log(`Keio Book minimal app: http://${displayHost}:${port}`);
});
