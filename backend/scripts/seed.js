import bcrypt from "bcryptjs";
import { pool } from "../src/db.js";

const users = [
  { email: "admin@coffeeninja.test", name: "Admin User", password: "Admin@1234", role: "admin" },
  { email: "staff1@coffeeninja.test", name: "Staff One", password: "Staff@1234", role: "staff" },
  { email: "staff2@coffeeninja.test", name: "Staff Two", password: "Staff@1234", role: "staff" },
];

for (const u of users) {
  const hash = await bcrypt.hash(u.password, 10);
  await pool.query(
    `INSERT INTO users (email, name, password_hash, role)
     VALUES ($1, $2, $3, $4)
     ON CONFLICT (email) DO NOTHING`,
    [u.email, u.name, hash, u.role]
  );
  console.log(`Seeded ${u.email}`);
}

await pool.end();