import express from "express";
import axios from "axios";
import bodyParser from "body-parser";
import session from "express-session";
import connectPgSimple from "connect-pg-simple";
import dotenv from "dotenv";
import rateLimit from "express-rate-limit";
import bcrypt from "bcrypt";
import passport from "passport"; // passport import needed

import db from "./db/index.js";
import { configurePassport } from "./config/passport.js";
import { createUser, findUserByEmail } from "./models/user.js";
import { saveMeal, removeMeal, getSavedMeals, removeMealById } from "./models/favorite.js";
import { addToWishlist, removeFromWishlist, removeFromWishlistByMealId, getWishlist } from "./models/wishlist.js";
import { logSearch, getRecentSearches } from "./models/history.js";
import { ensureAuthenticated, ensureGuest } from "./middleware/auth.js";
import { aggregateIngredients } from "./utils/aggregator.js";
import { suggestRecipesWithGemini } from "./utils/gemini.js";

dotenv.config();

const app = express();
const port = process.env.PORT || 3000;
const API_URL = "https://www.themealdb.com/api/json/v1/1";

// Set EJS as view engine
app.set("view engine", "ejs");

// Static files and body parsing
app.use(express.static("public"));
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Session storage in PostgreSQL
const PgSession = connectPgSimple(session);
app.use(
  session({
    store: new PgSession({
      pool: db.pool,
      tableName: "session",
    }),
    secret: process.env.SESSION_SECRET || "fallback_yumplan_secret_key",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 30 * 24 * 60 * 60 * 1000, // 30 days
      secure: false, // Set to true if running on HTTPS
    },
  })
);

// Initialize Passport.js
configurePassport(app);

// Make req.user available to all EJS templates
app.use((req, res, next) => {
  res.locals.user = req.user || null;
  next();
});

// Security: Rate Limiters
const searchLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 100, // 100 searches per 15 minutes per IP
  message: "Too many search requests. Please try again after 15 minutes.",
  handler: (req, res, next, options) => {
    res.status(options.statusCode).render("error.ejs", { message: options.message });
  },
});

const authLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 20, // 20 requests per 15 minutes per IP
  message: "Too many login/signup attempts. Please try again after 15 minutes.",
  handler: (req, res, next, options) => {
    res.status(options.statusCode).render("error.ejs", { message: options.message });
  },
});

// Date calculation helpers
function getMonday(d) {
  d = new Date(d);
  const day = d.getDay();
  const diff = d.getDate() - day + (day === 0 ? -6 : 1);
  return new Date(d.setDate(diff));
}

function formatDate(date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function formatDateFriendly(dateStr) {
  const [y, m, d] = dateStr.split("-").map(Number);
  const date = new Date(y, m - 1, d);
  return date.toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
  });
}

/* ========================================================
   1. CORE / PUBLIC ROUTES
   ======================================================== */

// Home Dashboard
app.get("/", async (req, res, next) => {
  try {
    let recentSearches = [];
    if (req.user) {
      recentSearches = await getRecentSearches(req.user.id);
    }
    res.render("index.ejs", { recentSearches });
  } catch (error) {
    next(error);
  }
});

// Search by name
app.post("/search/name", searchLimiter, async (req, res) => {
  const mealName = req.body.mealName || "";
  try {
    if (req.user && mealName.trim()) {
      await logSearch(req.user.id, mealName.trim(), "name");
    }

    const response = await axios.get(`${API_URL}/search.php?s=${mealName}`);
    const meals = response.data.meals || [];

    let savedMealIds = [];
    let wishlistMealIds = [];
    if (req.user) {
      const favs = await getSavedMeals(req.user.id);
      savedMealIds = favs.map((f) => f.meal_id);
      const wishlist = await getWishlist(req.user.id);
      wishlistMealIds = wishlist.map((w) => w.meal_id);
    }

    res.render("result.ejs", {
      meals,
      query: mealName,
      savedMealIds,
      wishlistMealIds,
    });
  } catch (error) {
    console.error("Search by name error:", error);
    res.render("result.ejs", {
      meals: [],
      query: mealName,
      savedMealIds: [],
      wishlistMealIds: [],
      error: "The recipe database is currently unreachable. Please try again later.",
    });
  }
});

