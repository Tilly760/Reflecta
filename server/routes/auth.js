import { Router } from "express";
import bcrypt from "bcryptjs";
import { getDb } from "../db.js";
import { generateToken } from "../middleware/auth.js";

const router = Router();

router.post("/register", async (req, res) => {
  const { email, password, name } = req.body;

  if (!email || !password || !name) {
    return res.status(400).json({ error: "Email, password, and name are required" });
  }

  if (password.length < 6) {
    return res.status(400).json({ error: "Password must be at least 6 characters" });
  }

  const db = await getDb();

  const existing = await db.query(
    "SELECT id FROM users WHERE email = $1",
    [email]
  );

  if (existing.rows.length > 0) {
    return res.status(409).json({ error: "An account with this email already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);

  const result = await db.query(
    "INSERT INTO users (email, password, name) VALUES ($1, $2, $3) RETURNING id, name, email",
    [email, hashedPassword, name]
  );

  const user = result.rows[0];

  const token = generateToken(user.id);

  res.status(201).json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  });
});


router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const db = await getDb();

  const result = await db.query(
    "SELECT id, name, email, password FROM users WHERE email = $1",
    [email]
  );

  if (result.rows.length === 0) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const user = result.rows[0];

  const valid = await bcrypt.compare(password, user.password);

  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = generateToken(user.id);

  res.json({
    token,
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
    },
  });
});

export default router;
