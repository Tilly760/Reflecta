import { useState, useCallback, useEffect } from "react";
import "./App.css";
import EntryCard from "./components/EntryCard";
import Calendar from "./components/Calendar";
import { downloadPdf } from "./utils/downloadPdf";

const MOODS = ["😊", "🙂", "😐", "😔", "😭"];

export default function App() {
  const [theme, setTheme] = useState(() => {
    const stored = localStorage.getItem("theme");
    if (stored) return stored;
    return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light";
  });

  useEffect(() => {
    if (theme === "dark") {
      document.documentElement.classList.add("dark");
    } else {
      document.documentElement.classList.remove("dark");
    }
    localStorage.setItem("theme", theme);
  }, [theme]);

  const toggleTheme = () => {
    setTheme((t) => (t === "light" ? "dark" : "light"));
  };

  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [mood, setMood] = useState("😊");
  const [tasks, setTasks] = useState([{ text: "", done: false }]);
  const [lockedUntil, setLockedUntil] = useState("");

  const [entries, setEntries] = useState(() => {
    const loaded = JSON.parse(localStorage.getItem("entries") || "[]");
    const today = new Date();
    const key = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
    let changed = false;
    const updated = loaded.map(entry => {
      if (entry.type === "future" && entry.lockedUntil && entry.lockedUntil <= key && !entry.delivered) {
        changed = true;
        return { ...entry, pinned: true, delivered: true };
      }
      return entry;
    });
    if (changed) localStorage.setItem("entries", JSON.stringify(updated));
    return changed ? updated : loaded;
  });

  const [editingIndex, setEditingIndex] = useState(null);
  const [deletingIndex, setDeletingIndex] = useState(null);
  const [viewingIndex, setViewingIndex] = useState(null);
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState(null);



  // View state: "list" | "view" | "compose" | "choose" | "todo-compose" | "future-compose"
  const [view, setView] = useState("list");
  const navigateTo = (newView) => {
    if (document.startViewTransition) {
      document.startViewTransition(() => setView(newView));
    } else {
      setView(newView);
    }
  };

  // Toast
  const [toast, setToast] = useState(null);
  const showToast = useCallback((message) => {
    setToast(message);
    setTimeout(() => setToast(null), 2200);
  }, []);

  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const visibleEntries = entries.filter(entry =>
    !(entry.type === "future" && entry.lockedUntil && entry.lockedUntil > todayKey)
  );

  // Auto-save draft
  useEffect(() => {
    if (view === "compose") {
      const hasContent = title.trim() || text.trim();
      if (hasContent) {
        const draft = { editingIndex, title, text, mood };
        localStorage.setItem("draft", JSON.stringify(draft));
      } else {
        localStorage.removeItem("draft");
      }
    } else if (view === "todo-compose") {
      const hasContent = title.trim() || tasks.some(t => t.text.trim());
      if (hasContent) {
        const draft = { editingIndex, title, tasks };
        localStorage.setItem("todo-draft", JSON.stringify(draft));
      } else {
        localStorage.removeItem("todo-draft");
      }
    } else if (view === "future-compose") {
      const hasContent = title.trim() || text.trim();
      if (hasContent) {
        const draft = { editingIndex, title, text, mood, lockedUntil };
        localStorage.setItem("future-draft", JSON.stringify(draft));
      } else {
        localStorage.removeItem("future-draft");
      }
    }
  }, [title, text, mood, editingIndex, view, tasks, lockedUntil]);

  // Restore draft on mount
  useEffect(() => {
    const savedDraft = localStorage.getItem("draft");
    if (savedDraft) {
      try {
        const { editingIndex: dIndex, title: dTitle, text: dText, mood: dMood } = JSON.parse(savedDraft);
        if (dTitle.trim() || dText.trim()) {
          setEditingIndex(dIndex);
          setTitle(dTitle);
          setText(dText);
          setMood(dMood);
          setView("compose");
          setTimeout(() => {
            showToast("📝 Unsaved draft restored");
          }, 100);
        }
      } catch (e) {
        console.error("Failed to parse draft", e);
      }
      return;
    }

    const savedTodoDraft = localStorage.getItem("todo-draft");
    if (savedTodoDraft) {
      try {
        const { editingIndex: dIndex, title: dTitle, tasks: dTasks } = JSON.parse(savedTodoDraft);
        if (dTitle.trim() || dTasks.some(t => t.text.trim())) {
          setEditingIndex(dIndex);
          setTitle(dTitle);
          setTasks(dTasks);
          setView("todo-compose");
          setTimeout(() => {
            showToast("📋 Unsaved draft restored");
          }, 100);
        }
      } catch (e) {
        console.error("Failed to parse todo draft", e);
      }
      return;
    }

    const savedFutureDraft = localStorage.getItem("future-draft");
    if (savedFutureDraft) {
      try {
        const { editingIndex: dIndex, title: dTitle, text: dText, mood: dMood, lockedUntil: dLocked } = JSON.parse(savedFutureDraft);
        if (dTitle.trim() || dText.trim()) {
          setEditingIndex(dIndex);
          setTitle(dTitle);
          setText(dText);
          setMood(dMood);
          setLockedUntil(dLocked || "");
          setView("future-compose");
          setTimeout(() => {
            showToast("🔮 Unsaved draft restored");
          }, 100);
        }
      } catch (e) {
        console.error("Failed to parse future draft", e);
      }
    }
  }, [showToast]);

  // Calendar
  const now = new Date();
  const [calYear, setCalYear] = useState(now.getFullYear());
  const [calMonth, setCalMonth] = useState(now.getMonth());
  const [selectedDate, setSelectedDate] = useState(null);
  const [showCalendar, setShowCalendar] = useState(false);

  const handlePrevMonth = () => {
    if (calMonth === 0) { setCalYear(y => y - 1); setCalMonth(11); }
    else setCalMonth(m => m - 1);
  };
  const handleNextMonth = () => {
    if (calMonth === 11) { setCalYear(y => y + 1); setCalMonth(0); }
    else setCalMonth(m => m + 1);
  };

  // ─── Handlers ───────────────────────────────────────────

  const saveEntry = () => {
    if (!title.trim() || !text.trim()) return;

    const entry = {
      title: title.trim(),
      text,
      mood,
      date: new Date().toISOString(),
      pinned: editingIndex !== null ? entries[editingIndex]?.pinned || false : false,
    };

    let updated;
    if (editingIndex !== null) {
      updated = [...entries];
      updated[editingIndex] = entry;
      setEditingIndex(null);
    } else {
      updated = [entry, ...entries];
    }

    if (document.startViewTransition) {
      document.startViewTransition(() => setEntries(updated));
    } else {
      setEntries(updated);
    }
    localStorage.setItem("entries", JSON.stringify(updated));
    localStorage.removeItem("draft");
    setText("");
    setTitle("");
    navigateTo("list");
    showToast(editingIndex !== null ? "✅ Memory updated" : "✨ Memory saved");
  };

  const deleteEntry = (indexToDelete) => {
    setConfirmDeleteIndex(indexToDelete);
  };

  const confirmDelete = () => {
    const indexToDelete = confirmDeleteIndex;
    setConfirmDeleteIndex(null);
    setDeletingIndex(indexToDelete);
    setTimeout(() => {
      const updated = entries.filter((_, i) => i !== indexToDelete);
      if (document.startViewTransition) {
        document.startViewTransition(() => setEntries(updated));
      } else {
        setEntries(updated);
      }
      localStorage.setItem("entries", JSON.stringify(updated));
      setDeletingIndex(null);
      showToast("🗑️ Memory deleted");
    }, 300);
  };

  const editEntry = (index) => {
    const entry = entries[index];
    if (entry.type === "todo") {
      setTitle(entry.title || "");
      setTasks(entry.tasks || [{ text: "", done: false }]);
      setEditingIndex(index);
      navigateTo("todo-compose");
    } else if (entry.type === "future") {
      setTitle(entry.title || "");
      setText(entry.text);
      setMood(entry.mood);
      setLockedUntil(entry.lockedUntil || "");
      setEditingIndex(index);
      navigateTo("future-compose");
    } else {
      setTitle(entry.title || "");
      setText(entry.text);
      setMood(entry.mood);
      setEditingIndex(index);
      navigateTo("compose");
    }
  };

  const cancelEdit = () => {
    localStorage.removeItem("draft");
    setTitle("");
    setText("");
    setMood("😊");
    setLockedUntil("");
    setTasks([{ text: "", done: false }]);
    setEditingIndex(null);
    setViewingIndex(null);
    navigateTo("list");
  };

  const handleViewEntry = (index) => {
    setViewingIndex(index);
    navigateTo("view");
  };

  const handleEditFromView = () => {
    const entry = entries[viewingIndex];
    if (entry.type === "todo") {
      setTitle(entry.title || "");
      setTasks(entry.tasks || [{ text: "", done: false }]);
      setEditingIndex(viewingIndex);
      setViewingIndex(null);
      navigateTo("todo-compose");
    } else if (entry.type === "future") {
      setTitle(entry.title || "");
      setText(entry.text);
      setMood(entry.mood);
      setLockedUntil(entry.lockedUntil || "");
      setEditingIndex(viewingIndex);
      setViewingIndex(null);
      navigateTo("future-compose");
    } else {
      setTitle(entry.title || "");
      setText(entry.text);
      setMood(entry.mood);
      setEditingIndex(viewingIndex);
      setViewingIndex(null);
      navigateTo("compose");
    }
  };

  const handleAddNew = () => {
    navigateTo("choose");
  };

  const handleChooseJournal = () => {
    setTitle("");
    setText("");
    setMood("😊");
    setEditingIndex(null);
    navigateTo("compose");
  };

  const handleChooseTodo = () => {
    setTitle("");
    setTasks([{ text: "", done: false }]);
    setEditingIndex(null);
    navigateTo("todo-compose");
  };

  const handleChooseFuture = () => {
    setTitle("");
    setText("");
    setMood("😊");
    setLockedUntil("");
    setEditingIndex(null);
    navigateTo("future-compose");
  };

  // ─── Todo Handlers ───────────────────────────────

  const handleTaskChange = (index, value) => {
    setTasks(prev => prev.map((t, i) => (i === index ? { ...t, text: value } : t)));
  };

  const handleTaskToggle = (index) => {
    setTasks(prev => prev.map((t, i) => (i === index ? { ...t, done: !t.done } : t)));
  };

  const handleAddTask = () => {
    setTasks(prev => [...prev, { text: "", done: false }]);
  };

  const handleRemoveTask = (index) => {
    setTasks(prev => prev.filter((_, i) => i !== index));
  };

  const saveTodo = () => {
    if (!title.trim()) return;

    const validTasks = tasks.filter(t => t.text.trim());
    if (validTasks.length === 0) return;

    const entry = {
      type: "todo",
      title: title.trim(),
      tasks: validTasks,
      date: new Date().toISOString(),
      pinned: editingIndex !== null ? entries[editingIndex]?.pinned || false : false,
    };

    let updated;
    if (editingIndex !== null) {
      updated = [...entries];
      updated[editingIndex] = entry;
      setEditingIndex(null);
    } else {
      updated = [entry, ...entries];
    }

    if (document.startViewTransition) {
      document.startViewTransition(() => setEntries(updated));
    } else {
      setEntries(updated);
    }
    localStorage.setItem("entries", JSON.stringify(updated));
    localStorage.removeItem("todo-draft");
    setTitle("");
    setTasks([{ text: "", done: false }]);
    navigateTo("list");
    showToast(editingIndex !== null ? "✅ List updated" : "📋 List saved");
  };

  const cancelTodo = () => {
    localStorage.removeItem("todo-draft");
    setTitle("");
    setTasks([{ text: "", done: false }]);
    setEditingIndex(null);
    navigateTo("list");
  };

  // ─── Future Handlers ────────────────────────────

  const saveFuture = () => {
    if (!title.trim() || !text.trim() || !lockedUntil) return;

    if (lockedUntil <= todayKey) return;

    const entry = {
      type: "future",
      title: title.trim(),
      text,
      mood,
      lockedUntil: lockedUntil,
      date: new Date().toISOString(),
      pinned: editingIndex !== null ? entries[editingIndex]?.pinned || false : false,
      delivered: editingIndex !== null ? (entries[editingIndex]?.delivered || false) : false,
    };

    let updated;
    if (editingIndex !== null) {
      updated = [...entries];
      updated[editingIndex] = entry;
      setEditingIndex(null);
    } else {
      updated = [entry, ...entries];
    }

    if (document.startViewTransition) {
      document.startViewTransition(() => setEntries(updated));
    } else {
      setEntries(updated);
    }
    localStorage.setItem("entries", JSON.stringify(updated));
    localStorage.removeItem("future-draft");
    setTitle("");
    setText("");
    setMood("😊");
    setLockedUntil("");
    navigateTo("list");
    showToast(editingIndex !== null ? "🔮 Letter updated" : "✨ Sent to the future");
  };

  const cancelFuture = () => {
    localStorage.removeItem("future-draft");
    setTitle("");
    setText("");
    setMood("😊");
    setLockedUntil("");
    setEditingIndex(null);
    navigateTo("list");
  };

  const togglePin = (index) => {
    const updated = [...entries];
    const wasPinned = updated[index].pinned;
    updated[index].pinned = !wasPinned;
    if (document.startViewTransition) {
      document.startViewTransition(() => setEntries(updated));
    } else {
      setEntries(updated);
    }
    localStorage.setItem("entries", JSON.stringify(updated));
    showToast(wasPinned ? "📍 Unpinned" : "📌 Pinned to top");
  };

  // ─── Filtering ──────────────────────────────────────────

  const toDateKey = (dateStr) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return null;
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
  };

  const displayedEntries = visibleEntries
    .map(entry => ({ ...entry, originalIndex: entries.indexOf(entry) }))
    .sort((a, b) => {
      const aFutureTop = a.type === "future" && a.pinned;
      const bFutureTop = b.type === "future" && b.pinned;
      if (aFutureTop && !bFutureTop) return -1;
      if (!aFutureTop && bFutureTop) return 1;
      return Number(b.pinned) - Number(a.pinned);
    });

  const filteredEntries = displayedEntries.filter((entry) => {
    const query = search.toLowerCase();
    let searchText;
    if (entry.type === "todo") {
      searchText = (entry.title || "") + " " + (entry.tasks || []).map(t => t.text).join(" ");
    } else if (entry.type === "future") {
      searchText = (entry.title || "") + " " + (entry.text || "") + " future letter";
    } else {
      searchText = (entry.title || "") + " " + (entry.text || "") + " " + (entry.mood || "");
    }
    const matchesSearch = searchText.toLowerCase().includes(query);
    const matchesDate = selectedDate ? toDateKey(entry.date) === selectedDate : true;
    return matchesSearch && matchesDate;
  });

  // ─── Render ─────────────────────────────────────────────

  return (
    <div className="app">

      {/* Theme Toggle Top Bar */}
      <div className="top-bar">
        <button className="theme-toggle" onClick={toggleTheme} aria-label={`Switch to ${theme === "light" ? "dark" : "light"} mode`}>
          {theme === "light" ? "🌙" : "☀️"}
        </button>
      </div>

      {/* Toast */}
      {toast && (
        <div className="toast-container">
          <div className="toast">{toast}</div>
        </div>
      )}

      {/* In-app Delete Confirmation Modal */}
      {confirmDeleteIndex !== null && (
        <div className="modal-overlay" onClick={() => setConfirmDeleteIndex(null)}>
          <div className="modal-card card" onClick={(e) => e.stopPropagation()}>
            <div className="modal-icon">🗑️</div>
            <h3 className="modal-title">Delete this memory?</h3>
            <p className="modal-body">This can't be undone. Your memory will be gone forever.</p>
            <div className="modal-actions">
              <button className="btn btn-ghost" onClick={() => setConfirmDeleteIndex(null)}>
                Keep it
              </button>
              <button className="btn btn-danger" onClick={confirmDelete}>
                Yes, delete
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <header className="app-header">
        <h1 className="app-logo">
          <span className="logo-reflect">Reflecta</span>
          <span className="logo-dot">.</span>
        </h1>
        <p className="app-tagline">Your personal space for thoughts &amp; reflections</p>
      </header>

      {/* ── LIST VIEW ── */}
      {view === "list" && (
        <>
          <button className="add-entry-btn" onClick={handleAddNew}>
            <span className="add-entry-icon">＋</span> New Entry
          </button>

          <div className="search-row">
            <div className="search-container">
              <span className="search-icon">🔍</span>
              <input
                id="search-input"
                type="text"
                className="search-input"
                placeholder="Search memories…"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
              />
            </div>
            <button
              className={`cal-toggle-btn ${showCalendar ? "active" : ""} ${selectedDate ? "filtered" : ""}`}
              onClick={() => setShowCalendar(!showCalendar)}
              aria-label="Toggle calendar"
              title="Filter by date"
            >
              📅
            </button>
            {showCalendar && (
              <div className="calendar-popover">
                <Calendar
                  entries={visibleEntries}
                  selectedDate={selectedDate}
                  onSelectDate={(date) => { setSelectedDate(date); setShowCalendar(false); }}
                  year={calYear}
                  month={calMonth}
                  onPrevMonth={handlePrevMonth}
                  onNextMonth={handleNextMonth}
                />
              </div>
            )}
          </div>

          <div className="section-header">
            <span className="section-title">Memories</span>
            {filteredEntries.length > 0 && (
              <span className="entry-count">{filteredEntries.length}</span>
            )}
          </div>

          {filteredEntries.length === 0 && (
            <div className="empty-state">
              <div className="empty-icon">📝</div>
              <p className="empty-title">
                {visibleEntries.length === 0 ? "No memories yet" : "No matching memories"}
              </p>
              <p className="empty-subtitle">
                {visibleEntries.length === 0
                  ? "Start writing to capture your thoughts"
                  : "Try adjusting your search or date filter"}
              </p>
            </div>
          )}

          {filteredEntries.map((entry) => (
            <EntryCard
              key={entry.originalIndex}
              entry={entry}
              index={entry.originalIndex}
              onEdit={editEntry}
              onDelete={deleteEntry}
              onTogglePin={togglePin}
              onView={handleViewEntry}
              isDeleting={deletingIndex === entry.originalIndex}
            />
          ))}
        </>
      )}

      {/* ── CHOOSE VIEW ── */}
      {view === "choose" && (
        <>
          <div className="choose-header">
            <button className="btn btn-ghost" onClick={() => navigateTo("list")} style={{ padding: "0.5rem 0.75rem" }}>
              ← Back
            </button>
          </div>

          <div className="choose">
            <h2 className="choose-heading">What would you like to create?</h2>

            <button className="choose-option" onClick={handleChooseTodo}>
              <span className="choose-icon">📋</span>
              <div className="choose-info">
                <span className="choose-title">To-do List</span>
                <span className="choose-desc">Plan your tasks and stay organized</span>
              </div>
              <span className="choose-arrow">→</span>
            </button>

            <button className="choose-option" onClick={handleChooseJournal}>
              <span className="choose-icon">📝</span>
              <div className="choose-info">
                <span className="choose-title">Journal Entry</span>
                <span className="choose-desc">Write down your thoughts and reflections</span>
              </div>
              <span className="choose-arrow">→</span>
            </button>

            <button className="choose-option" onClick={handleChooseFuture}>
              <span className="choose-icon">🔮</span>
              <div className="choose-info">
                <span className="choose-title">To the Future</span>
                <span className="choose-desc">Write a letter to your future self</span>
              </div>
              <span className="choose-arrow">→</span>
            </button>
          </div>
        </>
      )}

      {/* ── TODO COMPOSE VIEW ── */}
      {view === "todo-compose" && (
        <>
          <div className="composer-header">
            <button className="btn btn-ghost" onClick={cancelTodo} style={{ padding: "0.5rem 0.75rem" }}>
              ← Back
            </button>
            <span className="composer-title">
              {editingIndex !== null ? "Edit To-do List" : "New To-do List"}
            </span>
          </div>

          <div className="composer card">
            <input
              type="text"
              className="composer-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="List title…"
              autoFocus
            />

            <div className="todo-tasks">
              {tasks.map((task, i) => (
                <div key={i} className="todo-task-row">
                  <button
                    className={`todo-checkbox ${task.done ? "checked" : ""}`}
                    onClick={() => handleTaskToggle(i)}
                    aria-label={task.done ? "Mark as not done" : "Mark as done"}
                  >
                    {task.done ? "✓" : ""}
                  </button>
                  <input
                    type="text"
                    className="todo-task-input"
                    value={task.text}
                    onChange={(e) => handleTaskChange(i, e.target.value)}
                    placeholder="Write a task…"
                  />
                  <button
                    className="todo-remove-btn"
                    onClick={() => handleRemoveTask(i)}
                    aria-label="Remove task"
                  >
                    ✕
                  </button>
                </div>
              ))}
            </div>

            <button className="todo-add-btn" onClick={handleAddTask}>
              ＋ Add another task
            </button>

            <div className="composer-actions">
              <button className="btn btn-ghost" onClick={cancelTodo}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={saveTodo}
                disabled={!title.trim() || !tasks.some(t => t.text.trim())}
              >
                {editingIndex !== null ? "Update List" : "Save List"}
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── FUTURE COMPOSE VIEW ── */}
      {view === "future-compose" && (
        <>
          <div className="composer-header">
            <button className="btn btn-ghost" onClick={cancelFuture} style={{ padding: "0.5rem 0.75rem" }}>
              ← Back
            </button>
            <span className="composer-title future-title">
              ✧ Future Letter
            </span>
          </div>

          <div className="future-composer card">
            <div className="future-composer-glow" />

            <div className="composer-top">
              <div className="mood-selector">
                <span className="mood-label">Mood</span>
                <div className="mood-pills">
                  {MOODS.map((m) => (
                    <button
                      key={m}
                      className={`mood-pill ${mood === m ? "active" : ""}`}
                      onClick={() => setMood(m)}
                      aria-label={`Select mood ${m}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <input
              type="text"
              className="composer-title-input future-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title your letter…"
              autoFocus
            />

            <textarea
              className="composer-textarea future-textarea"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Write a letter to your future self…"
              rows={8}
            />

            <div className="future-date-section">
              <span className="future-date-label">✧ Deliver on</span>
              <input
                type="date"
                className="future-date-input"
                value={lockedUntil}
                onChange={(e) => setLockedUntil(e.target.value)}
                min={new Date(Date.now() + 86400000).toISOString().split("T")[0]}
              />
            </div>

            <div className="composer-actions">
              <button className="btn btn-ghost" onClick={cancelFuture}>
                Cancel
              </button>
              <button
                className="btn btn-future"
                onClick={saveFuture}
                disabled={!title.trim() || !text.trim() || !lockedUntil}
              >
                ✧ Send to Future
              </button>
            </div>
          </div>
        </>
      )}

      {/* ── READ-ONLY VIEW ── */}
      {view === "view" && viewingIndex !== null && (
        <>
          {(() => {
            const entry = entries[viewingIndex];
            const isFuture = entry?.type === "future";
            const isLocked = isFuture && entry.lockedUntil > todayKey;

            return (
              <div className="composer-header">
                <button className="btn btn-ghost" onClick={cancelEdit} style={{ padding: "0.5rem 0.75rem" }}>
                  ← Back
                </button>
                {!isLocked && entry?.type !== "future" && (
                  <button className="btn btn-primary" onClick={handleEditFromView} style={{ marginLeft: "auto" }}>
                    ✏️ Edit
                  </button>
                )}
                {entry && (
                  <button className="btn btn-ghost" onClick={() => downloadPdf(entry, document.querySelector(".entry-view"))} style={{ marginLeft: !isLocked && entry?.type !== "future" ? "0.5rem" : "auto" }}>
                    📄 PDF
                  </button>
                )}
              </div>
            );
          })()}

          {(() => {
            const entry = entries[viewingIndex];
            const isFuture = entry?.type === "future";
            const isLocked = isFuture && entry.lockedUntil > todayKey;

            return (
              <div className={`entry-view card ${isLocked ? "entry-locked" : ""}`}>
                <div className="entry-meta">
                  <div className="entry-meta-left">
                    {entry?.type === "todo" ? (
                      <span className="entry-mood">📋</span>
                    ) : isFuture ? (
                      <span className="entry-mood">🔮</span>
                    ) : (
                      <span className="entry-mood">{entry?.mood}</span>
                    )}
                    <span className="entry-date">
                      {new Date(entry?.date).toLocaleDateString("en-US", {
                        weekday: "long", year: "numeric", month: "long", day: "numeric",
                        hour: "numeric", minute: "2-digit",
                      })}
                    </span>
                  </div>
                  {entry?.pinned && (
                    <span className="entry-pin-badge">📌 Pinned</span>
                  )}
                </div>

                {isLocked ? (
                  <div className="locked-overlay">
                    <div className="locked-icon">🔮</div>
                    <h2 className="locked-title">Sealed until</h2>
                    <p className="locked-date">
                      {new Date(entry.lockedUntil + "T12:00:00").toLocaleDateString("en-US", {
                        weekday: "long", year: "numeric", month: "long", day: "numeric",
                      })}
                    </p>
                    <p className="locked-subtitle">This letter is waiting for the right moment.</p>
                  </div>
                ) : (
                  <>
                    {entry?.title && (
                      <h2 className="entry-view-title">{entry.title}</h2>
                    )}
                    {entry?.type === "todo" ? (
                      <div className="todo-view-list">
                        {entry?.tasks?.map((task, i) => (
                          <div key={i} className={`todo-view-row ${task.done ? "done" : ""}`}>
                            <span className="todo-view-check">{task.done ? "✓" : "○"}</span>
                            <span className="todo-view-text">{task.text}</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="entry-view-text">{entry?.text}</p>
                    )}
                  </>
                )}
              </div>
            );
          })()}
        </>
      )}

      {/* ── COMPOSE VIEW ── */}
      {view === "compose" && (
        <>
          <div className="composer-header">
            <button className="btn btn-ghost" onClick={cancelEdit} style={{ padding: "0.5rem 0.75rem" }}>
              ← Back
            </button>
            <span className="composer-title">
              {editingIndex !== null ? "Edit Memory" : "New Memory"}
            </span>
          </div>

          <div className="composer card">
            <div className="composer-top">
              <div className="mood-selector">
                <span className="mood-label">Mood</span>
                <div className="mood-pills">
                  {MOODS.map((m) => (
                    <button
                      key={m}
                      className={`mood-pill ${mood === m ? "active" : ""}`}
                      onClick={() => setMood(m)}
                      aria-label={`Select mood ${m}`}
                    >
                      {m}
                    </button>
                  ))}
                </div>
              </div>
            </div>

            <input
              type="text"
              className="composer-title-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Title your thoughts…"
              autoFocus
            />

            <textarea
              id="entry-textarea"
              className="composer-textarea"
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Go on. Write…"
              rows={8}
            />

            <div className="composer-actions">
              <button className="btn btn-ghost" onClick={cancelEdit}>
                Cancel
              </button>
              <button
                className="btn btn-primary"
                onClick={saveEntry}
                disabled={!title.trim() || !text.trim()}
              >
                {editingIndex !== null ? "Update Memory" : "Save Memory"}
              </button>
            </div>
          </div>
        </>
      )}

    </div>
  );
}