// Search by cuisine
app.post("/search/cuisine", searchLimiter, async (req, res) => {
  const cuisine = req.body.cuisine || "";
  try {
    if (req.user && cuisine.trim()) {
      await logSearch(req.user.id, cuisine.trim(), "cuisine");
    }

    const response = await axios.get(`${API_URL}/filter.php?a=${cuisine}`);
    const meals = response.data.meals || [];

    let savedMealIds = [];
    let wishlistMealIds = [];
    if (req.user) {
      const favs = await getSavedMeals(req.user.id);
      savedMealIds = favs.map((f) => f.meal_id);
      const wishlist = await getWishlist(req.user.id);
      wishlistMealIds = wishlist.map((w) => w.meal_id);
    }

    res.render("result.ejs", {
      meals,
      query: cuisine + " cuisine",
      savedMealIds,
      wishlistMealIds,
    });
  } catch (error) {
    console.error("Search by cuisine error:", error);
    res.render("result.ejs", {
      meals: [],
      query: cuisine,
      savedMealIds: [],
      wishlistMealIds: [],
      error: "The recipe database is currently unreachable. Please try again later.",
    });
  }
});

// Search by ingredient
app.post("/search/ingredient", searchLimiter, async (req, res) => {
  const ingredient = req.body.ingredient || "";
  try {
    if (req.user && ingredient.trim()) {
      await logSearch(req.user.id, ingredient.trim(), "ingredient");
    }

    const response = await axios.get(`${API_URL}/filter.php?i=${ingredient}`);
    const meals = response.data.meals || [];

    let savedMealIds = [];
    let wishlistMealIds = [];
    if (req.user) {
      const favs = await getSavedMeals(req.user.id);
      savedMealIds = favs.map((f) => f.meal_id);
      const wishlist = await getWishlist(req.user.id);
      wishlistMealIds = wishlist.map((w) => w.meal_id);
    }

    res.render("result.ejs", {
      meals,
      query: "Ingredient: " + ingredient,
      savedMealIds,
      wishlistMealIds,
    });
  } catch (error) {
    console.error("Search by ingredient error:", error);
    res.render("result.ejs", {
      meals: [],
      query: ingredient,
      savedMealIds: [],
      wishlistMealIds: [],
      error: "The recipe database is currently unreachable. Please try again later.",
    });
  }
});

// Search random
app.post("/search/random", searchLimiter, async (req, res) => {
  try {
    if (req.user) {
      await logSearch(req.user.id, "Surprise Surprise", "random");
    }

    const response = await axios.get(`${API_URL}/random.php`);
    const meals = response.data.meals || [];

    let savedMealIds = [];
    let wishlistMealIds = [];
    if (req.user) {
      const favs = await getSavedMeals(req.user.id);
      savedMealIds = favs.map((f) => f.meal_id);
      const wishlist = await getWishlist(req.user.id);
      wishlistMealIds = wishlist.map((w) => w.meal_id);
    }

    res.render("result.ejs", {
      meals,
      query: "Random surprise",
      savedMealIds,
      wishlistMealIds,
    });
  } catch (error) {
    console.error("Search random error:", error);
    res.render("result.ejs", {
      meals: [],
      query: "Random",
      savedMealIds: [],
      wishlistMealIds: [],
      error: "The recipe database is currently unreachable. Please try again later.",
    });
  }
});

// View Recipe Detail
app.get("/meal/:id", async (req, res, next) => {
  const id = req.params.id;
  try {
    const response = await axios.get(`${API_URL}/lookup.php?i=${id}`);
    if (!response.data.meals || response.data.meals.length === 0) {
      return res.status(404).render("404.ejs");
    }
    const meal = response.data.meals[0];

    let savedMealIds = [];
    let wishlistMealIds = [];
    if (req.user) {
      const favs = await getSavedMeals(req.user.id);
      savedMealIds = favs.map((f) => f.meal_id);
      const wishlist = await getWishlist(req.user.id);
      wishlistMealIds = wishlist.map((w) => w.meal_id);
    }

    res.render("detail.ejs", { meal, savedMealIds, wishlistMealIds });
  } catch (error) {
    console.error("Meal detail fetch error:", error);
    next(new Error("Unable to fetch recipe details at this time. Please try again later."));
  }
});

/* ========================================================
   2. AUTHENTICATION ROUTES
   ======================================================== */

