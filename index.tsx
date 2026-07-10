import { useState, useEffect, useMemo, useRef } from "react";
import { Search, Plus, X, Hash, User, Calendar, BookMarked, ChevronUp, Pencil } from "lucide-react";

const ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".split("");

const STAMP_COLORS = ["#F7931A", "#121212", "#C97316"];

function stampColorFor(letter) {
  const idx = letter.charCodeAt(0) % STAMP_COLORS.length;
  return STAMP_COLORS[idx];
}

function todayStamp() {
  const d = new Date();
  const months = ["JAN","FEB","MÄR","APR","MAI","JUN","JUL","AUG","SEP","OKT","NOV","DEZ"];
  return `${months[d.getMonth()]} ${String(d.getDate()).padStart(2,"0")} '${String(d.getFullYear()).slice(2)}`;
}

export default function JargonFile() {
  const [terms, setTerms] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadError, setLoadError] = useState(false);
  const [query, setQuery] = useState("");
  const [activeLetter, setActiveLetter] = useState(null);
  const [showForm, setShowForm] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ term: "", meaning: "", example: "", author: "" });
  const [editingId, setEditingId] = useState(null);
  const [votedIds, setVotedIds] = useState(new Set());
  const formRef = useRef(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      try {
        const res = await window.storage.get("terms", true);
        if (mounted) {
          setTerms(res && res.value ? JSON.parse(res.value) : []);
        }
      } catch (e) {
        if (mounted) setTerms([]);
      }
      try {
        const voted = await window.storage.get("voted-terms", false);
        if (mounted && voted && voted.value) {
          setVotedIds(new Set(JSON.parse(voted.value)));
        }
      } catch (e) {
        // no votes yet for this user
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
  }, []);

  const persist = async (next) => {
    setTerms(next);
    try {
      const res = await window.storage.set("terms", JSON.stringify(next), true);
      if (!res) setLoadError(true);
    } catch (e) {
      setLoadError(true);
    }
  };

  const persistVotes = async (nextSet) => {
    setVotedIds(nextSet);
    try {
      await window.storage.set("voted-terms", JSON.stringify([...nextSet]), false);
    } catch (e) {
      // vote still applied locally even if this fails
    }
  };

  const lettersPresent = useMemo(() => {
    const s = new Set(terms.map(t => (t.term[0] || "?").toUpperCase()));
    return s;
  }, [terms]);

  const filtered = useMemo(() => {
    let list = [...terms];
    if (activeLetter) {
      list = list.filter(t => t.term[0]?.toUpperCase() === activeLetter);
    }
    if (query.trim()) {
      const q = query.trim().toLowerCase();
      list = list.filter(t =>
        t.term.toLowerCase().includes(q) ||
        t.meaning.toLowerCase().includes(q) ||
        (t.example || "").toLowerCase().includes(q)
      );
    }
    return list.sort((a, b) => (b.votes || 0) - (a.votes || 0) || a.term.localeCompare(b.term));
  }, [terms, activeLetter, query]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.term.trim() || !form.meaning.trim()) return;
    setSaving(true);
    if (editingId) {
      const next = terms.map((t) =>
        t.id === editingId
          ? {
              ...t,
              term: form.term.trim(),
              meaning: form.meaning.trim(),
              example: form.example.trim(),
              author: form.author.trim() || "Unbekannt",
              edited: true,
            }
          : t
      );
      await persist(next);
    } else {
      const entry = {
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        term: form.term.trim(),
        meaning: form.meaning.trim(),
        example: form.example.trim(),
        author: form.author.trim() || "Unbekannt",
        date: todayStamp(),
        votes: 0,
      };
      await persist([...terms, entry]);
    }
    setSaving(false);
    setForm({ term: "", meaning: "", example: "", author: "" });
    setEditingId(null);
    setShowForm(false);
  };

  const openEdit = (t) => {
    setEditingId(t.id);
    setForm({ term: t.term, meaning: t.meaning, example: t.example || "", author: t.author || "" });
    setShowForm(true);
  };

  const openNew = () => {
    setEditingId(null);
    setForm({ term: "", meaning: "", example: "", author: "" });
    setShowForm(true);
  };

  const handleUpvote = async (id) => {
    if (votedIds.has(id)) return;
    const nextVotes = new Set(votedIds).add(id);
    await persistVotes(nextVotes);
    const next = terms.map((t) =>
      t.id === id ? { ...t, votes: (t.votes || 0) + 1 } : t
    );
    await persist(next);
  };

  return (
    <div style={styles.page}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Special+Elite&family=IBM+Plex+Mono:wght@400;500;600&family=Work+Sans:wght@400;500;600&display=swap');
        * { box-sizing: border-box; }
        .jf-card { transition: transform 0.18s ease, box-shadow 0.18s ease; }
        .jf-card:hover { transform: translateY(-3px) rotate(-0.3deg); box-shadow: 0 10px 22px rgba(0,0,0,0.45); }
        .jf-tab { transition: background 0.15s ease, color 0.15s ease; }
        .jf-tab:hover { background: #F7931A22; }
        .jf-btn { transition: transform 0.12s ease, box-shadow 0.12s ease; }
        .jf-btn:active { transform: translateY(1px); }
        input:focus, textarea:focus { outline: 2px solid #F7931A; outline-offset: 2px; }
        button:focus-visible, .jf-tab:focus-visible { outline: 2px solid #F7931A; outline-offset: 2px; }
        @media (prefers-reduced-motion: reduce) {
          .jf-card, .jf-tab, .jf-btn { transition: none !important; }
        }
        ::-webkit-scrollbar { height: 8px; width: 8px; }
        ::-webkit-scrollbar-thumb { background: #F7931A; border-radius: 4px; }
      `}</style>

      <header style={styles.header}>
        <div style={styles.drawerLabel}>
          <BookMarked size={18} color="#F7931A" strokeWidth={2} />
          <span style={styles.drawerLabelText}>SCHUBLADE — TEAM-ARCHIV</span>
        </div>
        <h1 style={styles.title}>Ds Jargon-Büechli</h1>
        <p style={styles.subtitle}>e läbige Katalog vo Wörter, wo nur mir verstöh</p>
      </header>

      <div style={styles.controls}>
        <div style={styles.searchWrap}>
          <Search size={16} color="#8a8a8a" style={{ flexShrink: 0 }} />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="im Katalog sueche…"
            style={styles.searchInput}
            aria-label="Wörter sueche"
          />
        </div>
        <button
          className="jf-btn"
          style={styles.addBtn}
          onClick={openNew}
        >
          <Plus size={16} strokeWidth={2.5} />
          Neui Charte
        </button>
      </div>

      <nav style={styles.tabRail} aria-label="Nach Buechstabe filtere">
        <button
          className="jf-tab"
          onClick={() => setActiveLetter(null)}
          style={{
            ...styles.tab,
            background: activeLetter === null ? "#F7931A" : "transparent",
            color: activeLetter === null ? "#121212" : "#c9c9c9",
            fontWeight: activeLetter === null ? 700 : 500,
          }}
        >
          ALLI
        </button>
        {ALPHABET.map((l) => {
          const present = lettersPresent.has(l);
          return (
            <button
              key={l}
              className="jf-tab"
              disabled={!present}
              onClick={() => setActiveLetter(l)}
              style={{
                ...styles.tab,
                background: activeLetter === l ? "#F7931A" : "transparent",
                color: !present ? "#3d3d3d" : activeLetter === l ? "#121212" : "#c9c9c9",
                fontWeight: activeLetter === l ? 700 : 500,
                cursor: present ? "pointer" : "default",
              }}
            >
              {l}
            </button>
          );
        })}
      </nav>

      <main style={styles.main}>
        {loading ? (
          <p style={styles.emptyText}>Charte werded usere Schublade gholt…</p>
        ) : filtered.length === 0 && terms.length === 0 ? (
          <div style={styles.emptyState}>
            <p style={styles.emptyTitle}>Die Schublade isch leer.</p>
            <p style={styles.emptyText}>Leg s erste Wort a — jedes Archiv fangt mit ere Charte a.</p>
          </div>
        ) : filtered.length === 0 ? (
          <p style={styles.emptyText}>Kei Charte passt. Probier e anderi Suech oder Buechstabe.</p>
        ) : (
          <div style={styles.grid}>
            {filtered.map((t) => {
              const letter = (t.term[0] || "?").toUpperCase();
              const color = stampColorFor(letter);
              return (
                <article key={t.id} className="jf-card" style={styles.card}>
                  <div style={styles.cardHole} />
                  <button
                    onClick={() => openEdit(t)}
                    style={styles.editBtn}
                    aria-label={`${t.term} bearbeite`}
                    title="Die Charte bearbeite"
                  >
                    <Pencil size={13} />
                  </button>
                  <div style={styles.cardTop}>
                    <span style={{ ...styles.stamp, borderColor: color, color }}>{letter}</span>
                    <span style={styles.cardDate}>
                      <Calendar size={11} style={{ marginRight: 4, verticalAlign: -1 }} />
                      {t.date}{t.edited ? " · bearbeitet" : ""}
                    </span>
                  </div>
                  <h2 style={styles.cardTerm}>{t.term}</h2>
                  <div style={styles.ruleLine} />
                  <p style={styles.cardMeaning}>{t.meaning}</p>
                  {t.example && (
                    <p style={styles.cardExample}>
                      <Hash size={11} style={{ marginRight: 4, verticalAlign: -1 }} />
                      "{t.example}"
                    </p>
                  )}
                  <div style={styles.cardFooter}>
                    <p style={styles.cardAuthor}>
                      <User size={11} style={{ marginRight: 4, verticalAlign: -1 }} />
                      abgleit vo {t.author}
                    </p>
                    <button
                      onClick={() => handleUpvote(t.id)}
                      disabled={votedIds.has(t.id)}
                      className="jf-btn"
                      style={{
                        ...styles.voteBtn,
                        opacity: votedIds.has(t.id) ? 0.6 : 1,
                        cursor: votedIds.has(t.id) ? "default" : "pointer",
                      }}
                      aria-label={`${t.term} hochvote`}
                      title={votedIds.has(t.id) ? "Hesch scho votiert" : "Hochvote"}
                    >
                      <ChevronUp size={14} strokeWidth={2.5} />
                      {t.votes || 0}
                    </button>
                  </div>
                </article>
              );
            })}
          </div>
        )}
      </main>

      {showForm && (
        <div style={styles.overlay} onClick={() => !saving && setShowForm(false)}>
          <form
            ref={formRef}
            onClick={(e) => e.stopPropagation()}
            onSubmit={handleSubmit}
            style={styles.formCard}
          >
            <div style={styles.cardHole} />
            <div style={styles.formHeader}>
              <span style={styles.formHeaderText}>{editingId ? "CHARTE BEARBEITE" : "NEUI CHARTE"}</span>
              <button
                type="button"
                onClick={() => { setShowForm(false); setEditingId(null); }}
                style={styles.closeBtn}
                aria-label="Abbreche"
              >
                <X size={16} />
              </button>
            </div>
            <label style={styles.label}>
              Wort
              <input
                required
                value={form.term}
                onChange={(e) => setForm({ ...form, term: e.target.value })}
                placeholder="z.B. Houdini-Meeting"
                style={styles.input}
              />
            </label>
            <label style={styles.label}>
              Bedütig
              <textarea
                required
                value={form.meaning}
                onChange={(e) => setForm({ ...form, meaning: e.target.value })}
                placeholder="was bedütet's, in eifache Wort"
                style={{ ...styles.input, minHeight: 64, resize: "vertical" }}
              />
            </label>
            <label style={styles.label}>
              Bispiel (optional)
              <input
                value={form.example}
                onChange={(e) => setForm({ ...form, example: e.target.value })}
                placeholder="in-me Satz bruucht"
                style={styles.input}
              />
            </label>
            <label style={styles.label}>
              Dis Name (optional)
              <input
                value={form.author}
                onChange={(e) => setForm({ ...form, author: e.target.value })}
                placeholder="abgleit vo…"
                style={styles.input}
              />
            </label>
            <button type="submit" disabled={saving} className="jf-btn" style={styles.submitBtn}>
              {saving ? "Am Spichere…" : editingId ? "Änderige spichere" : "Charte ablege"}
            </button>
            {loadError && (
              <p style={styles.errorText}>Het grad nid chönne spichere — check dini Verbindig und probier's nomol.</p>
            )}
          </form>
        </div>
      )}

      <footer style={styles.footer}>
        <span>{terms.length} Charte{terms.length === 1 ? "" : "n"} im Ordner</span>
        <span style={{ opacity: 0.6 }}>· sichtbar für alli mit dere App</span>
      </footer>
    </div>
  );
}

const styles = {
  page: {
    minHeight: "100vh",
    background: "linear-gradient(180deg, #161616 0%, #0B0B0B 100%)",
    fontFamily: "'Work Sans', sans-serif",
    color: "#F5F5F5",
    padding: "28px 20px 60px",
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
  },
  header: {
    width: "100%",
    maxWidth: 900,
    marginBottom: 22,
  },
  drawerLabel: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    marginBottom: 10,
  },
  drawerLabelText: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11,
    letterSpacing: "0.14em",
    color: "#F7931A",
    fontWeight: 600,
  },
  title: {
    fontFamily: "'Special Elite', monospace",
    fontSize: "clamp(32px, 6vw, 52px)",
    color: "#FFFFFF",
    margin: 0,
    letterSpacing: "0.01em",
  },
  subtitle: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 13,
    color: "#9a9a9a",
    marginTop: 6,
  },
  controls: {
    width: "100%",
    maxWidth: 900,
    display: "flex",
    gap: 12,
    marginBottom: 16,
    flexWrap: "wrap",
  },
  searchWrap: {
    flex: "1 1 260px",
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "#1A1A1A",
    border: "1px solid #333333",
    borderRadius: 6,
    padding: "10px 14px",
  },
  searchInput: {
    flex: 1,
    background: "transparent",
    border: "none",
    color: "#F5F5F5",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 14,
  },
  addBtn: {
    display: "flex",
    alignItems: "center",
    gap: 6,
    background: "#F7931A",
    color: "#121212",
    border: "none",
    borderRadius: 6,
    padding: "10px 16px",
    fontFamily: "'IBM Plex Mono', monospace",
    fontWeight: 600,
    fontSize: 13,
    cursor: "pointer",
    boxShadow: "0 2px 0 #b5670e",
  },
  tabRail: {
    width: "100%",
    maxWidth: 900,
    display: "flex",
    overflowX: "auto",
    gap: 2,
    borderBottom: "1px solid #333333",
    marginBottom: 24,
    paddingBottom: 2,
  },
  tab: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 12,
    border: "none",
    borderRadius: 4,
    padding: "6px 9px",
    cursor: "pointer",
    flexShrink: 0,
  },
  main: {
    width: "100%",
    maxWidth: 900,
  },
  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(240px, 1fr))",
    gap: 18,
  },
  card: {
    position: "relative",
    background: "#FFFFFF",
    color: "#121212",
    borderRadius: 3,
    padding: "20px 18px 16px",
    boxShadow: "0 4px 10px rgba(0,0,0,0.4)",
    border: "1px solid #e6e6e6",
  },
  cardHole: {
    position: "absolute",
    top: 8,
    left: "50%",
    transform: "translateX(-50%)",
    width: 10,
    height: 10,
    borderRadius: "50%",
    background: "#0B0B0B",
    boxShadow: "inset 0 1px 2px rgba(0,0,0,0.6)",
  },
  cardTop: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 10,
  },
  stamp: {
    fontFamily: "'Special Elite', monospace",
    fontSize: 13,
    width: 24,
    height: 24,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    border: "2px solid",
    borderRadius: "50%",
    transform: "rotate(-8deg)",
  },
  cardDate: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 10,
    color: "#8a8a8a",
  },
  cardTerm: {
    fontFamily: "'Special Elite', monospace",
    fontSize: 20,
    margin: 0,
    lineHeight: 1.2,
  },
  ruleLine: {
    height: 1,
    background: "#e6e6e6",
    margin: "10px 0",
  },
  cardMeaning: {
    fontFamily: "'Work Sans', sans-serif",
    fontSize: 14,
    lineHeight: 1.45,
    margin: "0 0 10px",
  },
  cardExample: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 12,
    color: "#6b6b6b",
    fontStyle: "italic",
    margin: "0 0 10px",
  },
  cardAuthor: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11,
    color: "#8a8a8a",
    margin: 0,
  },
  cardFooter: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginTop: 4,
  },
  voteBtn: {
    display: "flex",
    alignItems: "center",
    gap: 2,
    background: "#121212",
    color: "#F7931A",
    border: "none",
    borderRadius: 12,
    padding: "4px 9px 4px 6px",
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 12,
    fontWeight: 600,
    flexShrink: 0,
  },
  editBtn: {
    position: "absolute",
    top: 10,
    right: 10,
    background: "transparent",
    border: "none",
    color: "#b8860b",
    cursor: "pointer",
    padding: 4,
    borderRadius: 4,
  },
  emptyState: {
    textAlign: "center",
    padding: "60px 20px",
  },
  emptyTitle: {
    fontFamily: "'Special Elite', monospace",
    fontSize: 22,
    marginBottom: 6,
    color: "#FFFFFF",
  },
  emptyText: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 13,
    color: "#9a9a9a",
    textAlign: "center",
  },
  overlay: {
    position: "fixed",
    inset: 0,
    background: "rgba(0,0,0,0.65)",
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    padding: 20,
    zIndex: 10,
  },
  formCard: {
    position: "relative",
    background: "#FFFFFF",
    color: "#121212",
    borderRadius: 4,
    padding: "24px 22px 20px",
    width: "100%",
    maxWidth: 420,
    display: "flex",
    flexDirection: "column",
    gap: 12,
    boxShadow: "0 12px 30px rgba(0,0,0,0.55)",
  },
  formHeader: {
    display: "flex",
    justifyContent: "space-between",
    alignItems: "center",
    marginTop: 6,
    marginBottom: 4,
  },
  formHeaderText: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 12,
    letterSpacing: "0.12em",
    color: "#F7931A",
    fontWeight: 700,
  },
  closeBtn: {
    background: "transparent",
    border: "none",
    cursor: "pointer",
    color: "#6b6b6b",
    padding: 4,
  },
  label: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 12,
    color: "#6b6b6b",
    display: "flex",
    flexDirection: "column",
    gap: 5,
  },
  input: {
    fontFamily: "'Work Sans', sans-serif",
    fontSize: 14,
    padding: "9px 10px",
    borderRadius: 4,
    border: "1px solid #d9d9d9",
    background: "#FAFAFA",
    color: "#121212",
  },
  submitBtn: {
    marginTop: 6,
    background: "#F7931A",
    color: "#121212",
    border: "none",
    borderRadius: 5,
    padding: "11px 16px",
    fontFamily: "'IBM Plex Mono', monospace",
    fontWeight: 700,
    fontSize: 13,
    cursor: "pointer",
    boxShadow: "0 2px 0 #b5670e",
  },
  errorText: {
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11,
    color: "#C1432E",
    margin: 0,
  },
  footer: {
    width: "100%",
    maxWidth: 900,
    display: "flex",
    justifyContent: "space-between",
    marginTop: 28,
    fontFamily: "'IBM Plex Mono', monospace",
    fontSize: 11,
    color: "#9a9a9a",
  },
};
