import { Router } from "express";
import { getDb } from "../db.js";
import { authMiddleware } from "../middleware/auth.js";

const router = Router();

router.use(authMiddleware);

router.get("/", async (req, res) => {
  const db = await getDb();

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;

  const result = await db.query(
    `SELECT id, type, title, text, mood, tasks, locked_until, delivered, pinned, date
     FROM entries
     WHERE user_id = $1
     ORDER BY pinned DESC, date DESC`,
    [req.userId]
  );

  const entries = result.rows.map((row) => {
    const entry = {
      id: row.id,
      type: row.type || "journal",
      title: row.title || "",
      text: row.text || "",
      mood: row.mood || "😊",
      date: row.date,
      pinned: row.pinned,
    };

    if (entry.type === "todo") {
      entry.tasks = row.tasks || [];
    }

    if (entry.type === "future") {
      entry.lockedUntil = row.locked_until || "";
      entry.delivered = row.delivered;

      if (entry.lockedUntil && entry.lockedUntil <= todayKey && !entry.delivered) {
        entry.delivered = true;
        entry.pinned = true;

        db.query(
          "UPDATE entries SET delivered = true, pinned = true WHERE id = $1",
          [entry.id]
        );
      }
    }

    return entry;
  });

  res.json({ entries });
});


router.post("/", async (req, res) => {
  const db = await getDb();

  const { type, title, text, mood, tasks, lockedUntil, pinned } = req.body;

  const result = await db.query(
    `INSERT INTO entries
     (user_id, type, title, text, mood, tasks, locked_until, delivered, pinned, date)
     VALUES ($1,$2,$3,$4,$5,$6,$7,$8,$9,$10)
     RETURNING id`,
    [
      req.userId,
      type || "journal",
      title || "",
      text || "",
      mood || "😊",
      JSON.stringify(tasks || []),
      lockedUntil || null,
      false,
      !!pinned,
      new Date().toISOString(),
    ]
  );

  const id = result.rows[0].id;

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
      date: new Date().toISOString(),
    },
  });
});


router.put("/:id", async (req, res) => {
  const db = await getDb();

  const { id } = req.params;

  const {
    type,
    title,
    text,
    mood,
    tasks,
    lockedUntil,
    pinned,
    delivered,
  } = req.body;


  const existing = await db.query(
    "SELECT id FROM entries WHERE id = $1 AND user_id = $2",
    [id, req.userId]
  );

  if (existing.rows.length === 0) {
    return res.status(404).json({ error: "Entry not found" });
  }


  await db.query(
    `UPDATE entries SET
      type = COALESCE($1,type),
      title = COALESCE($2,title),
      text = COALESCE($3,text),
      mood = COALESCE($4,mood),
      tasks = COALESCE($5,tasks),
      locked_until = COALESCE($6,locked_until),
      delivered = COALESCE($7,delivered),
      pinned = COALESCE($8,pinned)
     WHERE id = $9 AND user_id = $10`,
    [
      type ?? null,
      title ?? null,
      text ?? null,
      mood ?? null,
      tasks ? JSON.stringify(tasks) : null,
      lockedUntil ?? null,
      delivered ?? null,
      pinned ?? null,
      id,
      req.userId,
    ]
  );


  res.json({ success: true });
});


router.delete("/:id", async (req, res) => {
  const db = await getDb();

  const { id } = req.params;

  const existing = await db.query(
    "SELECT id FROM entries WHERE id = $1 AND user_id = $2",
    [id, req.userId]
  );

  if (existing.rows.length === 0) {
    return res.status(404).json({ error: "Entry not found" });
  }


  await db.query(
    "DELETE FROM entries WHERE id = $1 AND user_id = $2",
    [id, req.userId]
  );


  res.json({ success: true });
});


export default router;