// Signup GET
app.get("/signup", ensureGuest, (req, res) => {
  res.render("signup.ejs");
});

// Signup POST (with validation)
app.post("/signup", authLimiter, ensureGuest, async (req, res, next) => {
  const { name, email, password } = req.body;

  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  if (!name || name.trim().length < 2) {
    return res.render("signup.ejs", { error: "Name must be at least 2 characters.", name, email });
  }
  if (!email || !emailRegex.test(email)) {
    return res.render("signup.ejs", { error: "Please enter a valid email address.", name, email });
  }
  if (!password || password.length < 8) {
    return res.render("signup.ejs", { error: "Password must be at least 8 characters.", name, email });
  }

  try {
    const existing = await findUserByEmail(email);
    if (existing) {
      return res.render("signup.ejs", { error: "An account with that email already exists.", name, email });
    }

    const hash = await bcrypt.hash(password, 10);
    const user = await createUser(name, email, hash);

    req.login(user, (err) => {
      if (err) return next(err);
      res.redirect("/");
    });
  } catch (error) {
    next(error);
  }
});

// Login GET
app.get("/login", ensureGuest, (req, res) => {
  res.render("login.ejs");
});

// Login POST (custom callback to pass error messages back to the template)
app.post("/login", authLimiter, ensureGuest, (req, res, next) => {
  passport.authenticate("local", (err, user, info) => {
    if (err) return next(err);
    if (!user) {
      return res.render("login.ejs", { error: info.message || "Invalid credentials." });
    }
    req.logIn(user, (err) => {
      if (err) return next(err);
      return res.redirect("/");
    });
  })(req, res, next);
});

// Logout
app.get("/logout", (req, res, next) => {
  req.logout((err) => {
    if (err) return next(err);
    res.redirect("/");
  });
});

/* ========================================================
   3. FAVORITES / COOKBOOK (Protected)
   ======================================================== */

app.get("/cookbook", ensureAuthenticated, async (req, res, next) => {
  try {
    const meals = await getSavedMeals(req.user.id);
    res.render("cookbook.ejs", { meals });
  } catch (error) {
    next(error);
  }
});

// Add Favorite (AJAX POST)
app.post("/favorites", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized. Please log in." });
  }

  const { meal_id, meal_name, meal_thumb } = req.body;
  if (!meal_id || !meal_name) {
    return res.status(400).json({ error: "Meal ID and Meal Name are required." });
  }

  try {
    await saveMeal(req.user.id, meal_id, meal_name, meal_thumb);
    res.json({ success: true });
  } catch (error) {
    console.error("Save favorite error:", error);
    res.status(500).json({ error: "Database error saving favorite." });
  }
});

// Delete Favorite (AJAX DELETE)
app.delete("/favorites/:mealId", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized. Please log in." });
  }

  const { mealId } = req.params;
  try {
    await removeMeal(req.user.id, mealId);
    res.json({ success: true });
  } catch (error) {
    console.error("Remove favorite error:", error);
    res.status(500).json({ error: "Database error removing favorite." });
  }
});

/* ========================================================
   4. WISHLIST & CUSTOM RECIPE DETAIL ROUTES (Protected)
   ======================================================== */

// Wishlist Grid View
app.get("/wishlist", ensureAuthenticated, async (req, res, next) => {
  try {
    const wishlist = await getWishlist(req.user.id);
    res.render("wishlist.ejs", { wishlist });
  } catch (error) {
    next(error);
  }
});

// Add to wishlist (AJAX POST)
app.post("/wishlist", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized. Please log in." });
  }

  const { meal_id, meal_name, meal_thumb, is_ai_generated, recipe_details } = req.body;
  if (!meal_name) {
    return res.status(400).json({ error: "Meal Name is required." });
  }

  try {
    const item = await addToWishlist(req.user.id, meal_id, meal_name, meal_thumb, is_ai_generated, recipe_details);
    res.json({ success: true, id: item.id });
  } catch (error) {
    console.error("Add to wishlist error:", error);
    res.status(500).json({ error: "Database error adding to wishlist." });
  }
});

// Remove from wishlist (AJAX DELETE)
app.delete("/wishlist/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized. Please log in." });
  }

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
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Wishlist item not found." });
    }
  } catch (error) {
    console.error("Remove from wishlist error:", error);
    res.status(500).json({ error: "Database error removing from wishlist." });
  }
});

