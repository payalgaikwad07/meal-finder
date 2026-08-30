import express from "express";
import axios from "axios";
import cors from "cors";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import bcrypt from "bcrypt";

import db from "./db/index.js";
import { createUser, findUserByEmail, findUserById } from "./models/user.js";
import { saveMeal, removeMeal, getSavedMeals, removeMealById, isMealSaved } from "./models/favorite.js";
import { addToWishlist, removeFromWishlist, removeFromWishlistByMealId, getWishlist, isMealInWishlist } from "./models/wishlist.js";
import { upsertMealPlan, deleteMealPlan, getWeeklyMealPlan } from "./models/planner.js";
import { logSearch, getRecentSearches } from "./models/history.js";
import { authenticateOptional, ensureAuthenticated, generateToken } from "./middleware/auth.js";
import { aggregateIngredients } from "./utils/aggregator.js";
import { suggestRecipesWithGemini } from "./utils/gemini.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const API_URL = "https://www.themealdb.com/api/json/v1/1";

// Ensure all database tables exist on startup
async function initDB() {
  try {
    await db.query(`
      CREATE TABLE IF NOT EXISTS users (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        email VARCHAR(255) UNIQUE NOT NULL,
        password_hash VARCHAR(255) NOT NULL,
        created_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );

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

      CREATE TABLE IF NOT EXISTS search_history (
        id SERIAL PRIMARY KEY,
        user_id INTEGER REFERENCES users(id) ON DELETE CASCADE,
        query_text VARCHAR(255) NOT NULL,
        search_type VARCHAR(50) NOT NULL,
        searched_at TIMESTAMP WITH TIME ZONE DEFAULT CURRENT_TIMESTAMP
      );
    `);
    console.log("✅ Database schema initialized and verified.");
  } catch (err) {
    console.error("⚠️ Database initialization warning:", err.message);
  }
}

initDB();

const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.CLIENT_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin) || origin.endsWith(".vercel.app")) {
        callback(null, true);
      } else {
        callback(null, true);
      }
    },
    credentials: true,
  })
);

app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(authenticateOptional);

// Rate Limiters
const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 300,
  message: { error: "Too many search requests. Please try again in a few minutes." },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 50,
  message: { error: "Too many login/signup attempts. Please try again later." },
});

/* ========================================================
   1. AUTHENTICATION API
   ======================================================== */

app.post("/api/auth/signup", authLimiter, async (req, res) => {
  const { name, email, password } = req.body;
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

  if (!name || name.trim().length < 2) {
    return res.status(400).json({ error: "Name must be at least 2 characters." });
  }
  if (!email || !emailRegex.test(email)) {
    return res.status(400).json({ error: "Please provide a valid email address." });
  }
  if (!password || password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters." });
  }

  try {
    const existing = await findUserByEmail(email);
    if (existing) {
      return res.status(409).json({ error: "An account with this email already exists." });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await createUser(name, email, hash);
    const token = generateToken(user);

    res.status(201).json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Error creating account. Please try again." });
  }
});

app.post("/api/auth/login", authLimiter, async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required." });
  }

  try {
    const user = await findUserByEmail(email);
    if (!user) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const isValid = await bcrypt.compare(password, user.password_hash);
    if (!isValid) {
      return res.status(401).json({ error: "Invalid email or password." });
    }

    const token = generateToken(user);
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Server error during login." });
  }
});

app.get("/api/auth/me", ensureAuthenticated, async (req, res) => {
  res.json({
    user: {
      id: req.user.id,
      name: req.user.name,
      email: req.user.email,
    },
  });
});

app.post("/api/auth/logout", (req, res) => {
  res.json({ success: true, message: "Logged out successfully." });
});

/* ========================================================
   2. RECIPES & SEARCH API
   ======================================================== */

