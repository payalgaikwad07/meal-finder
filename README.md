# 🍳 YumPlan - Meal Finder, AI Chef & Smart Grocery Assistant

An intelligent, full-stack recipe discovery, AI leftovers chef, and smart grocery shopping application powered by **React (Vite)**, **Express REST API**, **PostgreSQL**, **TheMealDB API**, and **Google Gemini AI**.

---

## 🏗️ Project Architecture

```
meal-finder/
├── backend/                  # Node.js & Express REST API
│   ├── db/                   # PostgreSQL schema & migration scripts
│   ├── models/               # Data access layers (Users, Favorites, History)
│   ├── middleware/           # Secure JWT authentication & rate limiting
│   ├── utils/                # Smart ingredient aggregator, diet classifier, typo suggestions, Gemini AI
│   ├── test.js               # Unit test suite for aggregators, badges & typos
│   ├── index.js              # Express REST server with CORS & proxy handling
│   ├── package.json
│   └── .env.example
│
├── frontend/                 # Modern React + Vite Single-Page Application
│   ├── src/
│   │   ├── api/              # Axios API client with automatic JWT token attachment
│   │   ├── context/          # User authentication context
│   │   ├── components/       # Navbar, MealCard, Toast notifications
│   │   ├── pages/            # Home, SearchResults, RecipeDetail, CustomRecipeDetail,
│   │   │                     # Cookbook, ShoppingList, Leftovers, Auth
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

## ✨ Key Features

- **🔍 Global Recipe Search & Fuzzy Typo Correction**: Search by recipe name, cuisine/country, or main ingredient. Includes intelligent **"Did You Mean?"** suggestions for misspelled words (e.g. `chikcen` → `chicken`, `brad` → `bread`).
- **🏷️ Automatic Dietary Badges**: Recipes are classified in real-time with smart dietary tags (**Vegetarian**, **Vegan**, **Gluten-Free**, **High-Protein**, **Dairy-Free**, **Low-Carb**).
- **🎲 Surprise Me**: Instant random recipe generator to discover new cuisines.
- **🤖 AI Leftovers Chef**: Enter 2 to 6 ingredients from your fridge to get custom AI recipe creations via Google Gemini along with matched database recipes.
- **🛒 Smart Shopping List & Unit Aggregator**: Aggregates ingredients across saved recipes, normalizing units (e.g. tablespoons, cups, grams) and merging quantities (including fractions like `1½ cups`).
- **📖 Personal Cookbook**: Bookmark and organize favorite recipes with one click.
- **🔐 Secure JWT Authentication**: Stateless JWT auth with bcrypt password hashing and rate limiting.
- **🧪 Automated Backend Test Suite**: Built-in test runner for ingredient aggregation, measure parsing, diet classification, and typo handling.

---

## 🛠️ Tech Stack

- **Frontend**: React 18, Vite, React Router 6, Axios, Lucide Icons, Vanilla CSS
- **Backend**: Node.js, Express.js, PostgreSQL (`pg`), JSON Web Tokens (`jsonwebtoken`), `bcrypt`, `axios`
- **AI & External APIs**: Google Gemini API, TheMealDB API
- **Deployment**: Vercel (Frontend), Render (Backend), Neon

---

## 🚀 Local Development Setup

### 1. Prerequisites
- **Node.js** (v18+)
- **PostgreSQL** (local or cloud instance like Neon / Supabase)
- **Git**

### 2. Clone Repository & Install Dependencies
```bash
git clone https://github.com/payalgaikwad07/meal-finder.git
cd meal-finder

# Install root, backend, and frontend dependencies
npm run install:all
```
*(Or navigate into `backend/` and `frontend/` separately to run `npm install`)*

### 3. Configure Backend Environment
Copy `backend/.env.example` to `backend/.env`:
```env
PORT=5000
NODE_ENV=development
CLIENT_URL=http://localhost:5173
FRONTEND_URL=http://localhost:5173
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/meal_finder
JWT_SECRET=your_super_secret_jwt_key
GEMINI_API_KEY=your_gemini_api_key_here
GEMINI_MODEL=gemini-2.5-flash
```

### 4. Initialize Database
```bash
cd backend
npm run migrate
```

### 5. Run Backend Tests
```bash
cd backend
npm test
```

### 6. Start Development Servers
Open two terminal windows:

**Terminal 1 (Backend):**
```bash
cd backend
npm run dev
# Running on http://localhost:5000
```

**Terminal 2 (Frontend):**
```bash
cd frontend
npm run dev
# Running on http://localhost:5173
```

---

## 🌐 Production Deployment

### 1. Database (Neon / Supabase)
1. Create a cloud PostgreSQL database on [Neon](https://neon.tech/) or [Supabase](https://supabase.com/).
2. Copy your PostgreSQL connection string (`DATABASE_URL`).
3. Run the migrations in `backend/db/schema.sql` to initialize tables.

### 2. Backend (Render)
1. Create a new **Web Service** on [Render](https://render.com) linked to this repository.
2. Set configuration:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install`
   - **Start Command**: `npm start`
3. Add Environment Variables:
   - `NODE_ENV`: `production`
   - `DATABASE_URL`: `postgresql://...`
   - `JWT_SECRET`: *(A strong random secret)*
   - `CLIENT_URL`: `https://your-frontend.vercel.app`
   - `GEMINI_API_KEY`: *(Your Google AI Studio API key)*

### 3. Frontend (Vercel)
1. Create a new project on [Vercel](https://vercel.com) linked to this repository.
2. Set configuration:
   - **Root Directory**: `frontend`
   - **Framework Preset**: `Vite`
   - **Build Command**: `npm run build`
   - **Output Directory**: `dist`
3. Add Environment Variable:
   - `VITE_API_URL`: `https://your-backend.onrender.com`

---

## 📄 License
ISC License © Payal Gaikwad
