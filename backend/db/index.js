import pg from "pg";
import dotenv from "dotenv";

dotenv.config();

const { Pool } = pg;

const connectionString = process.env.DATABASE_URL;

const pool = connectionString
  ? new Pool({
      connectionString,
      ssl: process.env.NODE_ENV === "production" || connectionString.includes("sslmode=require") || !connectionString.includes("localhost")
        ? { rejectUnauthorized: false }
        : false,
    })
  : new Pool({
      user: process.env.DB_USER || "postgres",
      password: process.env.DB_PASSWORD || "postgres",
      host: process.env.DB_HOST || "localhost",
      port: parseInt(process.env.DB_PORT || "5432", 10),
      database: process.env.DB_DATABASE || "meal_finder",
    });

export default {
  query: (text, params) => pool.query(text, params),
  pool,
};
