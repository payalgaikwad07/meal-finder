import db from "./index.js";
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

async function runMigration() {
  console.log("Starting database initialization/migration...");
  try {
    const schemaPath = path.join(__dirname, "schema.sql");
    const schemaSql = fs.readFileSync(schemaPath, "utf8");
    
    await db.query(schemaSql);
    console.log("Database tables and schema initialized successfully! 🎉");
    process.exit(0);
  } catch (error) {
    console.error("Database initialization failed: ❌", error);
    process.exit(1);
  }
}

runMigration();
