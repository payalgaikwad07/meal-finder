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
import { logSearch, getRecentSearches } from "./models/history.js";
import { authenticateOptional, ensureAuthenticated, generateToken } from "./middleware/auth.js";
import { aggregateIngredients } from "./utils/aggregator.js";
import { suggestRecipesWithGemini } from "./utils/gemini.js";
import { getTypoSuggestion, initializeDictionary } from "./utils/typo.js";
import { enrichMealWithDiet } from "./utils/classifier.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 5000;
const API_URL = "https://www.themealdb.com/api/json/v1/1";

// Trust proxy for proper IP resolution and rate limiting on Render / reverse proxies
app.set("trust proxy", 1);

// Dedicated MealDB HTTP client with 8-second timeout
const mealDb = axios.create({
  baseURL: API_URL,
  timeout: 8000,
});

// In-memory cache for TheMealDB lookups with 10-minute TTL
const lookupCache = new Map();
const CACHE_TTL_MS = 10 * 60 * 1000;

async function getMealDetailsCached(mealId) {
  if (!mealId) return null;
  const cached = lookupCache.get(mealId);
  if (cached && Date.now() - cached.timestamp < CACHE_TTL_MS) {
    return cached.data;
  }
  try {
    const res = await mealDb.get(`/lookup.php?i=${mealId}`);
    const meal = res.data?.meals?.[0] || null;
    if (meal) {
      lookupCache.set(mealId, { data: meal, timestamp: Date.now() });
    }
    return meal;
  } catch (err) {
    return null;
  }
}

// Database schema initialization
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

// CORS Configuration
const allowedOrigins = [
  "http://localhost:5173",
  "http://localhost:3000",
  process.env.CLIENT_URL,
  process.env.FRONTEND_URL,
].filter(Boolean);

app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin) return callback(null, true);
      const isAllowed =
        allowedOrigins.includes(origin) ||
        origin.endsWith(".vercel.app") ||
        origin.endsWith(".onrender.com");
      if (isAllowed) {
        callback(null, true);
      } else {
        callback(new Error("CORS policy error: Origin not allowed"), false);
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

const leftoversLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 30,
  message: { error: "Too many recipe generation requests. Please try again in a few minutes." },
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

    const salt = await bcrypt.genSalt(10);
    const passwordHash = await bcrypt.hash(password, salt);
    const user = await createUser(name.trim(), email.toLowerCase().trim(), passwordHash);

    const token = generateToken(user);
    res.status(201).json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("Signup error:", error);
    res.status(500).json({ error: "Registration failed. Please try again later." });
  }
});

app.post("/api/auth/login", authLimiter, async (req, res) => {
  const { email, password } = req.body;
  if (!email || !password) {
    return res.status(400).json({ error: "Please enter your email and password." });
  }

  try {
    const user = await findUserByEmail(email.toLowerCase().trim());
    if (!user) {
      return res.status(401).json({ error: "Incorrect email or password." });
    }

    const isMatch = await bcrypt.compare(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: "Incorrect email or password." });
    }

    const token = generateToken(user);
    res.json({
      success: true,
      token,
      user: { id: user.id, name: user.name, email: user.email },
    });
  } catch (error) {
    console.error("Login error:", error);
    res.status(500).json({ error: "Login failed. Please try again later." });
  }
});

app.get("/api/auth/me", ensureAuthenticated, async (req, res) => {
  try {
    const user = await findUserById(req.user.id);
    if (!user) {
      return res.status(404).json({ error: "User not found." });
    }
    res.json({
      user: { id: user.id, name: user.name, email: user.email, created_at: user.created_at },
    });
  } catch (error) {
    console.error("Auth me error:", error);
    res.status(500).json({ error: "Failed to retrieve user profile." });
  }
});

app.post("/api/auth/logout", (req, res) => {
  res.json({ success: true, message: "Logged out successfully." });
});

/* ========================================================
   2. RECIPES & SEARCH API
   ======================================================== */

