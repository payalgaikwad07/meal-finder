import db from "../db/index.js";

/**
 * Upserts a meal plan slot for a user, week, day, and meal type.
 * @param {number} userId 
 * @param {string} mealId 
 * @param {string} mealName 
 * @param {string} dayOfWeek 
 * @param {string} mealType 
 * @param {string} weekStartDate - Format YYYY-MM-DD
 * @returns {Promise<object>} The meal plan record.
 */
export async function upsertMealPlan(userId, mealId, mealName, dayOfWeek, mealType, weekStartDate) {
  const queryText = `
    INSERT INTO meal_plans (user_id, meal_id, meal_name, day_of_week, meal_type, week_start_date)
    VALUES ($1, $2, $3, $4, $5, $6)
    ON CONFLICT (user_id, week_start_date, day_of_week, meal_type)
    DO UPDATE SET meal_id = EXCLUDED.meal_id, meal_name = EXCLUDED.meal_name
    RETURNING *;
  `;
  const values = [userId, mealId, mealName, dayOfWeek, mealType, weekStartDate];
  const res = await db.query(queryText, values);
  return res.rows[0];
}

/**
 * Removes a meal plan from a specific slot.
 * @param {number} userId 
 * @param {string} dayOfWeek 
 * @param {string} mealType 
 * @param {string} weekStartDate - Format YYYY-MM-DD
 * @returns {Promise<boolean>} True if a meal plan was deleted.
 */
export async function deleteMealPlan(userId, dayOfWeek, mealType, weekStartDate) {
  const queryText = `
    DELETE FROM meal_plans
    WHERE user_id = $1 AND day_of_week = $2 AND meal_type = $3 AND week_start_date = $4;
  `;
  const values = [userId, dayOfWeek, mealType, weekStartDate];
  const res = await db.query(queryText, values);
  return res.rowCount > 0;
}

/**
 * Retrieves the meal plans for a user for a specific week.
 * @param {number} userId 
 * @param {string} weekStartDate - Format YYYY-MM-DD
 * @returns {Promise<Array>} List of meal plans for that week.
 */
export async function getWeeklyMealPlan(userId, weekStartDate) {
  const queryText = `
    SELECT id, meal_id, meal_name, day_of_week, meal_type, week_start_date
    FROM meal_plans
    WHERE user_id = $1 AND week_start_date = $2;
  `;
  const values = [userId, weekStartDate];
  const res = await db.query(queryText, values);
  return res.rows;
}
