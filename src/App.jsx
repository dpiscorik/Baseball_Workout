import React, { useEffect, useMemo, useState } from "react";

/* ---------- Utilities ---------- */
function startOfWeek(date = new Date(), weekStartsOn = 1) {
  const d = new Date(date);
  const day = (d.getDay() + 7 - weekStartsOn) % 7; // Monday = 1
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() - day);
  return d;
}
function weekKey(date = new Date()) {
  const s = startOfWeek(date);
  return `${s.getFullYear()}-${String(s.getMonth() + 1).padStart(2, "0")}-${String(
    s.getDate()
  ).padStart(2, "0")}`;
}
function loadLS(key, fallback) {
  try {
    const raw = localStorage.getItem(key);
    return raw ? JSON.parse(raw) : fallback;
  } catch {
    return fallback;
  }
}
function saveLS(key, value) {
  try {
    localStorage.setItem(key, JSON.stringify(value));
  } catch {}
}
function uid() {
  return Math.random().toString(36).slice(2, 10);
}

/* ---------- Links & notes by category ---------- */
const exerciseLinks = {
  "Lift X": [],
  "Tee Work": [],
  "Blaze Pod": [],
  "Yoga": [],
  "Speed": [
    "https://www.instagram.com/p/C3m87txIIWY/?igsh=MTgzcGE5Z3c0NWNrOQ==",
    "https://www.instagram.com/reel/C2NYYrhufBU/?igsh=eDNwcmlqcGRhNGtt",
    "https://www.instagram.com/reel/C2yTD--u9Vu/?igsh=c2N4cXh0cnVzZjh2",
    "https://www.instagram.com/reel/CyquhcZLsy-/?igsh=MWQ1aGYzbmxvaGJ6ag==",
  ],
  "Core": [
    "https://www.instagram.com/p/CIqSVPnlGux/?igsh=cTdiOTkyNGtnMTdp",
    "https://www.instagram.com/p/CY9Ex05IKip/?igsh=MTNhZTVzZ2VmYmFmYQ==",
  ],
  "Hips": [
    "https://www.instagram.com/reel/CkjaaHGv7V7/?igsh=MXYwcXJ4ZWtsZ25uYQ==",
    "https://www.instagram.com/p/C1G5esbLTWX/?igsh=MTExZThkYTlhaWk2eA==",
  ],
  "Glutes": [
    "https://www.instagram.com/p/CTQNj_RjYuh/?igsh=a3h1M3Y2MjN1cnhm",
  ],
  "Jbands": [
    "https://www.instagram.com/p/C4LP5WGNSSz/?igsh=MXN4ejEwaWdra2R1ag%3D%3D&img_index=3",
    "https://jaegersports.com/download/283/",
  ],
  "Box Jumps": [
    "https://youtu.be/BeqK8ksNC-E?si=W3ZHgrNGimwSkbAH",
    "https://www.instagram.com/reel/C2SKCPnLZxl/?igsh=YndsaWY0YjhkaHB4",
  ],
  "Infield": [],
  "Other": [], // special: excluded from progress, only 1 per week
};

const exerciseNotes = {
  "Other": "juggling, grip, tyson pushups",
};

