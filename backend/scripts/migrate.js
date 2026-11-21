import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";
import { pool } from "../src/db.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dir = path.join(__dirname, "..", "migrations");

const files = fs.readdirSync(dir).filter((f) => f.endsWith(".sql")).sort();

for (const file of files) {
  const sql = fs.readFileSync(path.join(dir, file), "utf8");
  console.log(`Running ${file}...`);
  await pool.query(sql);
}

console.log("Migrations complete.");
await pool.end();