import db from "../db/index.js";

/**
 * Logs a user's search query in the search history.
 * @param {number} userId 
 * @param {string} queryText 
 * @param {string} searchType - 'name', 'cuisine', or 'random'
 * @returns {Promise<object>} The logged search record.
 */
export async function logSearch(userId, queryText, searchType) {
  if (!userId) return null; // Only log for logged-in users
  const queryTextSQL = `
    INSERT INTO search_history (user_id, query_text, search_type)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;
  const values = [userId, queryText, searchType];
  const res = await db.query(queryTextSQL, values);
  return res.rows[0];
}

/**
 * Retrieves recent searches for a specific user.
 * @param {number} userId 
 * @param {number} limit 
 * @returns {Promise<Array>} List of recent searches.
 */
export async function getRecentSearches(userId, limit = 5) {
  const queryText = `
    SELECT id, query_text, search_type, searched_at
    FROM search_history
    WHERE user_id = $1
    ORDER BY searched_at DESC
    LIMIT $2;
  `;
  const values = [userId, limit];
  const res = await db.query(queryText, values);
  return res.rows;
}
