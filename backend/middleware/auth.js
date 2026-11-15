import jwt from "jsonwebtoken";

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
    next();
  } catch {
    return res.status(401).json({ error: "Недействительный токен" });
  }
}

export function signToken(user) {
  return jwt.sign({ userId: user.id, email: user.email }, SECRET, {
    expiresIn: "30d",
  });
}
