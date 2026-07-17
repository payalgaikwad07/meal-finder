import db from "./index.js";

async function runMigration() {
  console.log("Starting database migration...");
  try {
    // 1. Drop old planner table
    console.log("Dropping old table 'meal_plans'...");
    await db.query(`DROP TABLE IF EXISTS meal_plans CASCADE;`);

    // 2. Create wishlist table
    console.log("Creating table 'wishlist'...");
    await db.query(`
      CREATE TABLE IF NOT EXISTS wishlist (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        meal_id VARCHAR(50) NULL,
        meal_name VARCHAR(255) NOT NULL,
        meal_thumb VARCHAR(500),
        is_ai_generated BOOLEAN DEFAULT FALSE,
        recipe_details JSONB,
        added_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);

    // 3. Create unique index for wishlist
    console.log("Creating unique index on wishlist...");
    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS unique_user_wishlist_idx 
      ON wishlist (user_id, meal_id) 
      WHERE meal_id IS NOT NULL;
    `);

    // 4. Modify saved_meals table
    console.log("Modifying table 'saved_meals' for AI support...");
    
    // Make meal_id nullable
    await db.query(`ALTER TABLE saved_meals ALTER COLUMN meal_id DROP NOT NULL;`);
    
    // Drop old unique constraint
    await db.query(`ALTER TABLE saved_meals DROP CONSTRAINT IF EXISTS unique_user_meal;`);
    
    // Create new unique index
    await db.query(`
      CREATE UNIQUE INDEX IF NOT EXISTS unique_user_meal_idx 
      ON saved_meals (user_id, meal_id) 
      WHERE meal_id IS NOT NULL;
    `);
    
    // Add is_ai_generated column
    await db.query(`ALTER TABLE saved_meals ADD COLUMN IF NOT EXISTS is_ai_generated BOOLEAN DEFAULT FALSE;`);
    
    // Add recipe_details column
    await db.query(`ALTER TABLE saved_meals ADD COLUMN IF NOT EXISTS recipe_details JSONB;`);

    console.log("Database migration completed successfully! 🎉");
    process.exit(0);
  } catch (error) {
    console.error("Database migration failed: ❌", error);
    process.exit(1);
  }
}

runMigration();
