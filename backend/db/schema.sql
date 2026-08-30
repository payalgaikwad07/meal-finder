-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id SERIAL PRIMARY KEY,
    name VARCHAR(255) NOT NULL,
    email VARCHAR(255) UNIQUE NOT NULL,
    password_hash VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);

-- 2. Session Table (for optional connect-pg-simple)
CREATE TABLE IF NOT EXISTS session (
    sid VARCHAR NOT NULL PRIMARY KEY,
    sess JSON NOT NULL,
    expire TIMESTAMP(6) NOT NULL
);
CREATE INDEX IF NOT EXISTS "IDX_session_expire" ON session (expire);

-- 3. Saved Meals Table (Favorites / Cookbook)
CREATE TABLE IF NOT EXISTS saved_meals (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    meal_id VARCHAR(50) NULL,
    meal_name VARCHAR(255) NOT NULL,
    meal_thumb VARCHAR(500),
    is_ai_generated BOOLEAN DEFAULT FALSE,
    recipe_details JSONB,
    saved_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_meal_idx ON saved_meals (user_id, meal_id) WHERE meal_id IS NOT NULL;

-- 4. Wishlist Table
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
CREATE UNIQUE INDEX IF NOT EXISTS unique_user_wishlist_idx ON wishlist (user_id, meal_id) WHERE meal_id IS NOT NULL;

-- 5. Meal Plans Table
CREATE TABLE IF NOT EXISTS meal_plans (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    meal_id VARCHAR(50) NOT NULL,
    meal_name VARCHAR(255) NOT NULL,
    day_of_week VARCHAR(15) NOT NULL,
    meal_type VARCHAR(20) NOT NULL,
    week_start_date DATE NOT NULL,
    CONSTRAINT unique_user_slot UNIQUE (user_id, week_start_date, day_of_week, meal_type)
);

-- 6. Search History Table
CREATE TABLE IF NOT EXISTS search_history (
    id SERIAL PRIMARY KEY,
    user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
    query_text VARCHAR(255) NOT NULL,
    search_type VARCHAR(50) NOT NULL,
    searched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
);
