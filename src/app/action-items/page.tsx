"use client";

import { Caveat, Patrick_Hand } from "next/font/google";
import { useState, useEffect, useRef } from "react";
import type { ActionItem, ActionStatus, HighlightColor } from "@/types/action-item";
import styles from "./action-items.module.css";

const caveat = Caveat({
  subsets: ["latin"],
  weight: ["700"],
  variable: "--font-caveat",
});

const patrickHand = Patrick_Hand({
  subsets: ["latin"],
  weight: ["400"],
  variable: "--font-patrick",
});

// ── Constants ──────────────────────────────────────────────────────────────

const STATUS_CYCLE: ActionStatus[] = ["Todo", "Doing", "Blocked", "Done"];

const HIGHLIGHT_CYCLE: (HighlightColor | null)[] = [
  null, "#7CF3A0", "#FF6BD6", "#FFE600", "#5BD7FF",
];

const STATUS_COLOR: Record<ActionStatus, string> = {
  Todo:    "#5BD7FF",
  Doing:   "#7CF3A0",
  Blocked: "#FF6BD6",
  Done:    "#FFE600",
};

const EDITABLE_COLS = ["meeting", "owner", "action", "due"] as const;
type EditableCol = (typeof EDITABLE_COLS)[number];

const THIS_WEEK_TERMS = ["today", "mon", "tue", "wed", "thu", "fri"];

// ── Seed data (Option B — client-only prototype) ───────────────────────────

const SEED: ActionItem[] = [
  { id: "1", meeting: "Q3 Planning",     owner: "Maya · Devs",    action: "Spin up roadmap doc",        due: "Fri",     status: "Doing",   highlight: "#7CF3A0" },
  { id: "2", meeting: "Onboarding sync", owner: "Priya",          action: "Rewrite welcome email",      due: "Mon",     status: "Done",    highlight: null },
  { id: "3", meeting: "Bug triage",      owner: "Ben",            action: "File P1 for checkout 500s",  due: "Today",   status: "Blocked", highlight: "#FF6BD6" },
  { id: "4", meeting: "Pricing review",  owner: "Lena · Finance", action: "Model EU tier change",       due: "Wed",     status: "Doing",   highlight: null },
  { id: "5", meeting: "1:1 w/ CEO",      owner: "Sam",            action: "Share team OKR draft",       due: "Thu",     status: "Todo",    highlight: null },
  { id: "6", meeting: "Design crit",     owner: "Jules + crew",   action: "Iterate dashboard v3",       due: "Next wk", status: "Todo",    highlight: null },
  { id: "7", meeting: "Vendor call",     owner: "Ops",            action: "Renegotiate SLA",            due: "Aug 30",  status: "Doing",   highlight: null },
];

// ── Component ──────────────────────────────────────────────────────────────