app.get("/api/search/name", searchLimiter, async (req, res) => {
  const query = (req.query.q || req.query.mealName || "").trim();
  try {
    if (req.user && query) {
      await logSearch(req.user.id, query, "name");
    }

    const response = await axios.get(`${API_URL}/search.php?s=${encodeURIComponent(query)}`);
    const meals = response.data.meals || [];

    let savedMealIds = [];
    let wishlistMealIds = [];
    if (req.user) {
      const [favs, wishlist] = await Promise.all([
        getSavedMeals(req.user.id),
        getWishlist(req.user.id),
      ]);
      savedMealIds = favs.map((f) => f.meal_id);
      wishlistMealIds = wishlist.map((w) => w.meal_id);
    }

    res.json({ meals, query, savedMealIds, wishlistMealIds });
  } catch (error) {
    console.error("Search by name error:", error.message);
    res.status(500).json({ error: "Failed to search recipes.", meals: [] });
  }
});

app.get("/api/search/cuisine", searchLimiter, async (req, res) => {
  let cuisine = (req.query.q || req.query.cuisine || "").trim();
  try {
    if (req.user && cuisine) {
      await logSearch(req.user.id, cuisine, "cuisine");
    }

    // Handle TheMealDB naming quirks (e.g. Indian is 'India' in TheMealDB area filter)
    let searchCuisine = cuisine;
    if (cuisine.toLowerCase() === 'indian') {
      searchCuisine = 'India';
    }

    let response = await axios.get(`${API_URL}/filter.php?a=${encodeURIComponent(searchCuisine)}`);
    let meals = response.data.meals || [];

    // Fallback try original if not found
    if (meals.length === 0 && searchCuisine === 'India') {
      const fb = await axios.get(`${API_URL}/filter.php?a=Indian`).catch(() => ({ data: {} }));
      if (fb.data && fb.data.meals) meals = fb.data.meals;
    } else if (meals.length === 0 && searchCuisine.toLowerCase() === 'india') {
      const fb = await axios.get(`${API_URL}/filter.php?a=India`).catch(() => ({ data: {} }));
      if (fb.data && fb.data.meals) meals = fb.data.meals;
    }

    let savedMealIds = [];
    let wishlistMealIds = [];
    if (req.user) {
      const [favs, wishlist] = await Promise.all([
        getSavedMeals(req.user.id),
        getWishlist(req.user.id),
      ]);
      savedMealIds = favs.map((f) => f.meal_id);
      wishlistMealIds = wishlist.map((w) => w.meal_id);
    }

    res.json({ meals, query: cuisine, savedMealIds, wishlistMealIds });
  } catch (error) {
    console.error("Search by cuisine error:", error.message);
    res.status(500).json({ error: "Failed to filter by cuisine.", meals: [] });
  }
});

app.get("/api/search/ingredient", searchLimiter, async (req, res) => {
  const ingredient = (req.query.q || req.query.ingredient || "").trim();
  try {
    if (req.user && ingredient) {
      await logSearch(req.user.id, ingredient, "ingredient");
    }

    const response = await axios.get(`${API_URL}/filter.php?i=${encodeURIComponent(ingredient)}`);
    const meals = response.data.meals || [];

    let savedMealIds = [];
    let wishlistMealIds = [];
    if (req.user) {
      const [favs, wishlist] = await Promise.all([
        getSavedMeals(req.user.id),
        getWishlist(req.user.id),
      ]);
      savedMealIds = favs.map((f) => f.meal_id);
      wishlistMealIds = wishlist.map((w) => w.meal_id);
    }

    res.json({ meals, query: ingredient, savedMealIds, wishlistMealIds });
  } catch (error) {
    console.error("Search by ingredient error:", error.message);
    res.status(500).json({ error: "Failed to filter by ingredient.", meals: [] });
  }
});