app.get("/api/search/name", searchLimiter, async (req, res) => {
  const query = (req.query.q || req.query.mealName || "").trim();
  const exact = req.query.exact === "true";
  try {
    if (req.user && query) {
      logSearch(req.user.id, query, "name").catch((err) =>
        console.warn("Search history log warning:", err.message)
      );
    }

    const response = await mealDb.get(`/search.php?s=${encodeURIComponent(query)}`);
    let meals = (response.data && response.data.meals) || [];
    let didYouMean = null;
    let isAutoCorrected = false;

    if (query.length >= 3) {
      const suggestion = getTypoSuggestion(query);
      if (suggestion && suggestion.toLowerCase() !== query.toLowerCase()) {
        didYouMean = suggestion;
        // If no direct results and exact match not forced, auto-correct to the suggestion
        if (meals.length === 0 && !exact) {
          const fallbackRes = await mealDb
            .get(`/search.php?s=${encodeURIComponent(didYouMean)}`)
            .catch(() => ({ data: {} }));
          const fallbackMeals = (fallbackRes.data && fallbackRes.data.meals) || [];
          if (fallbackMeals.length > 0) {
            meals = fallbackMeals;
            isAutoCorrected = true;
          }
        }
      }
    }

    const enrichedMeals = meals.map(enrichMealWithDiet);

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
      meals: enrichedMeals,
      query,
      originalQuery: query,
      didYouMean,
      isAutoCorrected,
      correctedQuery: isAutoCorrected ? didYouMean : null,
      savedMealIds,
      wishlistMealIds,
    });
  } catch (error) {
    console.error("Search by name error:", error.message);
    res.status(500).json({ error: "Failed to search recipes.", meals: [] });
  }
});

app.get("/api/search/cuisine", searchLimiter, async (req, res) => {
  let cuisine = (req.query.q || req.query.cuisine || "").trim();
  try {
    if (req.user && cuisine) {
      logSearch(req.user.id, cuisine, "cuisine").catch((err) =>
        console.warn("Search history log warning:", err.message)
      );
    }

    let searchCuisine = cuisine;
    if (cuisine.toLowerCase() === "indian") {
      searchCuisine = "India";
    }

    let response = await mealDb.get(`/filter.php?a=${encodeURIComponent(searchCuisine)}`);
    let meals = (response.data && response.data.meals) || [];

    if (meals.length === 0 && searchCuisine === "India") {
      const fb = await mealDb.get(`/filter.php?a=Indian`).catch(() => ({ data: {} }));
      if (fb.data && fb.data.meals) meals = fb.data.meals;
    } else if (meals.length === 0 && searchCuisine.toLowerCase() === "india") {
      const fb = await mealDb.get(`/filter.php?a=India`).catch(() => ({ data: {} }));
      if (fb.data && fb.data.meals) meals = fb.data.meals;
    }

    const enrichedMeals = meals.map(enrichMealWithDiet);

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

    res.json({ meals: enrichedMeals, query: cuisine, savedMealIds, wishlistMealIds });
  } catch (error) {
    console.error("Search by cuisine error:", error.message);
    res.status(500).json({ error: "Failed to filter by cuisine.", meals: [] });
  }
});

app.get("/api/search/ingredient", searchLimiter, async (req, res) => {
  const ingredient = (req.query.q || req.query.ingredient || "").trim();
  const exact = req.query.exact === "true";
  try {
    if (req.user && ingredient) {
      logSearch(req.user.id, ingredient, "ingredient").catch((err) =>
        console.warn("Search history log warning:", err.message)
      );
    }

    // Replace spaces with underscores for multi-word ingredients (e.g. chicken_breast)
    const formattedIngredient = ingredient.replace(/\s+/g, "_");
    const response = await mealDb.get(`/filter.php?i=${encodeURIComponent(formattedIngredient)}`);
    let meals = (response.data && response.data.meals) || [];
    let didYouMean = null;
    let isAutoCorrected = false;

    if (ingredient.length >= 3) {
      const suggestion = getTypoSuggestion(ingredient);
      if (suggestion && suggestion.toLowerCase() !== ingredient.toLowerCase()) {
        didYouMean = suggestion;
        if (meals.length === 0 && !exact) {
          const formattedSuggestion = didYouMean.replace(/\s+/g, "_");
          let fallbackRes = await mealDb
            .get(`/filter.php?i=${encodeURIComponent(formattedSuggestion)}`)
            .catch(() => ({ data: {} }));
          let fallbackMeals = (fallbackRes.data && fallbackRes.data.meals) || [];

          // If ingredient search yielded nothing (e.g. "burger" is a meal name rather than ingredient),
          // fallback to name search for that suggestion so user gets meals!
          if (fallbackMeals.length === 0) {
            const nameRes = await mealDb
              .get(`/search.php?s=${encodeURIComponent(didYouMean)}`)
              .catch(() => ({ data: {} }));
            fallbackMeals = (nameRes.data && nameRes.data.meals) || [];
          }

          if (fallbackMeals.length > 0) {
            meals = fallbackMeals;
            isAutoCorrected = true;
          }
        }
      }
    }

    const enrichedMeals = meals.map(enrichMealWithDiet);

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
      meals: enrichedMeals,
      query: ingredient,
      originalQuery: ingredient,
      didYouMean,
      isAutoCorrected,
      correctedQuery: isAutoCorrected ? didYouMean : null,
      savedMealIds,
      wishlistMealIds,
    });
  } catch (error) {
    console.error("Search by ingredient error:", error.message);
    res.status(500).json({ error: "Failed to search by ingredient.", meals: [] });
  }
});

