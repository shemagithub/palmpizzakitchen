import jwt from "jsonwebtoken";

export function signToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, role: user.role, name: user.name },
    process.env.JWT_SECRET || "palm_pizza_dev_secret",
    { expiresIn: "7d" },
  );
}

export function authRequired(req, res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) {
    return res.status(401).json({ error: "Sign in required." });
  }
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || "palm_pizza_dev_secret");
    next();
  } catch {
    return res.status(401).json({ error: "Invalid or expired session." });
  }
}

export function adminRequired(req, res, next) {
  authRequired(req, res, () => {
    if (req.user?.role !== "admin") {
      return res.status(403).json({ error: "Admin access required." });
    }
    next();
  });
}

export function optionalAuth(req, _res, next) {
  const header = req.headers.authorization || "";
  const token = header.startsWith("Bearer ") ? header.slice(7) : null;
  if (!token) return next();
  try {
    req.user = jwt.verify(token, process.env.JWT_SECRET || "palm_pizza_dev_secret");
  } catch {
    /* ignore */
  }
  next();
}
