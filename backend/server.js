import express from "express";
import { fileURLToPath } from "url";
import path from "path";
import { initDb } from "./db.js";
import authRoutes from "./routes/auth.js";
import stateRoutes from "./routes/state.js";
import subscriptionRoutes from "./routes/subscriptions.js";
import adminRoutes from "./routes/admin.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const app = express();
const PORT = process.env.PORT || 3000;

// Raw body для Stripe webhook (нужно ДО express.json)
app.use("/api/subscriptions/webhook", express.raw({ type: "application/json" }));

app.use(express.json({ limit: "10mb" }));

// API routes
app.use("/api/auth", authRoutes);
app.use("/api/state", stateRoutes);
app.use("/api/subscriptions", subscriptionRoutes);
app.use("/api/admin", adminRoutes);
app.get("/api/health", (_req, res) => res.json({ status: "ok" }));

// Serve static frontend files with no-cache headers (dev mode)
const staticDir = path.resolve(__dirname, "..");
app.use(
  express.static(staticDir, {
    setHeaders: (res) => {
      res.setHeader("Cache-Control", "no-cache, must-revalidate");
    },
  })
);

// SPA fallback — non-API routes get index.html
app.get("*", (req, res) => {
  if (req.path.startsWith("/api/"))
    return res.status(404).json({ error: "Not found" });
  res.sendFile(path.join(staticDir, "index.html"));
});

async function start() {
  await initDb();
  app.listen(PORT, "0.0.0.0", () =>
    console.log(`Aina Évidence server running on port ${PORT}`)
  );
}

start().catch((err) => {
  console.error("Failed to start:", err);
  process.exit(1);
});
