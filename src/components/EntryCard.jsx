export default function EntryCard({
  entry,
  index,
  onEdit,
  onDelete,
  onTogglePin,
  onView,
  isDeleting
}) {
  // Format date for display
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

  const cardClasses = [
    'entry-card',
    'card',
    isDeleting ? 'deleting' : '',
    entry.pinned ? 'pinned' : ''
  ].filter(Boolean).join(' ');

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
          <span className="entry-mood">{entry.mood}</span>
          <span className="entry-date">{formatDate(entry.date)}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
          {entry.pinned && (
            <span className="entry-pin-badge">📌 Pinned</span>
          )}
        </div>
      </div>

      {entry.title && <h3 className="entry-title">{entry.title}</h3>}
      <p className="entry-text">{entry.text}</p>

      <div className="entry-actions">
        <button
          className="btn-icon"
          onClick={() => onEdit(index)}
          title="Edit memory"
        >
          ✏️
        </button>
        <button
          className={`btn-icon ${entry.pinned ? 'pin-active' : ''}`}
          onClick={() => onTogglePin(index)}
          title={entry.pinned ? 'Unpin memory' : 'Pin memory'}
        >
          📌
        </button>
        <button
          className="btn-icon danger"
          onClick={() => onDelete(index)}
          title="Delete memory"
        >
          🗑️
        </button>
      </div>
    </div>
  );
}