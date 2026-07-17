/**
 * Middleware to protect routes that require authentication.
 */
export function ensureAuthenticated(req, res, next) {
  if (req.isAuthenticated()) {
    return next();
  }
  res.redirect("/login");
}

/**
 * Middleware to redirect authenticated users away from signup/login pages.
 */
export function ensureGuest(req, res, next) {
  if (!req.isAuthenticated()) {
    return next();
  }
  res.redirect("/");
}
