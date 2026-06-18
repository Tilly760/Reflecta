const DAYS_OF_WEEK = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"
];

function toDateKey(dateStr) {
  const d = new Date(dateStr);
  if (isNaN(d.getTime())) return null;
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default function Calendar({ entries, selectedDate, onSelectDate, year, month, onPrevMonth, onNextMonth }) {
  const entryDays = new Set(
    entries.map((e) => toDateKey(e.date)).filter(Boolean)
  );

  const firstDay = new Date(year, month, 1).getDay();
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const todayKey = toDateKey(new Date().toISOString());

  const cells = [];
  for (let i = 0; i < firstDay; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const handleDayClick = (day) => {
    const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
    onSelectDate(selectedDate === key ? null : key);
  };

  // Format selected date for display
  const formatSelectedDate = (dateKey) => {
    if (!dateKey) return '';
    const d = new Date(dateKey + 'T12:00:00');
    return d.toLocaleDateString('en-US', {
      weekday: 'long',
      month: 'long',
      day: 'numeric',
      year: 'numeric'
    });
  };

  return (
    <div className="calendar card">
      <div className="calendar-header">
        <button className="cal-nav-btn" onClick={onPrevMonth} aria-label="Previous month">‹</button>
        <span className="cal-title">{MONTHS[month]} {year}</span>
        <button className="cal-nav-btn" onClick={onNextMonth} aria-label="Next month">›</button>
      </div>

      <div className="calendar-grid">
        {DAYS_OF_WEEK.map((d) => (
          <div key={d} className="cal-day-label">{d}</div>
        ))}

        {cells.map((day, i) => {
          if (day === null) {
            return <div key={`empty-${i}`} className="cal-cell cal-empty" />;
          }

          const key = `${year}-${String(month + 1).padStart(2, "0")}-${String(day).padStart(2, "0")}`;
          const hasEntry = entryDays.has(key);
          const isSelected = selectedDate === key;
          const isToday = todayKey === key;

          let cls = "cal-cell";
          if (isSelected) cls += " cal-selected";
          else if (isToday) cls += " cal-today";

          return (
            <div
              key={key}
              className={cls}
              onClick={() => handleDayClick(day)}
              role="button"
              aria-label={`${MONTHS[month]} ${day}${hasEntry ? ", has entries" : ""}`}
              aria-pressed={isSelected}
            >
              <span className="cal-day-num">{day}</span>
              {hasEntry && <span className="cal-dot" />}
            </div>
          );
        })}
      </div>

      {selectedDate && (
        <div className="cal-filter-bar">
          <span>📅 {formatSelectedDate(selectedDate)}</span>
          <button className="cal-clear-btn" onClick={() => onSelectDate(null)}>
            ✕ Clear
          </button>
        </div>
      )}
    </div>
  );
}
