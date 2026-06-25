import { Router } from "express";
import bcrypt from "bcryptjs";
import { getDb, saveDb } from "../db.js";
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

  const existing = db.exec("SELECT id FROM users WHERE email = ?", [email]);
  if (existing.length > 0 && existing[0].values.length > 0) {
    return res.status(409).json({ error: "An account with this email already exists" });
  }

  const hashedPassword = await bcrypt.hash(password, 10);
  db.run("INSERT INTO users (email, password, name) VALUES (?, ?, ?)", [email, hashedPassword, name]);
  saveDb();

  const result = db.exec("SELECT id, name, email FROM users WHERE email = ?", [email]);
  const user = result[0].values[0];
  const userId = user[0];
  const token = generateToken(userId);

  res.status(201).json({
    token,
    user: { id: userId, name: user[1], email: user[2] },
  });
});

router.post("/login", async (req, res) => {
  const { email, password } = req.body;

  if (!email || !password) {
    return res.status(400).json({ error: "Email and password are required" });
  }

  const db = await getDb();

  const result = db.exec("SELECT id, name, email, password FROM users WHERE email = ?", [email]);

  if (result.length === 0 || result[0].values.length === 0) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const row = result[0].values[0];
  const userId = row[0];
  const name = row[1];
  const userEmail = row[2];
  const hashedPassword = row[3];

  const valid = await bcrypt.compare(password, hashedPassword);
  if (!valid) {
    return res.status(401).json({ error: "Invalid email or password" });
  }

  const token = generateToken(userId);

  res.json({
    token,
    user: { id: userId, name, email: userEmail },
  });
});

export default router;
