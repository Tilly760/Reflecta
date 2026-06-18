import { useState, useCallback } from "react";
import "./App.css";
import EntryCard from "./components/EntryCard";
import Calendar from "./components/Calendar";

const MOODS = ["😊", "🙂", "😐", "😔", "😭"];

export default function App() {
  const [search, setSearch] = useState("");
  const [title, setTitle] = useState("");
  const [text, setText] = useState("");
  const [mood, setMood] = useState("😊");

  const [entries, setEntries] = useState(() => {
    return JSON.parse(localStorage.getItem("entries") || "[]");
  });

  const [editingIndex, setEditingIndex] = useState(null);
  const [deletingIndex, setDeletingIndex] = useState(null);
  const [viewingIndex, setViewingIndex] = useState(null);
  const [confirmDeleteIndex, setConfirmDeleteIndex] = useState(null);

  // View state: "list" | "view" | "compose"
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
    setTitle(entry.title || "");
    setText(entry.text);
    setMood(entry.mood);
    setEditingIndex(index);
    navigateTo("compose");
  };

  const cancelEdit = () => {
    setTitle("");
    setText("");
    setMood("😊");
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
    setTitle(entry.title || "");
    setText(entry.text);
    setMood(entry.mood);
    setEditingIndex(viewingIndex);
    setViewingIndex(null);
    navigateTo("compose");
  };

  const handleAddNew = () => {
    setTitle("");
    setText("");
    setMood("😊");
    setEditingIndex(null);
    navigateTo("compose");
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

  const displayedEntries = entries
    .map((entry, originalIndex) => ({ ...entry, originalIndex }))
    .sort((a, b) => Number(b.pinned) - Number(a.pinned));

  const filteredEntries = displayedEntries.filter((entry) => {
    const query = search.toLowerCase();
    const matchesSearch =
      (entry.title || "").toLowerCase().includes(query) ||
      entry.text.toLowerCase().includes(query) ||
      entry.mood.includes(query);
    const matchesDate = selectedDate ? toDateKey(entry.date) === selectedDate : true;
    return matchesSearch && matchesDate;
  });

  // ─── Render ─────────────────────────────────────────────

  return (
    <div className="app">

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
          <span className="logo-reflect">Reflect</span>
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
                  entries={entries}
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
                {entries.length === 0 ? "No memories yet" : "No matching memories"}
              </p>
              <p className="empty-subtitle">
                {entries.length === 0
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

      {/* ── READ-ONLY VIEW ── */}
      {view === "view" && viewingIndex !== null && (
        <>
          <div className="composer-header">
            <button className="btn btn-ghost" onClick={cancelEdit} style={{ padding: "0.5rem 0.75rem" }}>
              ← Back
            </button>
            <button className="btn btn-primary" onClick={handleEditFromView} style={{ marginLeft: "auto" }}>
              ✏️ Edit
            </button>
          </div>

          <div className="entry-view card">
            <div className="entry-meta">
              <div className="entry-meta-left">
                <span className="entry-mood">{entries[viewingIndex]?.mood}</span>
                <span className="entry-date">
                  {new Date(entries[viewingIndex]?.date).toLocaleDateString("en-US", {
                    weekday: "long", year: "numeric", month: "long", day: "numeric",
                    hour: "numeric", minute: "2-digit",
                  })}
                </span>
              </div>
              {entries[viewingIndex]?.pinned && (
                <span className="entry-pin-badge">📌 Pinned</span>
              )}
            </div>
            {entries[viewingIndex]?.title && (
              <h2 className="entry-view-title">{entries[viewingIndex].title}</h2>
            )}
            <p className="entry-view-text">{entries[viewingIndex]?.text}</p>
          </div>
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
