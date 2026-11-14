import express from "express";
import cors from "cors";
import "dotenv/config";

import authRoutes from "./routes/auth.js";
import questionnaireRoutes from "./routes/questionnaire.js";
import fridgeRoutes from "./routes/fridge.js";
import menuRoutes from "./routes/menu.js";
import foodRoutes from "./routes/food.js";
import subscriptionRoutes from "./routes/subscription.js";
import adminRoutes from "./routes/admin.js";
import stripeWebhookRoutes from "./routes/stripeWebhook.js";

const app = express();
const PORT = parseInt(process.env.PORT || "8000", 10);

// CORS для отдельного origin (если фронтенд на другом порту)
app.use(
  cors({
    origin: true,
    credentials: true,
  })
);

// Stripe webhook нужен raw body — ставим ДО express.json
app.use("/api/stripe/webhook", stripeWebhookRoutes);

app.use(express.json());

// Маршруты
app.use("/api/auth", authRoutes);
app.use("/api/questionnaire", questionnaireRoutes);
app.use("/api/fridge", fridgeRoutes);
app.use("/api/menu", menuRoutes);
app.use("/api/food", foodRoutes);
app.use("/api/subscription", subscriptionRoutes);
app.use("/api/admin", adminRoutes);

// Health check
app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "aina-evidence-api", time: new Date().toISOString() });
});

app.listen(PORT, "0.0.0.0", () => {
  console.log(`AINA Evidence API запущен на порту ${PORT}`);
});
