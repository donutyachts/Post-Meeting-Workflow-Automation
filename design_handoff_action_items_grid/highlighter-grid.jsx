// Highlighter Marker — standalone wireframe
// Action-items spreadsheet for a post-meeting automation workflow.

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

function HighlighterGrid() {
  const statusColor = {
    Done:    "#FFE600",
    Doing:   "#7CF3A0",
    Blocked: "#FF6BD6",
    Todo:    "#5BD7FF",
  };
  return (
    <div style={{ fontFamily: "'Patrick Hand', cursive", background: "#FFFDF4", minHeight: "100vh", padding: "40px 48px", boxSizing: "border-box", color: "#1a1a1a" }}>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", marginBottom: 22, maxWidth: 1200, marginInline: "auto" }}>
        <div>
          <div style={{ fontFamily: "'Caveat', cursive", fontSize: 48, lineHeight: 1, fontWeight: 700 }}>
            <span style={{ background: "linear-gradient(transparent 55%, #FFE600 55% 90%, transparent 90%)", padding: "0 6px" }}>Action items</span>
          </div>
          <div style={{ fontSize: 22, opacity: 0.7, marginTop: 6 }}>this week — 7 open, 1 shipped ✱</div>
        </div>
        <div style={{ display: "flex", gap: 10, fontSize: 18 }}>
          <SketchBtn>+ new row</SketchBtn>
          <SketchBtn>filter</SketchBtn>
          <SketchBtn fill="#FFE600">sync ↻</SketchBtn>
        </div>
      </div>

      <div style={{ border: "2.5px solid #1a1a1a", borderRadius: 6, overflow: "hidden", boxShadow: "6px 6px 0 #1a1a1a", maxWidth: 1200, marginInline: "auto" }}>
        <div style={{ display: "grid", gridTemplateColumns: "1.2fr 1.1fr 2fr 0.7fr 0.9fr", background: "#1a1a1a", color: "#FFFDF4", fontSize: 22 }}>
          {HEADS.map(h => <div key={h} style={{ padding: "12px 16px", borderRight: "1.5px dashed #FFFDF455" }}>{h}</div>)}
        </div>
        {ROWS.map((r, i) => (
          <div key={i} style={{ display: "grid", gridTemplateColumns: "1.2fr 1.1fr 2fr 0.7fr 0.9fr", borderTop: "1.5px dashed #1a1a1a55", fontSize: 22, background: i % 2 ? "#FFFDF4" : "#FFF8E1" }}>
            <Cell>{r.meet}</Cell>
            <Cell>{r.who}</Cell>
            <Cell><Marker color={i === 2 ? "#FF6BD6" : i === 0 ? "#7CF3A0" : "transparent"}>{r.action}</Marker></Cell>
            <Cell><span style={{ borderBottom: "3px solid #FF6BD6" }}>{r.due}</span></Cell>
            <Cell>
              <span style={{ background: statusColor[r.status], padding: "2px 12px", borderRadius: 999, border: "2px solid #1a1a1a", fontSize: 18 }}>
                {r.status}
              </span>
            </Cell>
          </div>
        ))}
      </div>

      <div style={{ marginTop: 22, fontFamily: "'Caveat', cursive", fontSize: 28, transform: "rotate(-1.5deg)", display: "inline-block", background: "#7CF3A0", padding: "4px 14px", border: "2px solid #1a1a1a", marginLeft: "calc(50% - 600px + 4px)" }}>
        ↑ pulled from 4 meetings today
      </div>
    </div>
  );
}

function Cell({ children }) {
  return <div style={{ padding: "12px 16px", borderRight: "1.5px dashed #1a1a1a55" }}>{children}</div>;
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

ReactDOM.createRoot(document.getElementById('root')).render(<HighlighterGrid />);
