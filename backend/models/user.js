import db from "../db/index.js";

/**
 * Creates a new user in the database.
 * @param {string} name 
 * @param {string} email 
 * @param {string} passwordHash 
 * @returns {Promise<object>} The created user.
 */
export async function createUser(name, email, passwordHash) {
  const queryText = `
    INSERT INTO users (name, email, password_hash)
    VALUES ($1, $2, $3)
    RETURNING id, name, email, created_at;
  `;
  const values = [name, email.toLowerCase().trim(), passwordHash];
  const res = await db.query(queryText, values);
  return res.rows[0];
}

/**
 * Finds a user by email address.
 * @param {string} email 
 * @returns {Promise<object|null>} The user object or null.
 */
export async function findUserByEmail(email) {
  const queryText = `
    SELECT id, name, email, password_hash, created_at
    FROM users
    WHERE email = $1;
  `;
  const values = [email.toLowerCase().trim()];
  const res = await db.query(queryText, values);
  return res.rows[0] || null;
}

/**
 * Finds a user by their user ID.
 * @param {number} id 
 * @returns {Promise<object|null>} The user object or null.
 */
export async function findUserById(id) {
  const queryText = `
    SELECT id, name, email, created_at
    FROM users
    WHERE id = $1;
  `;
  const values = [id];
  const res = await db.query(queryText, values);
  return res.rows[0] || null;
}
