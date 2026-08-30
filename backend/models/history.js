import db from "../db/index.js";

/**
 * Logs a user's search query in the search history.
 * @param {number} userId 
 * @param {string} queryText 
 * @param {string} searchType - 'name', 'cuisine', or 'random'
 * @returns {Promise<object>} The logged search record.
 */
export async function logSearch(userId, queryText, searchType) {
  if (!userId || !queryText) return null;
  const queryTextSQL = `
    INSERT INTO search_history (user_id, query_text, search_type)
    VALUES ($1, $2, $3)
    RETURNING *;
  `;
  const values = [userId, queryText.trim(), searchType];
  const res = await db.query(queryTextSQL, values);
  return res.rows[0];
}

/**
 * Retrieves recent unique searches for a specific user.
 * @param {number} userId 
 * @param {number} limit 
 * @returns {Promise<Array>} List of recent unique searches.
 */
export async function getRecentSearches(userId, limit = 6) {
  // Deduplicate by distinct query_text (case-insensitive) ordered by newest searched_at
  const queryText = `
    SELECT query_text, search_type, MAX(searched_at) as latest_searched_at
    FROM search_history
    WHERE user_id = $1
    GROUP BY query_text, search_type
    ORDER BY latest_searched_at DESC
    LIMIT $2;
  `;
  const values = [userId, limit];
  const res = await db.query(queryText, values);
  return res.rows.map((row, idx) => ({
    id: idx + 1,
    query_text: row.query_text,
    search_type: row.search_type,
    searched_at: row.latest_searched_at
  }));
}
