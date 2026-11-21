import { Router } from "express";
import bcrypt from "bcryptjs";
import { z } from "zod";
import { pool } from "../db.js";
import { signToken, setAuthCookie, clearAuthCookie, requireAuth } from "../auth.js";

const router = Router();

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(1),
});

router.post("/login", async (req, res) => {
  const parsed = loginSchema.safeParse(req.body);
  if (!parsed.success) {
    return res.status(400).json({ error: "Valid email and password are required" });
  }
  const { email, password } = parsed.data;

  const { rows } = await pool.query(
    "SELECT id, email, name, role, password_hash FROM users WHERE email = $1",
    [email.toLowerCase()]
  );
  const user = rows[0];

  // Same message for unknown email and wrong password (no user enumeration)
  if (!user || !(await bcrypt.compare(password, user.password_hash))) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  setAuthCookie(res, signToken(user));
  res.json({ user: { id: user.id, email: user.email, name: user.name, role: user.role } });
});

router.post("/logout", (req, res) => {
  clearAuthCookie(res);
  res.json({ ok: true });
});

router.get("/me", requireAuth, async (req, res) => {
  const { rows } = await pool.query(
    "SELECT id, email, name, role FROM users WHERE id = $1",
    [req.user.id]
  );
  if (!rows[0]) return res.status(401).json({ error: "Account no longer exists" });
  res.json({ user: rows[0] });
});

export default router;