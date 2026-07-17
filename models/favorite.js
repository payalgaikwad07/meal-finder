import db from "../db/index.js";

/**
 * Saves a meal to the user's favorites.
 * Supports standard MealDB meals and AI custom recipes.
 * @param {number} userId 
 * @param {string|null} mealId 
 * @param {string} mealName 
 * @param {string|null} mealThumb 
 * @param {boolean} isAiGenerated 
 * @param {object|null} recipeDetails 
 * @returns {Promise<object>} The saved meal record.
 */
export async function saveMeal(userId, mealId, mealName, mealThumb, isAiGenerated = false, recipeDetails = null) {
  if (!mealId) {
    const queryTextAI = `
      INSERT INTO saved_meals (user_id, meal_id, meal_name, meal_thumb, is_ai_generated, recipe_details)
      VALUES ($1, NULL, $2, $3, $4, $5)
      RETURNING *;
    `;
    const valuesAI = [userId, mealName, mealThumb, isAiGenerated, recipeDetails];
    const res = await db.query(queryTextAI, valuesAI);
    return res.rows[0];
  }

  const queryText = `
    INSERT INTO saved_meals (user_id, meal_id, meal_name, meal_thumb, is_ai_generated, recipe_details)
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
 * Removes a meal from the user's favorites by MealDB ID.
 * @param {number} userId 
 * @param {string} mealId 
 * @returns {Promise<boolean>} True if a meal was removed, false otherwise.
 */
export async function removeMeal(userId, mealId) {
  const queryText = `
    DELETE FROM saved_meals
    WHERE user_id = $1 AND meal_id = $2;
  `;
  const values = [userId, mealId];
  const res = await db.query(queryText, values);
  return res.rowCount > 0;
}

/**
 * Removes a custom favorite recipe by its database row ID (used for AI recipes with null meal_id).
 * @param {number} userId 
 * @param {number} id 
 * @returns {Promise<boolean>} True if removed, false otherwise.
 */
export async function removeMealById(userId, id) {
  const queryText = `
    DELETE FROM saved_meals
    WHERE user_id = $1 AND id = $2;
  `;
  const values = [userId, id];
  const res = await db.query(queryText, values);
  return res.rowCount > 0;
}

/**
 * Gets all saved meals for a specific user.
 * @param {number} userId 
 * @returns {Promise<Array>} List of saved meals.
 */
export async function getSavedMeals(userId) {
  const queryText = `
    SELECT id, meal_id, meal_name, meal_thumb, is_ai_generated, recipe_details, saved_at
    FROM saved_meals
    WHERE user_id = $1
    ORDER BY saved_at DESC;
  `;
  const values = [userId];
  const res = await db.query(queryText, values);
  return res.rows;
}

/**
 * Checks if a specific meal is saved by a user.
 * @param {number} userId 
 * @param {string} mealId 
 * @returns {Promise<boolean>} True if saved, false otherwise.
 */
export async function isMealSaved(userId, mealId) {
  if (!userId || !mealId) return false;
  const queryText = `
    SELECT 1 FROM saved_meals
    WHERE user_id = $1 AND meal_id = $2;
  `;
  const values = [userId, mealId];
  const res = await db.query(queryText, values);
  return res.rows.length > 0;
}
