export default function EntryCard({
  entry,
  index,
  onEdit,
  onDelete,
  onTogglePin,
  onView,
  isDeleting
}) {

  const formatDate = (dateStr) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      weekday: 'short',
      month: 'short',
      day: 'numeric',
      hour: 'numeric',
      minute: '2-digit'
    });
  };

  const isTodo = entry.type === 'todo';
  const isFuture = entry.type === 'future';
  const today = new Date();
  const todayKey = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, "0")}-${String(today.getDate()).padStart(2, "0")}`;
  const isLocked = isFuture && entry.lockedUntil > todayKey;

  const cardClasses = [
    'entry-card',
    'card',
    isDeleting ? 'deleting' : '',
    entry.pinned ? 'pinned' : '',
    isTodo ? 'todo-card' : '',
    isFuture ? 'future-card' : '',
    isFuture && !isLocked ? 'future-envelope' : '',
    isLocked ? 'entry-locked' : ''
  ].filter(Boolean).join(' ');

  const formatUnlockDate = (dateStr) => {
    const d = new Date(dateStr + "T12:00:00");
    return d.toLocaleDateString('en-US', {
      month: 'short', day: 'numeric', year: 'numeric'
    });
  };

  const formatSentDate = (dateStr) => {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return dateStr;
    return d.toLocaleDateString('en-US', {
      month: 'long', day: 'numeric', year: 'numeric'
    });
  };

  const doneCount = isTodo ? (entry.tasks || []).filter(t => t.done).length : 0;
  const totalCount = isTodo ? (entry.tasks || []).length : 0;

  return (
    <div
      className={cardClasses}
      style={{ viewTransitionName: `entry-${index}`, cursor: 'pointer' }}
      onClick={(e) => {
        if (e.target.closest('.entry-actions') || e.target.closest('.btn-icon')) {
          return;
        }
        onView(index);
      }}
    >
      <div className="entry-meta">
        <div className="entry-meta-left">
          <span className="entry-mood">{isTodo ? "📋" : isFuture ? "🔮" : entry.mood}</span>
          <span className="entry-date">{formatDate(entry.date)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          {isLocked && (
            <span className="entry-pin-badge locked-badge">🔒 Sealed</span>
          )}
          {entry.pinned && (
            <span className="entry-pin-badge">📌 Pinned</span>
          )}
        </div>
      </div>

      {entry.title && !(isFuture && !isLocked) && <h3 className="entry-title">{entry.title}</h3>}

      {isTodo ? (
        <div className="todo-card-preview">
          {(entry.tasks || []).slice(0, 3).map((task, i) => (
            <div key={i} className={`todo-preview-row ${task.done ? "done" : ""}`}>
              <span className="todo-preview-check">{task.done ? "✓" : "○"}</span>
              <span className="todo-preview-text">{task.text}</span>
            </div>
          ))}
          {(entry.tasks || []).length > 3 && (
            <div className="todo-preview-more">+{entry.tasks.length - 3} more</div>
          )}
          <div className="todo-preview-progress">
            <div className="todo-progress-bar">
              <div
                className="todo-progress-fill"
                style={{ width: totalCount > 0 ? `${(doneCount / totalCount) * 100}%` : "0%" }}
              />
            </div>
            <span className="todo-progress-text">{doneCount}/{totalCount}</span>
          </div>
        </div>
      ) : isLocked ? (
        <div className="future-locked-preview">
          <div className="locked-preview-icon">🔮</div>
          <p className="locked-preview-text">Opens {formatUnlockDate(entry.lockedUntil)}</p>
        </div>
      ) : isFuture ? (
        <div className="future-envelope-card">
          <div className="envelope-top">
            <span className="envelope-seal">✧</span>
          </div>
          <div className="envelope-body">
            <p className="envelope-label">Letter from</p>
            <p className="envelope-date">{formatSentDate(entry.date)}</p>
            <p className="envelope-you">You</p>
          </div>
        </div>
      ) : (
        <p className="entry-text">{entry.text}</p>
      )}

      <div className="entry-actions">
        {!isLocked && !isFuture && (
          <button
            className="btn-icon"
            onClick={() => onEdit(index)}
            title={isTodo ? "Edit list" : "Edit"}
          >
            ✏️
          </button>
        )}
        <button
          className={`btn-icon ${entry.pinned ? 'pin-active' : ''}`}
          onClick={() => onTogglePin(index)}
          title={entry.pinned ? 'Unpin' : 'Pin'}
        >
          📌
        </button>
        <button
          className="btn-icon danger"
          onClick={() => onDelete(index)}
          title="Delete"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}