app.get("/api/search/suggest", (req, res) => {
  const query = (req.query.q || "").trim();
  const suggestion = getTypoSuggestion(query);
  res.json({
    query,
    suggestion: suggestion && suggestion.toLowerCase() !== query.toLowerCase() ? suggestion : null,
  });
});

app.get("/api/search/random", async (req, res) => {
  try {
    const response = await mealDb.get(`/random.php`);
    const meal = response.data?.meals?.[0] || null;
    res.json({ meal: meal ? enrichMealWithDiet(meal) : null });
  } catch (error) {
    console.error("Random meal error:", error.message);
    res.status(500).json({ error: "Failed to fetch random meal." });
  }
});

app.get("/api/search/history", ensureAuthenticated, async (req, res) => {
  try {
    const history = await getRecentSearches(req.user.id, 8);
    res.json({ history });
  } catch (error) {
    console.error("History fetch error:", error);
    res.status(500).json({ error: "Failed to load recent searches." });
  }
});

app.get("/api/meals/:id", async (req, res) => {
  const { id } = req.params;
  try {
    const meal = await getMealDetailsCached(id);
    if (!meal) {
      return res.status(404).json({ error: "Recipe not found." });
    }

    let isWishlisted = false;
    if (req.user) {
      isWishlisted = await isMealInWishlist(req.user.id, id);
    }

    res.json({
      meal: enrichMealWithDiet(meal),
      isWishlisted,
    });
  } catch (error) {
    console.error("Meal detail error:", error.message);
    res.status(500).json({ error: "Failed to fetch recipe details." });
  }
});

/* ========================================================
   3. COOKBOOK & SAVED RECIPES (Protected)
   ======================================================== */

app.get("/api/favorites", ensureAuthenticated, async (req, res) => {
  try {
    const favorites = await getSavedMeals(req.user.id);
    const enriched = favorites.map(enrichMealWithDiet);
    res.json({ favorites: enriched });
  } catch (error) {
    console.error("Get favorites error:", error);
    res.status(500).json({ error: "Failed to load cookbook." });
  }
});

app.post("/api/favorites", ensureAuthenticated, async (req, res) => {
  const { meal_id, meal_name, meal_thumb } = req.body;
  if (!meal_name) {
    return res.status(400).json({ error: "Meal Name is required." });
  }

  try {
    const meal = await saveMeal(req.user.id, meal_id || null, meal_name, meal_thumb || null, false, null);
    res.status(201).json({ success: true, meal });
  } catch (error) {
    console.error("Add favorite error:", error);
    res.status(500).json({ error: "Failed to save recipe." });
  }
});

app.post("/api/favorites/ai", ensureAuthenticated, async (req, res) => {
  const { meal_name, recipe_details } = req.body;
  if (!meal_name || !recipe_details) {
    return res.status(400).json({ error: "Meal Name and recipe details are required." });
  }

  try {
    const meal = await saveMeal(req.user.id, null, meal_name, null, true, recipe_details);
    res.status(201).json({ success: true, meal });
  } catch (error) {
    console.error("Save AI recipe error:", error);
    res.status(500).json({ error: "Failed to save AI recipe." });
  }
});

app.delete("/api/favorites/:mealId", ensureAuthenticated, async (req, res) => {
  const { mealId } = req.params;
  try {
    let deleted = await removeMeal(req.user.id, String(mealId));
    if (!deleted && !isNaN(mealId)) {
      deleted = await removeMealById(req.user.id, parseInt(mealId, 10));
    }

    if (deleted) {
      res.json({ success: true, message: "Recipe removed from cookbook." });
    } else {
      res.status(404).json({ error: "Recipe not found in cookbook." });
    }
  } catch (error) {
    console.error("Delete favorite error:", error);
    res.status(500).json({ error: "Failed to remove favorite." });
  }
});

app.delete("/api/favorites/custom/:id", ensureAuthenticated, async (req, res) => {
  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid recipe ID." });
  }

  try {
    const deleted = await removeMealById(req.user.id, id);
    if (deleted) {
      res.json({ success: true, message: "Custom recipe removed from cookbook." });
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
    const enriched = wishlist.map(enrichMealWithDiet);
    res.json({ wishlist: enriched });
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
    const item = await addToWishlist(
      req.user.id,
      meal_id || null,
      meal_name,
      meal_thumb || null,
      Boolean(is_ai_generated),
      recipe_details || null
    );
    res.status(201).json({ success: true, item });
  } catch (error) {
    console.error("Add wishlist error:", error);
    res.status(500).json({ error: "Failed to add to wishlist." });
  }
});

