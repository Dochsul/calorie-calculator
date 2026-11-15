import jwt from "jsonwebtoken";
import { pool } from "../db.js";

const SECRET = process.env.JWT_SECRET || "aina-dev-jwt-secret-2026";

export function authMiddleware(req, res, next) {
  const header = req.headers.authorization;
  if (!header || !header.startsWith("Bearer ")) {
    return res.status(401).json({ error: "Не авторизован" });
  }
  try {
    const payload = jwt.verify(header.slice(7), SECRET);
    req.userId = payload.userId;
    req.userEmail = payload.email;
    req.isAdmin = payload.isAdmin || false;
    next();
  } catch {
    return res.status(401).json({ error: "Недействительный токен" });
  }
}

// Middleware для админ-доступа
export async function adminMiddleware(req, res, next) {
  if (!req.isAdmin) {
    return res.status(403).json({ error: "Доступ запрещён" });
  }
  next();
}

export function signToken(user) {
  return jwt.sign(
    { userId: user.id, email: user.email, isAdmin: user.is_admin || false },
    SECRET,
    { expiresIn: "30d" }
  );
}
