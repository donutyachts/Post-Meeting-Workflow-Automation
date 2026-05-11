// Five wireframe takes on "gaudy + brightly coloured spreadsheet UI"
// for a post-meeting automation workflow.

const ROWS = [
  { meet: "Q3 Planning",     who: "Maya · Devs",     action: "Spin up roadmap doc",        due: "Fri",     status: "Doing"   },
  { meet: "Onboarding sync", who: "Priya",           action: "Rewrite welcome email",      due: "Mon",     status: "Done"    },
  { meet: "Bug triage",      who: "Ben",             action: "File P1 for checkout 500s",  due: "Today",   status: "Blocked" },
  { meet: "Pricing review",  who: "Lena · Finance",  action: "Model EU tier change",       due: "Wed",     status: "Doing"   },
  { meet: "1:1 w/ CEO",      who: "Sam",             action: "Share team OKR draft",       due: "Thu",     status: "Todo"    },
  { meet: "Design crit",     who: "Jules + crew",    action: "Iterate dashboard v3",       due: "Next wk", status: "Todo"    },
  { meet: "Vendor call",     who: "Ops",             action: "Renegotiate SLA",            due: "Aug 30",  status: "Doing"   },
];

const HEADS = ["Meeting", "Owner", "Action item", "Due", "Status"];

