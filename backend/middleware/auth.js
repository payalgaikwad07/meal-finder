import jwt from "jsonwebtoken";
import { findUserById } from "../models/user.js";

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET || "yumplan_super_secure_jwt_secret_key_2026";

/**
 * Generates a signed JWT token for a user.
 */
export function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    JWT_SECRET,
    { expiresIn: "30d" }
  );
}

/**
 * Middleware that extracts user from JWT header (or session) and attaches to req.user.
 * Does not block unauthenticated requests.
 */
export async function authenticateOptional(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await findUserById(decoded.id);
      if (user) {
        req.user = user;
      }
    } else if (req.isAuthenticated && req.isAuthenticated()) {
      // Session fallback
    }
  } catch (err) {
    // Token expired or invalid - ignore for optional auth
    req.user = null;
  }
  next();
}

/**
 * Middleware that strictly protects routes. Returns 401 JSON if unauthorized.
 */
export async function ensureAuthenticated(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, JWT_SECRET);
      const user = await findUserById(decoded.id);
      if (user) {
        req.user = user;
        return next();
      }
    } else if (req.isAuthenticated && req.isAuthenticated()) {
      return next();
    }
    return res.status(401).json({ error: "Unauthorized. Please log in." });
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token. Please log in again." });
  }
}