app.get("/api/search/random", searchLimiter, async (req, res) => {
  try {
    if (req.user) {
      await logSearch(req.user.id, "Surprise Surprise", "random");
    }

    const response = await axios.get(`${API_URL}/random.php`);
    const meals = response.data.meals || [];

    let savedMealIds = [];
    let wishlistMealIds = [];
    if (req.user) {
      const [favs, wishlist] = await Promise.all([
        getSavedMeals(req.user.id),
        getWishlist(req.user.id),
      ]);
      savedMealIds = favs.map((f) => f.meal_id);
      wishlistMealIds = wishlist.map((w) => w.meal_id);
    }

    res.json({ meals, query: "Random Surprise", savedMealIds, wishlistMealIds });
  } catch (error) {
    console.error("Search random error:", error.message);
    res.status(500).json({ error: "Failed to fetch random recipe.", meals: [] });
  }
});

app.get("/api/search/history", ensureAuthenticated, async (req, res) => {
  try {
    const history = await getRecentSearches(req.user.id, 8);
    res.json({ history });
  } catch (error) {
    console.error("History fetch error:", error);
    res.status(500).json({ error: "Failed to load search history.", history: [] });
  }
});

app.get("/api/meals/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const response = await axios.get(`${API_URL}/lookup.php?i=${id}`);
    if (!response.data.meals || response.data.meals.length === 0) {
      return res.status(404).json({ error: "Recipe not found." });
    }
    const meal = response.data.meals[0];

    let isFavorite = false;
    let isWishlisted = false;
    if (req.user) {
      const [fav, wish] = await Promise.all([
        isMealSaved(req.user.id, id),
        isMealInWishlist(req.user.id, id),
      ]);
      isFavorite = fav;
      isWishlisted = wish;
    }

    res.json({ meal, isFavorite, isWishlisted });
  } catch (error) {
    console.error("Fetch meal detail error:", error.message);
    res.status(500).json({ error: "Unable to retrieve recipe details." });
  }
});

/* ========================================================
   3. FAVORITES / COOKBOOK (Protected)
   ======================================================== */

app.get("/api/favorites", ensureAuthenticated, async (req, res) => {
  try {
    const meals = await getSavedMeals(req.user.id);
    res.json({ meals });
  } catch (error) {
    console.error("Get favorites error:", error);
    res.status(500).json({ error: "Failed to fetch saved recipes." });
  }
});

app.post("/api/favorites", ensureAuthenticated, async (req, res) => {
  const { meal_id, meal_name, meal_thumb } = req.body;
  if (!meal_id || !meal_name) {
    return res.status(400).json({ error: "Meal ID and Meal Name are required." });
  }

  try {
    const saved = await saveMeal(req.user.id, meal_id, meal_name, meal_thumb);
    res.status(201).json({ success: true, saved });
  } catch (error) {
    console.error("Save favorite error:", error);
    res.status(500).json({ error: "Failed to save recipe to cookbook." });
  }
});

app.delete("/api/favorites/:mealId", ensureAuthenticated, async (req, res) => {
  const { mealId } = req.params;
  try {
    await removeMeal(req.user.id, mealId);
    res.json({ success: true, message: "Removed from favorites." });
  } catch (error) {
    console.error("Remove favorite error:", error);
    res.status(500).json({ error: "Failed to remove recipe from cookbook." });
  }
});

app.post("/api/favorites/ai", ensureAuthenticated, async (req, res) => {
  const { meal_name, recipe_details } = req.body;
  if (!meal_name || !recipe_details) {
    return res.status(400).json({ error: "Meal Name and recipe details are required." });
  }

  try {
    const saved = await saveMeal(req.user.id, null, meal_name, null, true, recipe_details);
    res.status(201).json({ success: true, saved });
  } catch (error) {
    console.error("Save AI favorite error:", error);
    res.status(500).json({ error: "Failed to save AI recipe." });
  }
});

app.delete("/api/favorites/custom/:id", ensureAuthenticated, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid recipe ID." });
  }

  try {
    const removed = await removeMealById(req.user.id, id);
    if (removed) {
      res.json({ success: true, message: "Custom recipe removed." });
    } else {
      res.status(404).json({ error: "Custom recipe not found." });
    }
  } catch (error) {
    console.error("Delete custom favorite error:", error);
    res.status(500).json({ error: "Failed to delete custom recipe." });
  }
});