// Wishlist Shopping List Aggregation
app.get("/wishlist/shopping-list", ensureAuthenticated, async (req, res, next) => {
  try {
    const wishlist = await getWishlist(req.user.id);

    if (wishlist.length === 0) {
      return res.render("shopping-list.ejs", {
        ingredients: [],
        weekStartDate: null,
        weekStartDateFormatted: "Wishlist",
        totalMeals: 0,
      });
    }

    // Separate standard MealDB wishlist items to fetch their ingredients in parallel
    const standardItems = wishlist.filter(item => !item.is_ai_generated && item.meal_id);
    const uniqueMealIds = [...new Set(standardItems.map((p) => p.meal_id))];

    // Fetch meal details from API in parallel
    const mealRequests = uniqueMealIds.map((id) => axios.get(`${API_URL}/lookup.php?i=${id}`));
    const mealResponses = await Promise.all(mealRequests);

    const apiMeals = [];
    mealResponses.forEach((response) => {
      if (response.data && response.data.meals && response.data.meals[0]) {
        apiMeals.push(response.data.meals[0]);
      }
    });

    // Reconstruct list containing standard meal details and AI recipe items
    const fullMealsList = [];
    wishlist.forEach((item) => {
      if (item.is_ai_generated) {
        fullMealsList.push(item);
      } else {
        const detail = apiMeals.find((m) => m.idMeal === item.meal_id);
        if (detail) {
          fullMealsList.push(detail);
        }
      }
    });

    const ingredients = aggregateIngredients(fullMealsList);

    res.render("shopping-list.ejs", {
      ingredients,
      weekStartDate: null,
      weekStartDateFormatted: "Wishlist",
      totalMeals: wishlist.length,
    });
  } catch (error) {
    console.error("Shopping list generation error:", error);
    next(new Error("Unable to generate shopping list. The recipe database could not be reached."));
  }
});

// Get Custom AI Recipe detail view
app.get("/recipe/custom/:id", ensureAuthenticated, async (req, res, next) => {
  const id = parseInt(req.params.id, 10);
  const source = req.query.source || "wishlist";
  if (isNaN(id)) {
    return res.status(404).render("404.ejs");
  }

  try {
    let queryText = "";
    if (source === "cookbook") {
      queryText = `
        SELECT id, meal_name, meal_thumb, is_ai_generated, recipe_details
        FROM saved_meals
        WHERE user_id = $1 AND id = $2;
      `;
    } else {
      queryText = `
        SELECT id, meal_id, meal_name, meal_thumb, is_ai_generated, recipe_details
        FROM wishlist
        WHERE user_id = $1 AND id = $2;
      `;
    }
    const dbRes = await db.query(queryText, [req.user.id, id]);
    if (dbRes.rows.length === 0) {
      return res.status(404).render("404.ejs");
    }
    const recipe = dbRes.rows[0];
    res.render("custom-detail.ejs", { recipe, source });
  } catch (error) {
    next(error);
  }
});

// Save AI Custom Recipe to favorites (AJAX POST)
app.post("/favorites/ai", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized. Please log in." });
  }

  const { meal_name, recipe_details } = req.body;
  if (!meal_name || !recipe_details) {
    return res.status(400).json({ error: "Meal Name and recipe details are required." });
  }

  try {
    await saveMeal(req.user.id, null, meal_name, null, true, recipe_details);
    res.json({ success: true });
  } catch (error) {
    console.error("Save AI custom favorite error:", error);
    res.status(500).json({ error: "Database error saving custom recipe." });
  }
});

// Delete custom AI recipe from favorites (AJAX DELETE)
app.delete("/favorites/custom/:id", async (req, res) => {
  if (!req.isAuthenticated()) {
    return res.status(401).json({ error: "Unauthorized. Please log in." });
  }

  const id = parseInt(req.params.id, 10);
  if (isNaN(id)) {
    return res.status(400).json({ error: "Invalid recipe ID." });
  }

  try {
    const removed = await removeMealById(req.user.id, id);
    if (removed) {
      res.json({ success: true });
    } else {
      res.status(404).json({ error: "Favorite custom recipe not found." });
    }
  } catch (error) {
    console.error("Delete custom favorite error:", error);
    res.status(500).json({ error: "Database error removing custom favorite." });
  }
});

