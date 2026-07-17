# YumPlan 🍽️ - Full-Stack Recipe & Meal Planning Application

YumPlan is a full-stack recipe discovery and meal-planning web application built with Node.js (Express), EJS, and PostgreSQL. It integrates with [TheMealDB](https://www.themealdb.com/api.php) API and the Google Gemini API to let users search for recipes by name, cuisine, or ingredient, save favorites to a personal cookbook, build a simple "cook this" wishlist with automatic shopping-list generation, and get AI-powered recipe suggestions based on leftover ingredients.


## Features

1. **Recipe Search** — search by name, cuisine, or main ingredient, plus a "surprise me" random recipe option. Powered by TheMealDB.
2. **Authentication** — signup/login via Passport.js (local strategy), with `bcrypt` password hashing and PostgreSQL-backed sessions (`connect-pg-simple`). Rate-limited signup/login endpoints (`express-rate-limit`) to prevent brute-force attempts.
3. **My Cookbook** — save favorite recipes to a personal collection, with instant AJAX add/remove (no page reload).
4. **My Wishlist** — a simple, date-free list of recipes a user currently wants to cook. Add/remove freely from search results or recipe detail pages.
5. **Shopping List Generator** — pulls every recipe currently in the wishlist, fetches full ingredient lists, and produces one consolidated, de-duplicated shopping list (see aggregation logic below).
6. **AI Leftovers Suggester** *("What Can I Cook?", available to logged-in users)* — users enter 2-5 ingredients they have on hand. The app:
   - Queries TheMealDB for real recipes matching each ingredient, then ranks results by how many of the user's ingredients each recipe actually uses.
   - Calls the Gemini API to generate 2-3 original recipe ideas for cases with no strong database match.
   - Lets users save either a real match or an AI-generated idea directly to their cookbook (AI recipes are stored with an `is_ai_generated` flag and their full details in a `JSONB` column, since they have no MealDB ID).
7. **Search History** — recent searches are logged per user and shown as clickable pills on the homepage for quick re-search.
8. **Error Handling** — distinct states for "no results found" vs. "API/database error," custom 404 and error pages that don't leak stack traces.

---

## Technical Decisions & Architecture

### 1. Persistent Session Storage: PostgreSQL vs. Memory
Express defaults to `MemoryStore` for sessions, which loses all sessions on every server restart and can't scale across multiple instances. YumPlan uses `connect-pg-simple` to store session state in a PostgreSQL `session` table instead, so sessions survive redeploys and would work correctly behind a load balancer with multiple app instances.

### 2. Shopping List Aggregation Logic
Turning several recipes' worth of ingredients into one usable shopping list means parsing unstructured measurement strings (`1 1/2 cups`, `500g`, `to taste`, `½ tsp`). The logic lives in `utils/aggregator.js`:
- **Fraction & Unicode normalization** — unicode fractions (½, ¼, ¾) and mixed fractions (`1 1/2`) are converted to decimals.
- **Non-numeric quantities** (`to taste`, `pinch`, `for serving`) are preserved as descriptive text rather than forced into a number.
- **Unit standardization** — units are lowercased and singularized (`cloves` → `clove`, `cups` → `cup`).
- **Consolidation** — matching units for the same ingredient are summed (`1 cup Milk` + `0.5 cup Milk` → `1.5 cup Milk`). Mismatched units (`2 clove Garlic` vs `50g Garlic`) are **not** guess-converted — they're kept as separate line items under the same ingredient, since guessing volume/mass/count conversions risks an incorrect grocery list.

### 3. AI Recipe Matching & Fallback
For the leftovers suggester, real-recipe matching (via TheMealDB) is tried first and ranked by ingredient overlap, so users see legitimate recipes before AI-generated ones. Gemini is only used to fill gaps where no good real match exists, and its output is parsed into a consistent structure (name, description, steps) so it can be displayed and saved the same way as a real recipe.

### 4. Render Deployment Readiness
`db/index.js` checks for a single `DATABASE_URL` connection string (which Render and similar platforms inject automatically) and falls back to individual `DB_*` variables for local development. SSL is dynamically enabled in production to support managed Postgres providers that require it.

---

## Database Schema

```
+-----------------------------------+
|               users               |
+-----------------------------------+
| id (PK)                           |
| name                              |
| email (UNIQUE)                    |
| password_hash                     |
| created_at                        |
+-----------------+-----------------+
                  |
   +--------------+-------------------+--------------------+
   |                                  |                    |
   v                                  v                    v
+------------------------+  +------------------------+  +-----------------------+
|      saved_meals       |  |        wishlist        |  |    search_history     |
+------------------------+  +------------------------+  +-----------------------+
| id (PK)                |  | id (PK)                |  | id (PK)               |
| user_id (FK -> users)  |  | user_id (FK -> users)  |  | user_id (FK -> users) |
| meal_id (nullable)     |  | meal_id (nullable)     |  | query_text            |
| meal_name               |  | meal_name               |  | search_type           |
| meal_thumb               |  | meal_thumb               |  | searched_at           |
| is_ai_generated         |  | is_ai_generated         |  +-----------------------+
| recipe_details (JSONB)  |  | recipe_details (JSONB)  |
| saved_at                 |  | added_at                 |
| [unique: user+meal_id   |  | [unique: user+meal_id   |
|  where meal_id is set]  |  |  where meal_id is set]  |
+------------------------+  +------------------------+
```

- **users** — stores hashed credentials.
- **saved_meals** — "My Cookbook." `meal_id` is nullable and `recipe_details`/`is_ai_generated` support saving AI-generated recipes that have no MealDB ID.
- **wishlist** — "Cook This" list. Same nullable-ID/AI-support pattern as `saved_meals`. Replaces an earlier day-of-week/meal-type weekly planner design, which was dropped in favor of a simpler, date-free list.
- **search_history** — logs name/cuisine/ingredient/random searches with timestamps.
- **session** — managed automatically by `connect-pg-simple`.

The base schema is in [`db/schema.sql`](db/schema.sql); [`db/migrate.js`](db/migrate.js) contains the migration that moved the app from the old weekly-planner model to the current wishlist model and added AI-recipe support.

---

## Setup & Running Instructions

### 1. Create the database
```sql
CREATE DATABASE meal_planner;
```
Run [`db/schema.sql`](db/schema.sql) against it, then run the migration:
```bash
node db/migrate.js
```

### 2. Configure environment variables
Create a `.env` file in the project root:
```env
PORT=3000
DB_USER=postgres
DB_PASSWORD=your_password_here
DB_HOST=localhost
DB_PORT=5432
DB_DATABASE=meal_planner
SESSION_SECRET=some_long_random_session_secret_key_here
GEMINI_API_KEY=your_gemini_api_key_here
```
In production (e.g. Render), set `DATABASE_URL` instead of the individual `DB_*` variables — it takes priority automatically.

### 3. Install dependencies
```bash
npm install
```

### 4. Run the app
```bash
npm run dev    # development, auto-restart
npm start      # production
```
Visit `http://localhost:3000`.
