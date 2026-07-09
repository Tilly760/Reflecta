import express from "express";
import cors from "cors";
import { getDb } from "./db.js";
import authRoutes from "./routes/auth.js";
import entryRoutes from "./routes/entries.js";
import { authMiddleware } from "./middleware/auth.js";

const app = express();
const PORT = process.env.PORT || 3001;

app.use(
  cors({
    origin: [
      "http://localhost:5173",
      "https://reflecta-two.vercel.app",
    ],
    credentials: true,
  })
);
app.use(express.json());

app.use("/api/auth", authRoutes);
app.use("/api/entries", entryRoutes);

app.get("/api/me", authMiddleware, async (req, res) => {
const db = await getDb();

const result = await db.query(
  "SELECT id, name, email FROM users WHERE id = $1",
  [req.userId]
);

if (result.rows.length === 0) {
  return res.status(404).json({ error: "User not found" });
}

const user = result.rows[0];

res.json({
  user: {
    id: user.id,
    name: user.name,
    email: user.email,
  },
});
});

async function start() {
  await getDb();
  app.listen(PORT, () => {
    console.log(`Reflecta server running on http://localhost:${PORT}`);
  });
}

app.use((req, res) => {
  res.status(404).json({ error: "Not found" });
});

app.use((err, req, res, next) => {
  console.error("Unhandled error:", err);
  res.status(500).json({ error: "Internal server error" });
});

start();

