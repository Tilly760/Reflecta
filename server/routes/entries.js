import { Router } from "express";
import { getDb, saveDb } from "../db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);

router.get("/", async (req, res) => {
  const db = await getDb();

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const result = db.exec(
    `SELECT id, type, title, text, mood, tasks, locked_until, delivered, pinned, date
     FROM entries WHERE user_id = ? ORDER BY pinned DESC, date DESC`,
    [req.userId]
  );

  const entries = result.length > 0 ? result[0].values.map((row) => {
    const entry = {
      id: row[0],
      type: row[1] || "journal",
      title: row[2] || "",
      text: row[3] || "",
      mood: row[4] || "😊",
      date: row[9],
      pinned: !!row[8],
    };

    if (entry.type === "todo") {
      try {
        entry.tasks = JSON.parse(row[5] || "[]");
      } catch {
        entry.tasks = [];
      }
    }

    if (entry.type === "future") {
      entry.lockedUntil = row[6] || "";
      entry.delivered = !!row[7];
      if (entry.lockedUntil && entry.lockedUntil <= todayKey && !entry.delivered) {
        entry.delivered = true;
        entry.pinned = true;
        db.run(
          "UPDATE entries SET delivered = 1, pinned = 1 WHERE id = ?",
          [entry.id]
        );
        saveDb();
      }
    }

    return entry;
  }) : [];

  res.json({ entries });
});

router.post("/", async (req, res) => {
  const db = await getDb();
  const { type, title, text, mood, tasks, lockedUntil, pinned } = req.body;

  const tasksJson = tasks ? JSON.stringify(tasks) : "[]";
  const now = new Date().toISOString();

  db.run(
    `INSERT INTO entries (user_id, type, title, text, mood, tasks, locked_until, delivered, pinned, date)
     VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    [
        req.userId,
        type || "journal",
        title || "",
        text || "",
        mood || "😊",
        tasksJson,
        lockedUntil || null,
        0,
        pinned ? 1 : 0,
        now,
      ]
  );

  const result = db.exec("SELECT last_insert_rowid() as id");
  saveDb();
  const id = result[0].values[0][0];

  res.status(201).json({
    entry: {
      id,
      type: type || "journal",
      title: title || "",
      text: text || "",
      mood: mood || "😊",
      tasks: tasks || [],
      lockedUntil: lockedUntil || "",
      delivered: false,
      pinned: !!pinned,
      date: now,
    },
  });
});

router.put("/:id", async (req, res) => {
  const db = await getDb();
  const { id } = req.params;
  const { type, title, text, mood, tasks, lockedUntil, pinned, delivered } = req.body;

  const existing = db.exec(
    "SELECT id FROM entries WHERE id = ? AND user_id = ?",
    [id, req.userId]
  );

  if (existing.length === 0 || existing[0].values.length === 0) {
    return res.status(404).json({ error: "Entry not found" });
  }

  const tasksJson = tasks ? JSON.stringify(tasks) : null;

  const deliveredVal = delivered !== undefined ? (delivered ? 1 : 0) : null;
  const pinnedVal = pinned !== undefined ? (pinned ? 1 : 0) : null;

  db.run(
    `UPDATE entries SET
      type = COALESCE(?, type),
      title = COALESCE(?, title),
      text = COALESCE(?, text),
      mood = COALESCE(?, mood),
      tasks = COALESCE(?, tasks),
      locked_until = COALESCE(?, locked_until),
      delivered = COALESCE(?, delivered),
      pinned = COALESCE(?, pinned)
     WHERE id = ? AND user_id = ?`,
    [
        type ?? null, title ?? null, text ?? null, mood ?? null,
        tasksJson, lockedUntil ?? null,
        deliveredVal, pinnedVal,
        id, req.userId,
      ]
  );
  saveDb();

  res.json({ success: true });
});

router.delete("/:id", async (req, res) => {
  const db = await getDb();
  const { id } = req.params;

  const existing = db.exec(
    "SELECT id FROM entries WHERE id = ? AND user_id = ?",
    [id, req.userId]
  );

  if (existing.length === 0 || existing[0].values.length === 0) {
    return res.status(404).json({ error: "Entry not found" });
  }

  db.run("DELETE FROM entries WHERE id = ? AND user_id = ?", [id, req.userId]);
  saveDb();

  res.json({ success: true });
});

export default router;
