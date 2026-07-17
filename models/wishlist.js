import db from "../db/index.js";

/**
 * Adds a recipe to the user's wishlist.
 * @param {number} userId 
 * @param {string|null} mealId - Null for custom AI recipes
 * @param {string} mealName 
 * @param {string|null} mealThumb 
 * @param {boolean} isAiGenerated 
 * @param {object|null} recipeDetails 
 * @returns {Promise<object>} The added wishlist record.
 */
export async function addToWishlist(userId, mealId, mealName, mealThumb, isAiGenerated = false, recipeDetails = null) {
  // If mealId is null (AI suggestion), insert directly without conflict check
  if (!mealId) {
    const queryTextAI = `
      INSERT INTO wishlist (user_id, meal_id, meal_name, meal_thumb, is_ai_generated, recipe_details)
      VALUES ($1, NULL, $2, $3, $4, $5)
      RETURNING *;
    `;
    const valuesAI = [userId, mealName, mealThumb, isAiGenerated, recipeDetails];
    const res = await db.query(queryTextAI, valuesAI);
    return res.rows[0];
  }

  const queryText = `
    INSERT INTO wishlist (user_id, meal_id, meal_name, meal_thumb, is_ai_generated, recipe_details)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (user_id, meal_id) WHERE meal_id IS NOT NULL DO UPDATE 
    SET meal_name = EXCLUDED.meal_name, meal_thumb = EXCLUDED.meal_thumb, 
        is_ai_generated = EXCLUDED.is_ai_generated, recipe_details = EXCLUDED.recipe_details
    RETURNING *;
  `;
  const values = [userId, mealId, mealName, mealThumb, isAiGenerated, recipeDetails];
  const res = await db.query(queryText, values);
  return res.rows[0];
}

/**
 * Removes an item from the wishlist by its wishlist entry ID.
 * @param {number} userId 
 * @param {number} id 
 * @returns {Promise<boolean>} True if removed, false otherwise.
 */
export async function removeFromWishlist(userId, id) {
  const queryText = `
    DELETE FROM wishlist
    WHERE user_id = $1 AND id = $2;
  `;
  const values = [userId, id];
  const res = await db.query(queryText, values);
  return res.rowCount > 0;
}

/**
 * Removes an item from the wishlist by its MealDB ID.
 * @param {number} userId 
 * @param {string} mealId 
 * @returns {Promise<boolean>} True if removed, false otherwise.
 */
export async function removeFromWishlistByMealId(userId, mealId) {
  const queryText = `
    DELETE FROM wishlist
    WHERE user_id = $1 AND meal_id = $2;
  `;
  const values = [userId, mealId];
  const res = await db.query(queryText, values);
  return res.rowCount > 0;
}

/**
 * Gets all wishlist recipes for a user.
 * @param {number} userId 
 * @returns {Promise<Array>} List of wishlist items.
 */
export async function getWishlist(userId) {
  const queryText = `
    SELECT id, meal_id, meal_name, meal_thumb, is_ai_generated, recipe_details, added_at
    FROM wishlist
    WHERE user_id = $1
    ORDER BY added_at DESC;
  `;
  const values = [userId];
  const res = await db.query(queryText, values);
  return res.rows;
}

/**
 * Checks if a recipe is currently in the wishlist.
 * @param {number} userId 
 * @param {string} mealId 
 * @returns {Promise<boolean>} True if in wishlist, false otherwise.
 */
export async function isMealInWishlist(userId, mealId) {
  if (!userId || !mealId) return false;
  const queryText = `
    SELECT 1 FROM wishlist
    WHERE user_id = $1 AND meal_id = $2;
  `;
  const values = [userId, mealId];
  const res = await db.query(queryText, values);
  return res.rows.length > 0;
}