export default function ActionItemsPage() {
  const [items, setItems] = useState<ActionItem[]>(SEED);

  // Filter state
  const [showFilter, setShowFilter] = useState(false);
  const [filterStatuses, setFilterStatuses] = useState<Set<ActionStatus>>(new Set());
  const [filterOwner, setFilterOwner] = useState("");
  const [filterDueThisWeek, setFilterDueThisWeek] = useState(false);

  // Sync state
  const [syncing, setSyncing] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  // Cell edit state
  const [editingCell, setEditingCell] = useState<{ id: string; col: EditableCol } | null>(null);
  const [editValue, setEditValue] = useState("");

  // Tracks when Tab caused a blur, so onBlur doesn't double-commit
  const tabPressedRef = useRef(false);
  const filterRef = useRef<HTMLDivElement>(null);

  // ── Derived ───────────────────────────────────────────────────────────────

  const doneCount = items.filter(i => i.status === "Done").length;
  const openCount = items.length - doneCount;
  const uniqueMeetingCount = new Set(items.map(i => i.meeting).filter(Boolean)).size;

  const filteredItems = items.filter(item => {
    if (filterStatuses.size > 0 && !filterStatuses.has(item.status)) return false;
    if (filterOwner && !item.owner.toLowerCase().includes(filterOwner.toLowerCase())) return false;
    if (filterDueThisWeek) {
      const d = item.due.toLowerCase();
      if (!THIS_WEEK_TERMS.some(t => d.includes(t))) return false;
    }
    return true;
  });

  const hasActiveFilter =
    filterStatuses.size > 0 || filterOwner.trim() !== "" || filterDueThisWeek;

  // ── Effects ───────────────────────────────────────────────────────────────

  // Close filter popover on outside click
  useEffect(() => {
    if (!showFilter) return;
    function onDown(e: MouseEvent) {
      if (filterRef.current && !filterRef.current.contains(e.target as Node)) {
        setShowFilter(false);
      }
    }
    document.addEventListener("mousedown", onDown);
    return () => document.removeEventListener("mousedown", onDown);
  }, [showFilter]);

  // Auto-dismiss toast after 3 s
  useEffect(() => {
    if (!toast) return;
    const t = setTimeout(() => setToast(null), 3000);
    return () => clearTimeout(t);
  }, [toast]);

  // ── Helpers ───────────────────────────────────────────────────────────────

  function updateItem(id: string, patch: Partial<ActionItem>) {
    setItems(prev => prev.map(item => item.id === id ? { ...item, ...patch } : item));
  }

  function cycleStatus(id: string) {
    setItems(prev =>
      prev.map(item => {
        if (item.id !== id) return item;
        const next = (STATUS_CYCLE.indexOf(item.status) + 1) % STATUS_CYCLE.length;
        return { ...item, status: STATUS_CYCLE[next] };
      })
    );
  }

  function cycleHighlight(id: string) {
    setItems(prev =>
      prev.map(item => {
        if (item.id !== id) return item;
        const cur = item.highlight ?? null;
        const idx = HIGHLIGHT_CYCLE.indexOf(cur);
        return { ...item, highlight: HIGHLIGHT_CYCLE[(idx + 1) % HIGHLIGHT_CYCLE.length] };
      })
    );
  }

  function addRow() {
    const id = crypto.randomUUID();
    const blank: ActionItem = {
      id, meeting: "", owner: "", action: "", due: "", status: "Todo", highlight: null,
    };
    setItems(prev => [blank, ...prev]);
    setEditingCell({ id, col: "action" });
    setEditValue("");
  }

  async function handleSync() {
    setSyncing(true);
    await new Promise(r => setTimeout(r, 1500));
    setSyncing(false);
    setToast(`Synced — ${items.length} items up to date`);
  }

  function startEdit(id: string, col: EditableCol, value: string) {
    setEditingCell({ id, col });
    setEditValue(value);
  }

  function toggleStatusFilter(s: ActionStatus) {
    setFilterStatuses(prev => {
      const next = new Set(prev);
      next.has(s) ? next.delete(s) : next.add(s);
      return next;
    });
  }

  // ── Cell keyboard navigation ──────────────────────────────────────────────

  function handleCellKeyDown(
    e: React.KeyboardEvent<HTMLInputElement>,
    item: ActionItem,
    col: EditableCol
  ) {
    if (e.key === "Escape") {
      setEditingCell(null);
      return;
    }

    if (e.key === "Enter") {
      e.preventDefault();
      updateItem(item.id, { [col]: editValue });
      setEditingCell(null);
      return;
    }

    if (e.key === "Tab") {
      e.preventDefault();
      tabPressedRef.current = true;
      updateItem(item.id, { [col]: editValue });

      const colIdx = EDITABLE_COLS.indexOf(col);
      const rowIdx = filteredItems.findIndex(i => i.id === item.id);

      if (!e.shiftKey) {
        if (colIdx < EDITABLE_COLS.length - 1) {
          const nextCol = EDITABLE_COLS[colIdx + 1];
          setEditingCell({ id: item.id, col: nextCol });
          setEditValue(item[nextCol]);
        } else if (rowIdx < filteredItems.length - 1) {
          const next = filteredItems[rowIdx + 1];
          setEditingCell({ id: next.id, col: EDITABLE_COLS[0] });
          setEditValue(next[EDITABLE_COLS[0]]);
        } else {
          setEditingCell(null);
        }
      } else {
        if (colIdx > 0) {
          const prevCol = EDITABLE_COLS[colIdx - 1];
          setEditingCell({ id: item.id, col: prevCol });
          setEditValue(item[prevCol]);
        } else if (rowIdx > 0) {
          const prev = filteredItems[rowIdx - 1];
          const lastCol = EDITABLE_COLS[EDITABLE_COLS.length - 1];
          setEditingCell({ id: prev.id, col: lastCol });
          setEditValue(prev[lastCol]);
        } else {
          setEditingCell(null);
        }
      }
    }
  }

  function handleCellBlur(item: ActionItem, col: EditableCol) {
    // Tab navigation already committed and moved the active cell; skip.
    if (tabPressedRef.current) {
      tabPressedRef.current = false;
      return;
    }
    if (editingCell?.id === item.id && editingCell?.col === col) {
      updateItem(item.id, { [col]: editValue });
      setEditingCell(null);
    }
  }

  // ── Render helpers ────────────────────────────────────────────────────────

  function renderCell(
    item: ActionItem,
    col: EditableCol,
    display: React.ReactNode
  ) {
    const isEditing =
      editingCell?.id === item.id && editingCell?.col === col;

    return (
      <div
        className={styles.cell}
        onClick={() => { if (!isEditing) startEdit(item.id, col, item[col]); }}
      >
        {isEditing ? (
          <input
            className={styles.cellInput}
            autoFocus
            value={editValue}
            onChange={e => setEditValue(e.target.value)}
            onKeyDown={e => handleCellKeyDown(e, item, col)}
            onBlur={() => handleCellBlur(item, col)}
          />
        ) : display}
      </div>
    );
  }

  // ── JSX ───────────────────────────────────────────────────────────────────

  return (
    <div className={`${caveat.variable} ${patrickHand.variable} ${styles.wrapper}`}>
      <div className={styles.inner}>

        {/* ── Header ──────────────────────────────────────────────────── */}
        <div className={styles.header}>
          <div>
            <div className={styles.title}>
              <span className={styles.titleHighlight}>Action items</span>
            </div>
            <div className={styles.subtitle}>
              this week — {openCount} open, {doneCount} shipped ✱
            </div>
          </div>

          <div className={styles.buttons}>
            <button className={styles.sketchBtn} onClick={addRow}>
              + new row
            </button>

            <div className={styles.filterWrap} ref={filterRef}>
              <button
                className={styles.sketchBtn}
                onClick={() => setShowFilter(f => !f)}
              >
                filter{hasActiveFilter ? " ●" : ""}
              </button>

              {showFilter && (
                <div className={styles.filterPopover}>
                  <div className={styles.filterSection}>
                    <div className={styles.filterSectionLabel}>Status</div>
                    <div className={styles.filterPills}>
                      {STATUS_CYCLE.map(s => (
                        <button
                          key={s}
                          className={`${styles.filterPillBtn} ${filterStatuses.has(s) ? styles.filterPillBtnActive : ""}`}
                          style={{ background: filterStatuses.has(s) ? STATUS_COLOR[s] : "transparent" }}
                          onClick={() => toggleStatusFilter(s)}
                        >
                          {s}
                        </button>
                      ))}
                    </div>
                  </div>

                  <hr className={styles.filterDivider} />

                  <div className={styles.filterSection}>
                    <div className={styles.filterSectionLabel}>Owner</div>
                    <input
                      className={styles.filterInput}
                      placeholder="filter by owner…"
                      value={filterOwner}
                      onChange={e => setFilterOwner(e.target.value)}
                    />
                  </div>

                  <hr className={styles.filterDivider} />

                  <label className={styles.filterCheckRow}>
                    <input
                      type="checkbox"
                      checked={filterDueThisWeek}
                      onChange={e => setFilterDueThisWeek(e.target.checked)}
                    />
                    due this week
                  </label>
                </div>
              )}
            </div>

            <button
              className={`${styles.sketchBtn} ${styles.sketchBtnPrimary}`}
              onClick={handleSync}
              disabled={syncing}
            >
              {syncing
                ? <><span className={styles.spinGlyph}>↻</span> syncing…</>
                : "sync ↻"
              }
            </button>
          </div>
        </div>

        {/* ── Grid ────────────────────────────────────────────────────── */}
        <div className={styles.grid}>

          {/* Header row */}
          <div className={styles.gridHeader}>
            {["Meeting", "Owner", "Action item", "Due", "Status"].map(h => (
              <div key={h} className={styles.gridHeaderCell}>{h}</div>
            ))}
          </div>

          {/* Body rows */}
          {filteredItems.length === 0 ? (
            <div className={styles.emptyRow}>
              No items match the current filter.
            </div>
          ) : (
            filteredItems.map((item, i) => (
              <div
                key={item.id}
                className={`${styles.gridRow} ${i % 2 === 0 ? styles.gridRowEven : styles.gridRowOdd}`}
              >
                {/* Meeting */}
                {renderCell(
                  item, "meeting",
                  item.meeting
                    ? item.meeting
                    : <span style={{ opacity: 0.3 }}>—</span>
                )}

                {/* Owner */}
                {renderCell(
                  item, "owner",
                  item.owner
                    ? item.owner
                    : <span style={{ opacity: 0.3 }}>—</span>
                )}

                {/* Action item — with marker highlight + toggle */}
                <div
                  className={styles.cell}
                  onClick={() => {
                    if (!(editingCell?.id === item.id && editingCell?.col === "action")) {
                      startEdit(item.id, "action", item.action);
                    }
                  }}
                >
                  {editingCell?.id === item.id && editingCell?.col === "action" ? (
                    <input
                      className={styles.cellInput}
                      autoFocus
                      value={editValue}
                      onChange={e => setEditValue(e.target.value)}
                      onKeyDown={e => handleCellKeyDown(e, item, "action")}
                      onBlur={() => handleCellBlur(item, "action")}
                    />
                  ) : (
                    <>
                      <span
                        style={item.highlight ? {
                          background: `linear-gradient(transparent 50%, ${item.highlight} 50% 90%, transparent 90%)`,
                          padding: "0 4px",
                        } : undefined}
                      >
                        {item.action || <span style={{ opacity: 0.3 }}>—</span>}
                      </span>
                      <button
                        className={styles.highlightToggle}
                        title="Cycle highlight colour"
                        onClick={e => { e.stopPropagation(); cycleHighlight(item.id); }}
                      >
                        ✎
                      </button>
                    </>
                  )}
                </div>

                {/* Due */}
                {renderCell(
                  item, "due",
                  item.due
                    ? <span className={styles.dueText}>{item.due}</span>
                    : <span style={{ opacity: 0.3 }}>—</span>
                )}

                {/* Status pill — click cycles, no text edit */}
                <div className={styles.cell} style={{ cursor: "default" }}>
                  <span
                    className={styles.statusPill}
                    style={{ background: STATUS_COLOR[item.status] }}
                    onClick={() => cycleStatus(item.id)}
                    title="Click to cycle status"
                  >
                    {item.status}
                  </span>
                </div>
              </div>
            ))
          )}
        </div>

        {/* ── Footer tag ───────────────────────────────────────────────── */}
        <div className={styles.footer}>
          ↑ pulled from {uniqueMeetingCount} meeting{uniqueMeetingCount !== 1 ? "s" : ""} today
        </div>

      </div>

      {/* ── Toast ─────────────────────────────────────────────────────── */}
      {toast && <div className={styles.toast}>{toast}</div>}
    </div>
  );
}