export default function App() {
  // 2 per week for all except "Other" (1 per week)
  const defaultExercises = Object.keys(exerciseLinks).map((name) => ({
    id: uid(),
    name,
    targetPerWeek: name === "Other" ? 1 : 2,
  }));

  const [exercises, setExercises] = useState(() =>
    loadLS("wt_exercises", defaultExercises)
  );
  const [logs, setLogs] = useState(() => loadLS("wt_logs", [])); // {id, date, exerciseId}
  const [anchor, setAnchor] = useState(new Date()); // which week we're viewing

  // Week window
  const wkKeyVal = weekKey(anchor);
  const weekStart = startOfWeek(anchor);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekEnd.getDate() + 6);
  weekEnd.setHours(23, 59, 59, 999);

  useEffect(() => saveLS("wt_exercises", exercises), [exercises]);
  useEffect(() => saveLS("wt_logs", logs), [logs]);

  // Logs in the visible week
  const weekLogs = useMemo(
    () =>
      logs.filter((l) => {
        const d = new Date(l.date);
        return d >= weekStart && d <= weekEnd;
      }),
    [logs, wkKeyVal]
  );

  // Precompute counts per exercise for fast sorting/progress
  const countsById = useMemo(() => {
    const m = Object.fromEntries(exercises.map((e) => [e.id, 0]));
    for (const l of weekLogs) m[l.exerciseId] = (m[l.exerciseId] || 0) + 1;
    return m;
  }, [weekLogs, exercises]);

  // Helpers
  function logsFor(exId) {
    return weekLogs
      .filter((l) => l.exerciseId === exId)
      .sort((a, b) => new Date(a.date) - new Date(b.date))
      .slice(0, exercises.find(e => e.id === exId)?.targetPerWeek || 2);
  }

  function markDone(exId) {
    const e = exercises.find((x) => x.id === exId);
    if (!e) return;
    const current = countsById[exId] || 0;
    if (current >= e.targetPerWeek) return; // already at cap
    setLogs((prev) => [
      ...prev,
      { id: uid(), date: new Date().toISOString(), exerciseId: exId },
    ]);
  }

  function undoLast(exId) {
    const latest = [...weekLogs]
      .filter((l) => l.exerciseId === exId)
      .sort((a, b) => new Date(b.date) - new Date(a.date))[0];
    if (!latest) return;
    setLogs((prev) => prev.filter((l) => l.id !== latest.id));
  }

  function resetWeek() {
    setLogs((prev) =>
      prev.filter((l) => {
        const d = new Date(l.date);
        return d < weekStart || d > weekEnd;
      })
    );
  }
  function resetAll() {
    localStorage.removeItem("wt_exercises");
    localStorage.removeItem("wt_logs");
    location.reload();
  }

  // Weekly progress (exclude "Other")
  const totalNeeded = useMemo(
    () =>
      exercises.reduce((sum, e) => {
        if (e.name === "Other") return sum; // exclude
        return sum + (e.targetPerWeek || 0);
      }, 0),
    [exercises]
  );
  const completedCount = useMemo(() => {
    return exercises.reduce((sum, e) => {
      const c = countsById[e.id] || 0;
      const capped = Math.min(c, e.targetPerWeek || 0);
      if (e.name === "Other") return sum; // exclude
      return sum + capped;
    }, 0);
  }, [exercises, countsById]);
  const pct = totalNeeded ? Math.round((completedCount / totalNeeded) * 100) : 0;

  // Sort: uncompleted first, completed last (includes "Other")
  const sortedExercises = useMemo(() => {
    return exercises
      .slice()
      .sort((a, b) => {
        const aDone = (countsById[a.id] || 0) >= a.targetPerWeek;
        const bDone = (countsById[b.id] || 0) >= b.targetPerWeek;
        return aDone === bDone ? 0 : aDone ? 1 : -1;
      });
  }, [exercises, countsById]);

  return (
    <div className="app-wrap">
      <h1 className="title">Baseball Workout Tracker</h1>
      <h2 className="week">
        Week of {weekStart.toLocaleDateString()} – {weekEnd.toLocaleDateString()}
      </h2>

      {/* Thin weekly progress with numbers (excludes "Other") */}
      <div className="progress-wrap" aria-label={`Week progress ${pct}%`}>
        <div className="progress">
          <div className="progress-bar" style={{ width: `${pct}%` }} />
        </div>
        <div className="progress-number">
          {completedCount}/{totalNeeded} • {pct}%
        </div>
      </div>

      {/* Workouts grid (sorted) */}
      <ul className="workout-grid">
        {sortedExercises.map((e) => {
          const exLogs = logsFor(e.id);
          const done = (countsById[e.id] || 0) >= e.targetPerWeek;
          const first = exLogs[0]?.date
            ? new Date(exLogs[0].date).toLocaleString()
            : "—";
          const second =
            e.targetPerWeek > 1 && exLogs[1]?.date
              ? new Date(exLogs[1].date).toLocaleString()
              : e.targetPerWeek > 1
              ? "—"
              : undefined;

          return (
            <li key={e.id} className="workout-card">
              <div className="workout-name">
                <span className="name-red">{e.name}</span>
                <span role="img" aria-label={done ? "completed" : "not completed"}>
                  {done ? "✅" : "❌"}
                </span>
              </div>

              {/* Optional notes (for "Other") */}
              {exerciseNotes[e.name] && (
                <div className="note-line">{exerciseNotes[e.name]}</div>
              )}

              <div className="timestamps">
                <div>
                  First: <span className="date-brown">{first}</span>
                </div>
                {e.targetPerWeek > 1 && (
                  <div>
                    Second: <span className="date-brown">{second}</span>
                  </div>
                )}
              </div>

              <div className="controls">
                {exerciseLinks[e.name]?.length > 0 && (
                  <a
                    href={exerciseLinks[e.name][0]}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn small"
                  >
                    Example
                  </a>
                )}
                {(countsById[e.id] || 0) < e.targetPerWeek && (
                  <button className="btn small" onClick={() => markDone(e.id)}>
                    Mark done
                  </button>
                )}
                {(countsById[e.id] || 0) > 0 && (
                  <button className="btn small" onClick={() => undoLast(e.id)}>
                    Undo
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>

      {/* Week navigation above the log */}
      <div className="navrow" style={{ justifyContent: "center" }}>
        <button
          className="btn"
          onClick={() =>
            setAnchor((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7))
          }
        >
          ◀ Prev week
        </button>
        <button className="btn" onClick={() => setAnchor(new Date())}>
          This week
        </button>
        <button
          className="btn"
          onClick={() =>
            setAnchor((d) => new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7))
          }
        >
          Next week ▶
        </button>
        <span className="spacer" />
        <button className="btn" onClick={resetWeek}>
          Reset this week
        </button>
        <button className="btn" onClick={resetAll}>
          Reset all
        </button>
      </div>

      {/* Log panel (collapsible) */}
      <section className="log-panel">
        <details open={false}>
          <summary>This Week’s Log</summary>
          <ul>
            {weekLogs.map((l) => {
              const ex = exercises.find((e) => e.id === l.exerciseId);
              return (
                <li key={l.id} className="log-row">
                  <span>
                    {ex ? ex.name : "(deleted)"} —{" "}
                    <span className="log-date">{new Date(l.date).toLocaleString()}</span>
                  </span>
                  <button
                    className="btn small"
                    onClick={() => setLogs((prev) => prev.filter((x) => x.id !== l.id))}
                  >
                    Delete
                  </button>
                </li>
              );
            })}
            {weekLogs.length === 0 && <li className="log-row">No entries yet.</li>}
          </ul>
        </details>
      </section>
    </div>
  );
}