app.delete("/api/wishlist/:id", ensureAuthenticated, async (req, res) => {
  const idOrMealId = req.params.id;
  try {
    // 1. Try removing by MealDB meal_id first (e.g. "52772")
    let deleted = await removeFromWishlistByMealId(req.user.id, String(idOrMealId));
    // 2. If not found and input is numeric, fallback to database row id (used for custom AI recipes)
    if (!deleted && !isNaN(idOrMealId)) {
      deleted = await removeFromWishlist(req.user.id, parseInt(idOrMealId, 10));
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
      return res.json({ ingredients: [], totalMeals: 0, title: "Saved Recipes Shopping List" });
    }

    const standardItems = wishlist.filter((item) => !item.is_ai_generated && item.meal_id);
    const uniqueMealIds = [...new Set(standardItems.map((p) => p.meal_id))];

    const apiMeals = await Promise.all(uniqueMealIds.map((id) => getMealDetailsCached(id)));

    const fullMealsList = [];
    wishlist.forEach((item) => {
      if (item.is_ai_generated) {
        fullMealsList.push(item);
      } else {
        const detail = apiMeals.find((m) => m && m.idMeal === item.meal_id);
        if (detail) fullMealsList.push(detail);
      }
    });

    const ingredients = aggregateIngredients(fullMealsList);
    res.json({
      ingredients,
      totalMeals: fullMealsList.length,
      title: "Saved Recipes Shopping List",
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

    const recipe = enrichMealWithDiet(dbRes.rows[0]);
    res.json({ recipe, source });
  } catch (error) {
    console.error("Custom recipe detail error:", error);
    res.status(500).json({ error: "Failed to fetch custom recipe." });
  }
});

/* ========================================================
   5. AI LEFTOVERS SUGGESTER
   ======================================================== */

// Word boundary matching to avoid matching substrings like "egg" in "eggplant"
function matchesIngredient(userIng, recipeIng) {
  const u = userIng.toLowerCase().trim();
  const r = recipeIng.toLowerCase().trim();
  const regex = new RegExp(`\\b${u}s?\\b`, "i");
  return regex.test(r);
}

app.post("/api/leftovers/suggest", leftoversLimiter, ensureAuthenticated, async (req, res) => {
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
    // 1. Fetch meals containing each ingredient with underscore formatting
    const fetchRequests = ingredients.map((ing) =>
      mealDb
        .get(`/filter.php?i=${encodeURIComponent(ing.replace(/\s+/g, "_"))}`)
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
    const top10 = sortedByFreq.slice(0, 10);

    // 2. Fetch full details for the top candidate meals
    const detailPromises = top10.map((item) => getMealDetailsCached(item.meal.idMeal));
    const detailedMeals = await Promise.all(detailPromises);

    const realMatches = [];
    detailedMeals.forEach((meal) => {
      if (!meal) return;

      const mealIngredients = [];
      for (let i = 1; i <= 20; i++) {
        const ing = meal[`strIngredient${i}`];
        if (ing && ing.trim()) {
          mealIngredients.push(ing.trim().toLowerCase());
        }
      }

      let matchesCount = 0;
      ingredients.forEach((userIng) => {
        const matched = mealIngredients.some((recipeIng) => matchesIngredient(userIng, recipeIng));
        if (matched) matchesCount += 1;
      });

      if (matchesCount > 0) {
        const matchRatio = mealIngredients.length > 0 ? matchesCount / mealIngredients.length : 0;
        meal.matchesCount = matchesCount;
        meal.matchRatio = matchRatio;
        meal.totalIngredients = mealIngredients.length;
        realMatches.push(enrichMealWithDiet(meal));
      }
    });

    // 3. Rank real matches by match ratio and count (prevent high-ingredient recipes from skewing)
    realMatches.sort((a, b) => {
      if (b.matchesCount !== a.matchesCount) {
        return b.matchesCount - a.matchesCount;
      }
      return b.matchRatio - a.matchRatio;
    });

    // 4. Generate AI chef ideas with Gemini
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

// Await database initialization and vocabulary preload before listening
await initDB();
await initializeDictionary(mealDb);

app.listen(port, () => {
  console.log(`🚀 Meal Finder REST API running on port ${port}`);
});
