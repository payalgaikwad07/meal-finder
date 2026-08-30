🍳 YumPlan - Meal Finder, Weekly Planner & AI Chef

An intelligent, full-stack recipe discovery, weekly meal planning, and
grocery list application powered by React, Express REST API,
PostgreSQL, TheMealDB API, and Google Gemini AI.

🏗️ Project Architecture

meal-finder/
├── backend/                       # Node.js & Express REST API
│   ├── db/                        # Database connection & migration scripts
│   ├── models/                    # Database models/data access
│   ├── middleware/                # Authentication & middleware
│   ├── utils/                     # Ingredient aggregation & Gemini integration
│   ├── index.js                   # Express REST API server
│   ├── package.json
│   └── .env.example
│
├── frontend/                      # React + Vite Single Page Application
│   ├── src/
│   │   ├── api/                   # Axios API client
│   │   ├── context/               # Authentication context
│   │   ├── components/            # Reusable UI components
│   │   ├── pages/                 # Application pages
│   │   ├── App.jsx                # Client-side routing
│   │   ├── main.jsx
│   │   └── index.css              # Application styling
│   ├── index.html
│   ├── vite.config.js
│   ├── vercel.json
│   ├── package.json
│   └── .env.example
│
├── package.json
├── .gitignore
└── README.md

✨ Features

Global Recipe Search --- Search by recipe name, cuisine/country,
or main ingredient using TheMealDB API.

Surprise Me --- Generate a random recipe.

AI Leftovers Assistant --- Enter 2--6 leftover ingredients to
find suitable recipes and generate custom recipe ideas using Google
Gemini AI.

Weekly Meal Planner --- Plan breakfast, lunch, and dinner from
Monday to Sunday.

Smart Shopping List --- Aggregate ingredients from planned meals
or saved recipes.

Personal Cookbook & Wishlist --- Save recipes and access them
later.

Secure Authentication --- JWT authentication with bcrypt
password hashing.

🛠️ Technologies Used

Frontend

React

Vite

Axios

React Router

CSS

Backend

Node.js

Express.js

REST API

JWT

bcrypt

CORS

Database

PostgreSQL

Neon PostgreSQL for production

External APIs

TheMealDB API

Google Gemini API

Deployment

Frontend: Vercel

Backend: Render

Database: Neon PostgreSQL

🔄 Application Flow

                    User
                     │
                     ↓
              React Frontend
                 (Vercel)
                     │
                API Requests
                     │
                     ↓
              Express Backend
                 (Render)
                /     |      \
               /      |       \
              ↓       ↓        ↓
       PostgreSQL  TheMealDB  Gemini AI
          (Neon)      API        API

The React frontend communicates with the Express backend through REST
APIs. The backend handles authentication, database operations, external
API requests, and application logic.

🚀 Local Development Setup

1. Prerequisites

Node.js v18+

PostgreSQL

npm

Git

2. Clone the Repository

git clone <your-github-repository-url>
cd meal-finder

3. Install Dependencies

From the repository root:

npm run install:all

Or install separately:

cd backend
npm install

cd ../frontend
npm install

4. Configure Backend Environment Variables

Create backend/.env based on backend/.env.example:

PORT=5000
DATABASE_URL=postgresql://postgres:your_password@localhost:5432/meal_finder
JWT_SECRET=your_jwt_secret
SESSION_SECRET=your_session_secret
CLIENT_URL=http://localhost:5173
GEMINI_API_KEY=your_gemini_api_key

Never commit .env files or API keys to GitHub.

5. Initialize the Database

cd backend
npm run migrate

6. Run the Backend

npm start

Backend:

http://localhost:5000

7. Run the Frontend

In another terminal:

cd frontend
npm run dev

Frontend:

http://localhost:5173

🌐 Deployment

React Frontend → Vercel
Express Backend → Render
PostgreSQL → Neon

1. PostgreSQL --- Neon

Create a PostgreSQL project on Neon and copy the production connection
string.

Use it as:

DATABASE_URL=<your-neon-connection-string>

Run the database migration against the production database.

2. Backend --- Render

Create a Web Service connected to the GitHub repository.

Root Directory: backend
Build Command: npm install
Start Command: npm start

Add:

NODE_ENV=production
DATABASE_URL=<your-neon-database-url>
JWT_SECRET=<your-secure-jwt-secret>
SESSION_SECRET=<your-secure-session-secret>
GEMINI_API_KEY=<your-gemini-api-key>
CLIENT_URL=<your-vercel-frontend-url>

Render provides the production backend URL, for example:

https://your-backend.onrender.com

3. Frontend --- Vercel

Create a Vercel project from the same GitHub repository.

Root Directory: frontend
Framework Preset: Vite
Build Command: npm run build
Output Directory: dist

Add:

VITE_API_URL=https://your-backend.onrender.com

Vercel builds and deploys the React application.

🔐 Environment Variables

Backend

DATABASE_URL=
JWT_SECRET=
SESSION_SECRET=
GEMINI_API_KEY=
CLIENT_URL=

Frontend

VITE_API_URL=

Never commit actual secrets or .env files to GitHub.

📡 API Architecture

React
  │
  │ HTTP Request
  ↓
Express REST API
  │
  ├── Authentication
  ├── Wishlist
  ├── Cookbook
  ├── Planner
  ├── Shopping List
  ├── Recipe Search
  └── AI Leftovers
  │
  ↓
PostgreSQL / External APIs

📁 Main Frontend Pages

Home

Search Results

Recipe Details

Custom Recipe Details

Cookbook

Wishlist

Weekly Planner

Shopping List

Leftovers Assistant

Authentication