/* ========================================================
   5. AI LEFTOVERS SUGGESTER ROUTES
   ======================================================== */

// Leftovers Form View
app.get("/leftovers", (req, res) => {
  res.render("leftovers.ejs");
});

// Leftovers suggestions matching and Gemini suggestion (POST)
app.post("/leftovers/suggest", async (req, res) => {
  const ingredientsInput = req.body.ingredients || "";
  const ingredients = ingredientsInput
    .split(",")
    .map((i) => i.trim().toLowerCase())
    .filter((i) => i.length > 0);

  if (ingredients.length < 2 || ingredients.length > 5) {
    return res.render("leftovers.ejs", {
      error: "Please enter between 2 and 5 ingredients.",
    });
  }

  try {
    // 1. Fetch search results for each ingredient in parallel
    const fetchRequests = ingredients.map((ing) =>
      axios.get(`${API_URL}/filter.php?i=${encodeURIComponent(ing)}`)
        .catch((err) => {
          console.error(`Error searching ingredient ${ing}:`, err.message);
          return { data: { meals: null } };
        })
    );
    const responses = await Promise.all(fetchRequests);

    // 2. Count frequency of each meal_id across result sets
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

    // Sort meals by frequency score descending
    const sortedByFreq = Object.values(frequencyMap).sort((a, b) => b.count - a.count);

    // Get top 10 matches
    const top10 = sortedByFreq.slice(0, 10);

    // 3. Fetch full details for top 10 in parallel
    const detailRequests = top10.map((item) =>
      axios.get(`${API_URL}/lookup.php?i=${item.meal.idMeal}`)
        .catch((err) => {
          console.error(`Error fetching detail for meal ${item.meal.idMeal}:`, err.message);
          return { data: { meals: null } };
        })
    );
    const detailResponses = await Promise.all(detailRequests);

    const realMatches = [];
    detailResponses.forEach((resp) => {
      if (resp.data && resp.data.meals && resp.data.meals[0]) {
        const meal = resp.data.meals[0];

        // Extract ingredients
        const mealIngredients = [];
        for (let i = 1; i <= 20; i++) {
          const ing = meal[`strIngredient${i}`];
          if (ing && ing.trim()) {
            mealIngredients.push(ing.trim().toLowerCase());
          }
        }

        // Count how many user input ingredients intersect with recipe's ingredients
        let matchesCount = 0;
        ingredients.forEach((userIng) => {
          const matched = mealIngredients.some(
            (recipeIng) => recipeIng.includes(userIng) || userIng.includes(recipeIng)
          );
          if (matched) {
            matchesCount += 1;
          }
        });

        meal.matchesCount = matchesCount;
        realMatches.push(meal);
      }
    });

    // Sort realMatches by matchesCount descending
    realMatches.sort((a, b) => b.matchesCount - a.matchesCount);

    // 4. Call Gemini API for 2-3 custom suggestion recipe ideas
    const aiSuggestions = await suggestRecipesWithGemini(ingredients);

    // 5. Gather current user's favorites and wishlist to display states
    let savedMealIds = [];
    let wishlistMealIds = [];
    if (req.user) {
      const favs = await getSavedMeals(req.user.id);
      savedMealIds = favs.map((f) => f.meal_id);

      const wishlist = await getWishlist(req.user.id);
      wishlistMealIds = wishlist.map((w) => w.meal_id);
    }

    res.render("leftovers-results.ejs", {
      query: ingredients.join(", "),
      totalIngredientsCount: ingredients.length,
      realMatches,
      aiSuggestions,
      savedMealIds,
      wishlistMealIds,
    });
  } catch (error) {
    console.error("Leftovers suggester error:", error);
    res.status(500).render("error.ejs", {
      message: "An error occurred while generating recipe suggestions. Please try again.",
    });
  }
});

/* ========================================================
   6. ERROR HANDLERS & 404
   ======================================================== */

// Handle 404 - Page Not Found
app.use((req, res) => {
  res.status(404).render("404.ejs");
});

// Centralized error handler middleware (safe - no stack traces)
app.use((err, req, res, next) => {
  console.error("Central Error Handler:", err);
  res.status(500).render("error.ejs", {
    message: err.message || "An unexpected error occurred on the server.",
  });
});

app.listen(port, () => {
  console.log(`Listening on port ${port}`);
});