/* ========================================================
   4. WISHLIST & CUSTOM RECIPES (Protected)
   ======================================================== */

app.get("/api/wishlist", ensureAuthenticated, async (req, res) => {
  try {
    const wishlist = await getWishlist(req.user.id);
    res.json({ wishlist });
  } catch (error) {
    console.error("Get wishlist error:", error);
    res.status(500).json({ error: "Failed to load wishlist." });
  }
});

app.post("/api/wishlist", ensureAuthenticated, async (req, res) => {
  const { meal_id, meal_name, meal_thumb, is_ai_generated, recipe_details } = req.body;
  if (!meal_name) {
    return res.status(400).json({ error: "Meal Name is required." });
  }

  try {
    const item = await addToWishlist(req.user.id, meal_id, meal_name, meal_thumb, is_ai_generated, recipe_details);
    res.status(201).json({ success: true, item });
  } catch (error) {
    console.error("Add wishlist error:", error);
    res.status(500).json({ error: "Failed to add to wishlist." });
  }
});

app.delete("/api/wishlist/:id", ensureAuthenticated, async (req, res) => {
  const idOrMealId = req.params.id;
  try {
    let deleted = false;
    if (!isNaN(idOrMealId)) {
      deleted = await removeFromWishlist(req.user.id, parseInt(idOrMealId, 10));
    }
    if (!deleted) {
      deleted = await removeFromWishlistByMealId(req.user.id, idOrMealId);
    }

    if (deleted) {
      res.json({ success: true, message: "Removed from wishlist." });
    } else {
      res.status(404).json({ error: "Item not found in wishlist." });
    }
  } catch (error) {
    console.error("Remove wishlist error:", error);
    res.status(500).json({ error: "Failed to remove from wishlist." });
  }
});

app.get("/api/wishlist/shopping-list", ensureAuthenticated, async (req, res) => {
  try {
    const wishlist = await getWishlist(req.user.id);
    if (wishlist.length === 0) {
      return res.json({ ingredients: [], totalMeals: 0, title: "Wishlist Shopping List" });
    }

    const standardItems = wishlist.filter((item) => !item.is_ai_generated && item.meal_id);
    const uniqueMealIds = [...new Set(standardItems.map((p) => p.meal_id))];

    const mealRequests = uniqueMealIds.map((id) =>
      axios.get(`${API_URL}/lookup.php?i=${id}`).catch(() => ({ data: { meals: null } }))
    );
    const mealResponses = await Promise.all(mealRequests);

    const apiMeals = [];
    mealResponses.forEach((response) => {
      if (response.data && response.data.meals && response.data.meals[0]) {
        apiMeals.push(response.data.meals[0]);
      }
    });

    const fullMealsList = [];
    wishlist.forEach((item) => {
      if (item.is_ai_generated) {
        fullMealsList.push(item);
      } else {
        const detail = apiMeals.find((m) => m.idMeal === item.meal_id);
        if (detail) fullMealsList.push(detail);
      }
    });

    const ingredients = aggregateIngredients(fullMealsList);
    res.json({
      ingredients,
      totalMeals: wishlist.length,
      title: "Wishlist Shopping List",
    });
  } catch (error) {
    console.error("Wishlist shopping list error:", error);
    res.status(500).json({ error: "Failed to generate shopping list." });
  }
});

app.get("/api/recipe/custom/:id", ensureAuthenticated, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  const source = req.query.source || "wishlist";
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid recipe ID." });
  }

  try {
    const queryTable = source === "cookbook" ? "saved_meals" : "wishlist";
    const queryText = `
      SELECT id, meal_name, meal_thumb, is_ai_generated, recipe_details
      FROM ${queryTable}
      WHERE user_id = $1 AND id = $2;
    `;
    const dbRes = await db.query(queryText, [req.user.id, id]);
    if (dbRes.rows.length === 0) {
      return res.status(404).json({ error: "Custom recipe not found." });
    }

    res.json({ recipe: dbRes.rows[0], source });
  } catch (error) {
    console.error("Custom recipe detail error:", error);
    res.status(500).json({ error: "Failed to fetch custom recipe." });
  }
});