// ─────────────────────────────────────────────────────────────
// 1. HIGHLIGHTER MARKER
// White grid, sketchy borders, marker-highlight strokes over text.
// ─────────────────────────────────────────────────────────────
function HighlighterGrid() {
  const colors = {
    Done:    "#FFE600",
    Doing:   "#7CF3A0",
    Blocked: "#FF6BD6",
    Todo:    "#5BD7FF",
  };
  return (
    <div style={{ fontFamily: "'Patrick Hand', cursive", background: "#FFFDF4", height: "100%", padding: "28px 32px", boxSizing: "border-box", color: "#1a1a1a" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 18 }}>
        <div>
          <div style={{ fontFamily: "'Caveat', cursive", fontSize: 42, lineHeight: 1, fontWeight: 700 }}>
            <span style={{ background: "linear-gradient(transparent 55%, #FFE600 55% 90%, transparent 90%)", padding: "0 6px" }}>Action items</span>
          </div>
          <div style={{ fontSize: 20, opacity: 0.7, marginTop: 4 }}>this week — 7 open, 1 shipped ✱</div>
        </div>
        <div style={{ display: "flex", gap: 10, fontSize: 18 }}>
          <SketchBtn>+ new row</SketchBtn>
          <SketchBtn>filter</SketchBtn>
          <SketchBtn fill="#FFE600">sync ↻</SketchBtn>
        </div>
      </div>

      <div style={{ border: "2.5px solid #1a1a1a", borderRadius: 6, overflow: "hidden", boxShadow: "6px 6px 0 #1a1a1a" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.1fr 2fr 0.7fr 0.9fr", background: "#1a1a1a", color: "#FFFDF4", fontSize: 22 }}>
          {HEADS.map(h => <div key={h} style={{ padding: "10px 14px", borderRight: "1.5px dashed #FFFDF455" }}>{h}</div>)}
        </div>
        {ROWS.map((r, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1.2fr 1.1fr 2fr 0.7fr 0.9fr", borderTop: "1.5px dashed #1a1a1a55", fontSize: 22, background: i % 2 ? "#FFFDF4" : "#FFF8E1" }}>
            <Cell>{r.meet}</Cell>
            <Cell>{r.who}</Cell>
            <Cell><Marker color={i === 2 ? "#FF6BD6" : i === 0 ? "#7CF3A0" : "transparent"}>{r.action}</Marker></Cell>
            <Cell><span style={{ borderBottom: "3px solid #FF6BD6" }}>{r.due}</span></Cell>
            <Cell>
              <span style={{ background: colors[r.status], padding: "2px 10px", borderRadius: 999, border: "2px solid #1a1a1a", fontSize: 18 }}>
                {r.status}
              </span>
            </Cell>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 18, fontFamily: "'Caveat', cursive", fontSize: 26, transform: "rotate(-1.5deg)", display: "inline-block", background: "#7CF3A0", padding: "4px 12px", border: "2px solid #1a1a1a" }}>
        ↑ pulled from 4 meetings today
      </div>
    </div>
  );
}

function Cell({ children }) {
  return <div style={{ padding: "10px 14px", borderRight: "1.5px dashed #1a1a1a55" }}>{children}</div>;
}
function Marker({ children, color }) {
  return <span style={{ background: `linear-gradient(transparent 50%, ${color} 50% 90%, transparent 90%)`, padding: "0 4px" }}>{children}</span>;
}
function SketchBtn({ children, fill = "#FFFDF4" }) {
  return (
    <button style={{ fontFamily: "'Patrick Hand', cursive", fontSize: 18, background: fill, border: "2px solid #1a1a1a", padding: "6px 14px", borderRadius: 4, boxShadow: "3px 3px 0 #1a1a1a", cursor: "pointer" }}>
      {children}
    </button>
  );
}

// ─────────────────────────────────────────────────────────────
// 2. COLOR-BLOCK ROWS (Memphis / 90s)
// Each row painted a full bold color. Big sketchy headings.
// ─────────────────────────────────────────────────────────────
function ColorBlockRows() {
  const rowColors = ["#FF3D7F", "#FFD93D", "#3DDC97", "#3D9DFF", "#FF8C42", "#C77DFF", "#39E0E0"];
  return (
    <div style={{ fontFamily: "'Architects Daughter', cursive", background: "#0E0E0E", height: "100%", padding: 28, boxSizing: "border-box", color: "#FFF" }}>
      <div style={{ display: "flex", alignItems: "baseline", gap: 14, marginBottom: 20 }}>
        <div style={{ fontFamily: "'Caveat', cursive", fontSize: 56, fontWeight: 700, color: "#FFD93D", lineHeight: 1 }}>MEETINGS!!</div>
        <div style={{ fontSize: 18, opacity: 0.8 }}>auto-extracted action items / wk of may 11</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8 }}>
          <BlockBtn bg="#FF3D7F">+ row</BlockBtn>
          <BlockBtn bg="#3DDC97">export</BlockBtn>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 2fr 0.7fr 0.9fr", fontSize: 20, gap: 6 }}>
        {HEADS.map(h => (
          <div key={h} style={{ background: "#FFF", color: "#0E0E0E", padding: "8px 12px", border: "3px solid #FFF", fontWeight: 700, textTransform: "uppercase", letterSpacing: 1 }}>{h}</div>
        ))}
      </div>

      <div style={{ display: "grid", gap: 6, marginTop: 6 }}>
        {ROWS.map((r, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 2fr 0.7fr 0.9fr", gap: 6 }}>
            <BCell bg={rowColors[i]}>{r.meet}</BCell>
            <BCell bg={rowColors[i]}>{r.who}</BCell>
            <BCell bg={rowColors[i]}>{r.action}</BCell>
            <BCell bg={rowColors[i]}>{r.due}</BCell>
            <BCell bg={rowColors[i]}>
              <span style={{ background: "#0E0E0E", color: rowColors[i], padding: "2px 8px", borderRadius: 4, fontWeight: 700, fontSize: 16 }}>{r.status}</span>
            </BCell>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 20, display: "flex", gap: 18, fontSize: 18 }}>
        <Counter color="#FFD93D" n={7} label="open" />
        <Counter color="#3DDC97" n={1} label="shipped" />
        <Counter color="#FF3D7F" n={1} label="blocked" />
      </div>
    </div>
  );
}
function BCell({ bg, children }) {
  return <div style={{ background: bg, color: "#0E0E0E", padding: "10px 14px", fontWeight: 600 }}>{children}</div>;
}
function BlockBtn({ bg, children }) {
  return <button style={{ fontFamily: "'Architects Daughter', cursive", background: bg, color: "#0E0E0E", border: "3px solid #FFF", padding: "6px 14px", fontSize: 18, fontWeight: 700, cursor: "pointer" }}>{children}</button>;
}
function Counter({ color, n, label }) {
  return (
    <div style={{ display: "flex", alignItems: "baseline", gap: 6 }}>
      <span style={{ color, fontSize: 38, fontWeight: 700, fontFamily: "'Caveat', cursive" }}>{n}</span>
      <span style={{ opacity: 0.8 }}>{label}</span>
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 3. STICKY-NOTE GRID
// Post-its as cells, tilted, snapped to a grid.
// ─────────────────────────────────────────────────────────────
function StickyNoteGrid() {
  const tints = ["#FFEC5C", "#FF9EC4", "#9EE6FF", "#B8FF9E", "#FFB85C"];
  return (
    <div style={{ fontFamily: "'Patrick Hand', cursive", background: "#F1ECDD", height: "100%", padding: 28, boxSizing: "border-box", color: "#1a1a1a", position: "relative" }}>
      {/* corkboard texture */}
      <div style={{ position: "absolute", inset: 0, background: "radial-gradient(#c9a979 1px, transparent 1px) 0 0 / 8px 8px", opacity: 0.18, pointerEvents: "none" }}></div>

      <div style={{ position: "relative", display: "flex", alignItems: "center", gap: 12, marginBottom: 22 }}>
        <div style={{ fontFamily: "'Caveat', cursive", fontSize: 48, fontWeight: 700, transform: "rotate(-2deg)" }}>📌 after the meeting</div>
        <div style={{ marginLeft: "auto", fontSize: 20, background: "#FFEC5C", padding: "6px 14px", border: "2px dashed #1a1a1a", transform: "rotate(1.5deg)" }}>auto-pinned from Zoom recap</div>
      </div>

      {/* column labels */}
      <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16, fontSize: 22, marginBottom: 10, paddingLeft: 6 }}>
        {["TODO", "DOING", "BLOCKED", "DONE"].map((h, i) => (
          <div key={h} style={{ fontFamily: "'Caveat', cursive", fontSize: 30, fontWeight: 700, transform: `rotate(${[-1,1,-1.5,2][i]}deg)`, borderBottom: `3px solid ${["#FF3D7F","#FFEC5C","#FF6B6B","#3DDC97"][i]}` }}>{h}</div>
        ))}
      </div>

      <div style={{ position: "relative", display: "grid", gridTemplateColumns: "1fr 1fr 1fr 1fr", gap: 16 }}>
        {[
          { col: 0, body: ROWS[4], tint: 0 },
          { col: 0, body: ROWS[5], tint: 4 },
          { col: 1, body: ROWS[0], tint: 1 },
          { col: 1, body: ROWS[3], tint: 0 },
          { col: 1, body: ROWS[6], tint: 2 },
          { col: 2, body: ROWS[2], tint: 1 },
          { col: 3, body: ROWS[1], tint: 3 },
        ].map((s, i) => (
          <Sticky key={i} col={s.col} tint={tints[s.tint]} rot={[-2,1.5,-1,2,-1.5,1][i % 6]}>
            <div style={{ fontSize: 18, opacity: 0.7 }}>from: {s.body.meet}</div>
            <div style={{ fontSize: 24, marginTop: 6, lineHeight: 1.2 }}>{s.body.action}</div>
            <div style={{ marginTop: "auto", display: "flex", justifyContent: "space-between", fontSize: 18 }}>
              <span>@{s.body.who.split(" ")[0]}</span>
              <span style={{ borderTop: "2px solid #1a1a1a", paddingTop: 2 }}>due {s.body.due}</span>
            </div>
          </Sticky>
        ))}
      </div>
    </div>
  );
}
function Sticky({ col, tint, rot, children }) {
  return (
    <div style={{ gridColumn: col + 1, background: tint, padding: "14px 16px 12px", minHeight: 130, transform: `rotate(${rot}deg)`, boxShadow: "4px 6px 12px rgba(0,0,0,0.18)", display: "flex", flexDirection: "column", position: "relative" }}>
      <div style={{ position: "absolute", top: -8, left: "50%", width: 22, height: 22, background: "#E94B4B", borderRadius: "50%", border: "2px solid #a02020", transform: "translateX(-50%)" }}></div>
      {children}
    </div>
  );
}

// ─────────────────────────────────────────────────────────────
// 4. MAXIMALIST NEON TERMINAL
// Black grid, neon cells, monospace, financial-terminal vibes.
// ─────────────────────────────────────────────────────────────
function NeonTerminal() {
  const statusCol = { Done: "#39FF14", Doing: "#FFE600", Blocked: "#FF2079", Todo: "#00E5FF" };
  return (
    <div style={{ fontFamily: "'JetBrains Mono', 'Courier New', monospace", background: "#000", height: "100%", padding: 24, boxSizing: "border-box", color: "#fff" }}>
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 14, borderBottom: "2px solid #FF2079", paddingBottom: 10 }}>
        <div style={{ color: "#39FF14", fontSize: 14 }}>● LIVE</div>
        <div style={{ fontFamily: "'Caveat', cursive", fontSize: 38, color: "#FFE600", lineHeight: 1 }}>meet.terminal</div>
        <div style={{ fontSize: 13, color: "#00E5FF" }}>v3.2 · ws://recap</div>
        <div style={{ marginLeft: "auto", display: "flex", gap: 8, fontSize: 13 }}>
          <NeonBtn c="#39FF14">[N]ew</NeonBtn>
          <NeonBtn c="#00E5FF">[F]ilter</NeonBtn>
          <NeonBtn c="#FF2079">[X] close</NeonBtn>
        </div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "40px 1.1fr 1fr 2fr 0.6fr 0.8fr", fontSize: 15, color: "#888", padding: "6px 0", borderBottom: "1px dashed #333" }}>
        <div>#</div>
        {HEADS.map(h => <div key={h} style={{ textTransform: "uppercase", letterSpacing: 2 }}>{h}</div>)}
      </div>

      {ROWS.map((r, i) => (
        <div key={i} style={{ display: "grid", gridTemplateColumns: "40px 1.1fr 1fr 2fr 0.6fr 0.8fr", fontSize: 17, padding: "8px 0", borderBottom: "1px dashed #222", alignItems: "center" }}>
          <div style={{ color: "#FFE600" }}>{String(i + 1).padStart(2, "0")}</div>
          <div style={{ color: "#fff" }}>{r.meet}</div>
          <div style={{ color: "#00E5FF" }}>@ {r.who}</div>
          <div>
            <span style={{ background: i % 3 === 1 ? "#FFE60022" : "transparent", padding: i % 3 === 1 ? "2px 6px" : 0 }}>{r.action}</span>
          </div>
          <div style={{ color: "#FF8FCB" }}>{r.due}</div>
          <div>
            <span style={{ color: "#000", background: statusCol[r.status], padding: "2px 10px", fontWeight: 700, boxShadow: `0 0 12px ${statusCol[r.status]}66` }}>
              {r.status.toUpperCase()}
            </span>
          </div>
        </div>
      ))}

      <div style={{ marginTop: 18, fontSize: 13, color: "#39FF14" }}>
        &gt; auto-summary complete · 7 items · next sync in 04:21
        <span style={{ background: "#39FF14", color: "#000", padding: "0 4px", marginLeft: 4, animation: "blink 1s infinite" }}>_</span>
      </div>
    </div>
  );
}
function NeonBtn({ c, children }) {
  return <span style={{ border: `1.5px solid ${c}`, color: c, padding: "3px 10px", textShadow: `0 0 8px ${c}` }}>{children}</span>;
}

