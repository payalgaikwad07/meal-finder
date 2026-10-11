import jwt from "jsonwebtoken";

const JWT_SECRET = process.env.JWT_SECRET || process.env.SESSION_SECRET;
if (!JWT_SECRET) {
  if (process.env.NODE_ENV === "production") {
    throw new Error("FATAL: JWT_SECRET environment variable is required in production!");
  } else {
    console.warn("⚠️ Warning: JWT_SECRET not set in development. Using fallback secret for local dev only.");
  }
}

const EFFECTIVE_JWT_SECRET = JWT_SECRET || "yumplan_dev_secret_only_local_2026";

/**
 * Generates a signed JWT token for a user.
 */
export function generateToken(user) {
  return jwt.sign(
    { id: user.id, email: user.email, name: user.name },
    EFFECTIVE_JWT_SECRET,
    { expiresIn: "30d" }
  );
}

/**
 * Middleware that extracts user from JWT header and attaches to req.user.
 * Does not query DB repeatedly - uses verified token payload.
 * Does not block unauthenticated requests.
 */
export function authenticateOptional(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (authHeader && authHeader.startsWith("Bearer ")) {
      const token = authHeader.substring(7);
      const decoded = jwt.verify(token, EFFECTIVE_JWT_SECRET);
      if (decoded && decoded.id) {
        req.user = {
          id: decoded.id,
          email: decoded.email,
          name: decoded.name,
        };
      }
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
export function ensureAuthenticated(req, res, next) {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer ")) {
      return res.status(401).json({ error: "Unauthorized. Please log in." });
    }

    const token = authHeader.substring(7);
    const decoded = jwt.verify(token, EFFECTIVE_JWT_SECRET);
    if (!decoded || !decoded.id) {
      return res.status(401).json({ error: "Invalid token payload." });
    }

    req.user = {
      id: decoded.id,
      email: decoded.email,
      name: decoded.name,
    };
    return next();
  } catch (err) {
    return res.status(401).json({ error: "Invalid or expired token. Please log in again." });
  }
}
