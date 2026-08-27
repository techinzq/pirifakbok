import express from "express";
import adminAuth from "./admin-auth.mjs";
import adminConfig from "./admin-config.mjs";
import adminTeam from "./admin-team.mjs";
import background from "./background.mjs";
import publicConfig from "./public-config.mjs";
import stickerLibrary from "./sticker-library.mjs";
import submissionImage from "./submission-image.mjs";
import submissions from "./submissions.mjs";

const app = express();
app.set("trust proxy", 1);

const allowedOrigins = new Set([
  "https://fakbok-pr.onrender.com",
  ...(process.env.FRONTEND_ORIGIN
    ? process.env.FRONTEND_ORIGIN.split(",").map(x => x.trim()).filter(Boolean)
    : [])
]);

app.use((req, res, next) => {
  const origin = req.headers.origin;

  if (origin && allowedOrigins.has(origin)) {
    res.setHeader("Access-Control-Allow-Origin", origin);
  }

  res.setHeader("Vary", "Origin");
  res.setHeader(
    "Access-Control-Allow-Headers",
    "Content-Type, X-Admin-User, X-Admin-Pass"
  );
  res.setHeader(
    "Access-Control-Allow-Methods",
    "GET, POST, PATCH, DELETE, OPTIONS"
  );

  if (req.method === "OPTIONS") return res.sendStatus(204);
  next();
});

app.use(express.raw({ type: () => true, limit: "30mb" }));

function requestUrl(req) {
  const host = req.get("host");
  const proto = req.protocol || "https";
  return `${proto}://${host}${req.originalUrl}`;
}

async function bridge(req, res, handler) {
  try {
    const headers = new Headers();

    for (const [k, v] of Object.entries(req.headers)) {
      if (v === undefined) continue;
      headers.set(k, Array.isArray(v) ? v.join(", ") : String(v));
    }

    const init = {
      method: req.method,
      headers
    };

    if (!["GET", "HEAD"].includes(req.method) && req.body?.length) {
      init.body = req.body;
    }

    const webReq = new Request(requestUrl(req), init);
    const out = await handler(webReq);

    res.status(out.status);
    out.headers.forEach((v, k) => res.setHeader(k, v));

    const buf = Buffer.from(await out.arrayBuffer());
    res.send(buf);
  } catch (err) {
    console.error("API route error:", err);
    res.status(500).json({
      error: "Internal server error",
      detail: String(err?.message || err)
    });
  }
}

app.get("/", (req, res) => {
  res.json({
    status: "API is running",
    message: "fakbok api",
    storage: process.env.SUPABASE_URL ? "supabase" : "not configured"
  });
});

app.all("/admin-auth", (req, res) => bridge(req, res, adminAuth));
app.all("/admin-config", (req, res) => bridge(req, res, adminConfig));
app.all("/admin-team", (req, res) => bridge(req, res, adminTeam));
app.all("/background", (req, res) => bridge(req, res, background));
app.all("/public-config", (req, res) => bridge(req, res, publicConfig));
app.all("/sticker-library", (req, res) => bridge(req, res, stickerLibrary));
app.all("/submission-image", (req, res) =>
  bridge(req, res, submissionImage)
);
app.all("/submissions", (req, res) => bridge(req, res, submissions));

const PORT = process.env.PORT || 3000;

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