// ─────────────────────────────────────────────────────────────
// 5. RAINBOW STRIPE / SKETCHY
// Loose hand-drawn borders, rainbow row tints, pill statuses.
// ─────────────────────────────────────────────────────────────
function RainbowSketchy() {
  const stripes = ["#FFE3E3", "#FFE7C1", "#FFF7B0", "#D9F7B5", "#C1ECFF", "#E2D6FF", "#FFD4F1"];
  const pill = {
    Done:    ["#0a7d35", "#A6FFC9"],
    Doing:   ["#a36400", "#FFE08A"],
    Blocked: ["#a10038", "#FFB0CC"],
    Todo:    ["#003e8a", "#A8D6FF"],
  };
  return (
    <div style={{ fontFamily: "'Patrick Hand', cursive", background: "#FFFFFF", height: "100%", padding: 28, boxSizing: "border-box", color: "#1a1a1a", position: "relative" }}>
      <svg style={{ position: "absolute", top: 18, right: 30, width: 110, height: 60 }} viewBox="0 0 110 60">
        <path d="M5 50 Q 25 5, 55 30 T 105 15" stroke="#FF3D7F" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M5 56 Q 25 11, 55 36 T 105 21" stroke="#FFD93D" strokeWidth="3" fill="none" strokeLinecap="round" />
        <path d="M5 44 Q 25 0,  55 24 T 105 9"  stroke="#3DDC97" strokeWidth="3" fill="none" strokeLinecap="round" />
      </svg>

      <div style={{ marginBottom: 18 }}>
        <div style={{ fontFamily: "'Caveat', cursive", fontSize: 50, fontWeight: 700, lineHeight: 1 }}>
          the <span style={{ color: "#FF3D7F" }}>follow</span>-<span style={{ color: "#FFD93D" }}>up</span> <span style={{ color: "#3DDC97" }}>sheet</span>
        </div>
        <div style={{ fontSize: 20, opacity: 0.7, marginTop: 4 }}>every action item, every meeting, in one rainbow.</div>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 2fr 0.7fr 0.9fr", fontSize: 22, fontFamily: "'Caveat', cursive", fontWeight: 700, padding: "0 8px 4px", borderBottom: "3px solid #1a1a1a" }}>
        {HEADS.map((h, i) => <div key={h} style={{ color: ["#FF3D7F","#FFB000","#3DDC97","#3D9DFF","#C77DFF"][i] }}>{h}</div>)}
      </div>

      {ROWS.map((r, i) => {
        const [fg, bg] = pill[r.status];
        return (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1.2fr 1fr 2fr 0.7fr 0.9fr", fontSize: 21, padding: "10px 8px", background: stripes[i], border: "1.5px solid #1a1a1a22", borderRadius: 4, marginTop: 6, alignItems: "center" }}>
            <div>{r.meet}</div>
            <div>· {r.who}</div>
            <div>{r.action}</div>
            <div style={{ fontFamily: "'Caveat', cursive", fontSize: 26 }}>{r.due}</div>
            <div>
              <span style={{ background: bg, color: fg, padding: "3px 14px", borderRadius: 999, border: `2px solid ${fg}`, fontSize: 18, fontWeight: 700 }}>
                {r.status.toLowerCase()}
              </span>
            </div>
          </div>
        );
      })}

      <div style={{ marginTop: 20, display: "flex", gap: 10, fontSize: 18 }}>
        <SketchBtn fill="#FFD93D">＋ add row</SketchBtn>
        <SketchBtn fill="#3DDC97">↗ send to slack</SketchBtn>
        <SketchBtn fill="#FF9EC4">⟳ re-summarize</SketchBtn>
      </div>
    </div>
  );
}

window.HighlighterGrid = HighlighterGrid;
window.ColorBlockRows = ColorBlockRows;
window.StickyNoteGrid = StickyNoteGrid;
window.NeonTerminal = NeonTerminal;
window.RainbowSketchy = RainbowSketchy;