/* ========================================================
   5. AI LEFTOVERS SUGGESTER
   ======================================================== */

app.post("/api/leftovers/suggest", ensureAuthenticated, async (req, res) => {
  const ingredientsInput = req.body.ingredients || "";
  const ingredients = (Array.isArray(ingredientsInput)
    ? ingredientsInput
    : ingredientsInput.split(",")
  )
    .map((i) => i.trim().toLowerCase())
    .filter((i) => i.length > 0);

  if (ingredients.length < 2 || ingredients.length > 6) {
    return res.status(400).json({
      error: "Please enter between 2 and 6 leftover ingredients.",
    });
  }

  try {
    const fetchRequests = ingredients.map((ing) =>
      axios
        .get(`${API_URL}/filter.php?i=${encodeURIComponent(ing)}`)
        .catch(() => ({ data: { meals: null } }))
    );
    const responses = await Promise.all(fetchRequests);

    const frequencyMap = {};
    responses.forEach((resp) => {
      const meals = (resp.data && resp.data.meals) || [];
      meals.forEach((m) => {
        if (!m.idMeal) return;
        if (!frequencyMap[m.idMeal]) {
          frequencyMap[m.idMeal] = { count: 0, meal: m };
        }
        frequencyMap[m.idMeal].count += 1;
      });
    });

    const sortedByFreq = Object.values(frequencyMap).sort((a, b) => b.count - a.count);
    const top8 = sortedByFreq.slice(0, 8);

    const detailRequests = top8.map((item) =>
      axios
        .get(`${API_URL}/lookup.php?i=${item.meal.idMeal}`)
        .catch(() => ({ data: { meals: null } }))
    );
    const detailResponses = await Promise.all(detailRequests);

    const realMatches = [];
    detailResponses.forEach((resp) => {
      if (resp.data && resp.data.meals && resp.data.meals[0]) {
        const meal = resp.data.meals[0];
        const mealIngredients = [];
        for (let i = 1; i <= 20; i++) {
          const ing = meal[`strIngredient${i}`];
          if (ing && ing.trim()) mealIngredients.push(ing.trim().toLowerCase());
        }

        let matchesCount = 0;
        ingredients.forEach((userIng) => {
          const matched = mealIngredients.some(
            (recipeIng) => recipeIng.includes(userIng) || userIng.includes(recipeIng)
          );
          if (matched) matchesCount += 1;
        });

        meal.matchesCount = matchesCount;
        meal.totalIngredients = mealIngredients.length;
        realMatches.push(meal);
      }
    });

    realMatches.sort((a, b) => b.matchesCount - a.matchesCount);

    const aiSuggestions = await suggestRecipesWithGemini(ingredients);

    let savedMealIds = [];
    let wishlistMealIds = [];
    if (req.user) {
      const [favs, wishlist] = await Promise.all([
        getSavedMeals(req.user.id),
        getWishlist(req.user.id),
      ]);
      savedMealIds = favs.map((f) => f.meal_id);
      wishlistMealIds = wishlist.map((w) => w.meal_id);
    }

    res.json({
      ingredients,
      realMatches,
      aiSuggestions,
      savedMealIds,
      wishlistMealIds,
    });
  } catch (error) {
    console.error("Leftovers suggester error:", error);
    res.status(500).json({ error: "Failed to generate recipe suggestions." });
  }
});

/* ========================================================
   6. HEALTH & ROOT
   ======================================================== */

app.get("/api/health", (req, res) => {
  res.json({ status: "healthy", timestamp: new Date().toISOString() });
});

app.get("/", (req, res) => {
  res.json({
    message: "Welcome to Meal Finder (YumPlan) REST API",
    version: "2.0.0",
    docs: "/api/health",
  });
});

app.listen(port, () => {
  console.log(`🚀 Meal Finder REST API running on port ${port}`);
});
