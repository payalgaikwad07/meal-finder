# 🍳 YumPlan - Meal Finder, Weekly Planner & AI Chef

An intelligent, full-stack recipe discovery, weekly meal planning, and grocery list application powered by **React**, **Express REST API**, **PostgreSQL**, **TheMealDB API**, and **Google Gemini AI**.

---

## 🏗️ Project Architecture

The project is cleanly decoupled into two dedicated folders:

```
meal-finder/
├── backend/                  # Node.js & Express REST API
│   ├── db/                   # Database connection & schema scripts
│   ├── models/               # Data access layers (Users, Favorites, Wishlist, Planner, History)
│   ├── middleware/           # JWT & Session auth middlewares
│   ├── utils/                # Smart ingredient aggregator & Gemini AI integration
│   ├── index.js              # Express REST server with CORS & rate limiting
│   ├── package.json
│   └── .env.example
│
├── frontend/                 # Modern React + Vite Single-Page Application
│   ├── src/
│   │   ├── api/              # Axios API client with automatic JWT token attachment
│   │   ├── context/          # User authentication context
│   │   ├── components/       # Navbar, Footer, MealCard, PlannerModal, Toast
│   │   ├── pages/            # Home, SearchResults, RecipeDetail, CustomRecipeDetail,
│   │   │                     # Cookbook, Wishlist, Planner, ShoppingList, Leftovers, Auth
│   │   ├── App.jsx           # Client-side routing
│   │   ├── main.jsx
│   │   └── index.css         # Modern culinary aesthetic styling
│   ├── index.html
│   ├── vite.config.js        # Local API proxying
│   ├── vercel.json           # SPA rewrites for Vercel deployment
│   ├── package.json
│   └── .env.example
│
├── package.json              # Root scripts
└── README.md
```

---

## ✨ Features

- **🔍 Global Recipe Search**: Search by Recipe Name, Cuisine/Country, or Main Ingredient with instant results.
- **🎲 Surprise Me**: One-click random recipe generator.
- **🤖 AI Leftovers Assistant**: Enter 2 to 6 leftover ingredients from your fridge to get custom recipe ideas created by Google Gemini AI and match real database recipes.
- **📅 Interactive Weekly Planner**: Schedule breakfast, lunch, and dinner for Monday through Sunday.
- **🛒 Smart Shopping List**: Aggregates ingredients across your planned meals or wishlist, consolidating units and quantities.
- **📖 Personal Cookbook & Wishlist**: Save favorite recipes and bookmark dishes to cook later.
- **🔐 Secure Authentication**: JWT token & session support with bcrypt password hashing.

---

## 🚀 Local Development Setup

### 1. Prerequisites
- Node.js (v18+)
- PostgreSQL installed locally or a cloud database URL (e.g. Supabase, Neon, Railway)

### 2. Install Dependencies
From the repository root:
```bash
npm run install:all
```
*(Or navigate into `backend/` and run `npm install`, then into `frontend/` and run `npm install`)*

### 3. Configure Backend Environment
Copy `backend/.env.example` to `backend/.env`:
```env
PORT=5000
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/meal_finder
JWT_SECRET=your_jwt_secret_key_here
CLIENT_URL=http://localhost:5173
GEMINI_API_KEY=your_gemini_api_key_here
```

### 4. Initialize Database Tables
```bash
cd backend
npm run migrate
```

### 5. Run Backend & Frontend Locally
Open two terminal windows:

**Terminal 1 (Backend):**
```bash
npm run backend
# Starts REST API on http://localhost:5000
```

**Terminal 2 (Frontend):**
```bash
npm run frontend
# Starts React Vite dev server on http://localhost:5173
```

---

## 🌐 Deployment Guide

### Deploying Frontend to Vercel

1. Push your changes to your GitHub repository:
   ```bash
   git add .
   git commit -m "Restructure into React frontend and Express backend"
   git push origin main
   ```
2. Go to your [Vercel Dashboard](https://vercel.com) and click **Add New Project**.
3. Import your `meal-finder` repository.
4. In the configuration:
   - **Root Directory**: Select `frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
5. Under **Environment Variables**, add:
   - `VITE_API_URL`: Your deployed backend URL (e.g. `https://your-meal-backend.onrender.com`)
6. Click **Deploy**. Vercel will automatically build and deploy your React app with full SPA routing (`vercel.json`).

---

### Deploying Backend to Render / Railway

1. Go to [Render](https://render.com) or [Railway](https://railway.app).
2. Create a new **Web Service** and link your GitHub repository.
3. Configure the service settings:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
4. In **Environment Variables**, set:
   - `NODE_ENV`: `production`
   - `PORT`: `5000` (or leave default for provider)
   - `DATABASE_URL`: Your production PostgreSQL connection string (from Supabase, Neon, or Render PostgreSQL)
   - `JWT_SECRET`: A secure random secret string
   - `CLIENT_URL`: Your deployed Vercel frontend URL (e.g. `https://your-app.vercel.app`)
   - `GEMINI_API_KEY`: Your Google Gemini API key
5. Deploy the backend and copy its live URL (e.g., `https://your-api.onrender.com`).
6. Update `VITE_API_URL` on Vercel to point to this live backend URL.

---

## 📄 License
ISC License &copy; Payal Gaikwad
