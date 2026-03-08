import { useState, useEffect, useRef, useCallback } from "react";

// ─── CONFIG BACKEND ────────────────────────────────────────────────────────────
const API_URL = "https://spinning-backend-production.up.railway.app";
const SOCKET_URL = "https://spinning-backend-production.up.railway.app";

// ─── CONSTANTS ───────────────────────────────────────────────────────────────
const WHEEL_CONFIGS = [
  { id: 1, label: "1/2", slots: 2, odds: "50%", color: "#22c55e" },
  { id: 2, label: "1/4", slots: 4, odds: "25%", color: "#84cc16" },
  { id: 3, label: "1/8", slots: 8, odds: "12.5%", color: "#eab308" },
  { id: 4, label: "1/16", slots: 16, odds: "6.25%", color: "#f97316" },
  { id: 5, label: "1/32", slots: 32, odds: "3.12%", color: "#ef4444" },
  { id: 6, label: "1/64", slots: 64, odds: "1.56%", color: "#ec4899" },
  { id: 7, label: "1/128", slots: 128, odds: "0.78%", color: "#a855f7" },
  { id: 8, label: "1/256", slots: 256, odds: "0.39%", color: "#8b5cf6" },
  { id: 9, label: "1/512", slots: 512, odds: "0.19%", color: "#6366f1" },
  { id: 10, label: "1/1024", slots: 1024, odds: "0.09%", color: "#3b82f6" },
];

const BET_AMOUNTS = [1, 2, 4, 8, 16, 32, 64, 128, 256, 512, 1024];

const COLORS = [
  "#22c55e","#3b82f6","#f97316","#a855f7","#ef4444",
  "#eab308","#ec4899","#06b6d4","#84cc16","#8b5cf6",
];

function generateId() {
  return Math.random().toString(36).slice(2, 10);
}



// ─── WHEEL CANVAS ─────────────────────────────────────────────────────────────
function WheelCanvas({ participants, spinning, winnerIndex, onDone }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);
  const angleRef = useRef(0);

  const totalTickets = participants.reduce((s, p) => s + p.tickets, 0);

  const segments = participants.map((p, i) => ({
    label: p.pseudo,
    pct: p.tickets / totalTickets,
    color: COLORS[i % COLORS.length],
  }));

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const cx = canvas.width / 2, cy = canvas.height / 2, r = cx - 8;

    function draw(angle) {
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      let start = angle;
      segments.forEach((seg) => {
        const sweep = seg.pct * 2 * Math.PI;
        ctx.beginPath();
        ctx.moveTo(cx, cy);
        ctx.arc(cx, cy, r, start, start + sweep);
        ctx.closePath();
        ctx.fillStyle = seg.color;
        ctx.fill();
        ctx.strokeStyle = "#0f172a";
        ctx.lineWidth = 2;
        ctx.stroke();

        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(start + sweep / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "#fff";
        ctx.font = `bold ${Math.max(9, Math.min(13, 120 / segments.length))}px sans-serif`;
        ctx.fillText(seg.label.slice(0, 10), r - 8, 4);
        ctx.restore();
        start += sweep;
      });
      // Needle
      ctx.beginPath();
      ctx.moveTo(cx + r + 4, cy);
      ctx.lineTo(cx + r - 14, cy - 8);
      ctx.lineTo(cx + r - 14, cy + 8);
      ctx.fillStyle = "#fbbf24";
      ctx.fill();
    }

    if (!spinning) { draw(angleRef.current); return; }

    const target = winnerIndex !== null
      ? (() => {
          let acc = 0;
          for (let i = 0; i < winnerIndex; i++) acc += segments[i].pct * 2 * Math.PI;
          return acc + segments[winnerIndex].pct * Math.PI;
        })()
      : 0;

    const fullSpins = 5 * 2 * Math.PI;
    const finalAngle = fullSpins - target;
    const duration = 4000;
    const startTime = performance.now();
    const startAngle = angleRef.current;

    function easeOut(t) { return 1 - Math.pow(1 - t, 4); }

    function frame(now) {
      const t = Math.min((now - startTime) / duration, 1);
      angleRef.current = startAngle + easeOut(t) * finalAngle;
      draw(angleRef.current);
      if (t < 1) animRef.current = requestAnimationFrame(frame);
      else { angleRef.current = angleRef.current % (2 * Math.PI); onDone && onDone(); }
    }
    animRef.current = requestAnimationFrame(frame);
    return () => cancelAnimationFrame(animRef.current);
  }, [spinning, winnerIndex]);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || spinning) return;
    const ctx = canvas.getContext("2d");
    const cx = canvas.width / 2, cy = canvas.height / 2, r = cx - 8;
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    let start = angleRef.current;
    segments.forEach((seg) => {
      const sweep = seg.pct * 2 * Math.PI;
      ctx.beginPath(); ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, start, start + sweep);
      ctx.closePath(); ctx.fillStyle = seg.color; ctx.fill();
      ctx.strokeStyle = "#0f172a"; ctx.lineWidth = 2; ctx.stroke();
      ctx.save(); ctx.translate(cx, cy); ctx.rotate(start + sweep / 2);
      ctx.textAlign = "right"; ctx.fillStyle = "#fff";
      ctx.font = `bold ${Math.max(9, Math.min(13, 120 / segments.length))}px sans-serif`;
      ctx.fillText(seg.label.slice(0, 10), r - 8, 4); ctx.restore();
      start += sweep;
    });
    ctx.beginPath(); ctx.moveTo(cx + r + 4, cy);
    ctx.lineTo(cx + r - 14, cy - 8); ctx.lineTo(cx + r - 14, cy + 8);
    ctx.fillStyle = "#fbbf24"; ctx.fill();
  }, [participants]);

  return <canvas ref={canvasRef} width={320} height={320} style={{ borderRadius: "50%" }} />;
}

// ─── MAIN APP ────────────────────────────────────────────────────────────────
export default function App() {
  // Auth
  const [token, setToken] = useState(() => localStorage.getItem("spinning_token") || null);
  const [user, setUser] = useState(() => { try { return JSON.parse(localStorage.getItem("spinning_user")); } catch { return null; } });
  const [authMode, setAuthMode] = useState("login");
  const [authForm, setAuthForm] = useState({ pseudo: "", password: "" });
  const [authError, setAuthError] = useState("");

  // Navigation
  const [page, setPage] = useState("lobby"); // lobby | game | wallet | friends | chat

  // Games
  const [activeGames, setActiveGames] = useState({});
  const [selectedWheel, setSelectedWheel] = useState(null);
  const [selectedBet, setSelectedBet] = useState(1);
  const [ticketCount, setTicketCount] = useState(1);
  const [currentGame, setCurrentGame] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [winnerIdx, setWinnerIdx] = useState(null);
  const [gameResult, setGameResult] = useState(null);
  const [gameCountdown, setGameCountdown] = useState(null);

  // Chat
  const [chatMessages, setChatMessages] = useState([]);
  const [chatInput, setChatInput] = useState("");

  // Friends
  const [friends, setFriends] = useState([]);
  const [friendInput, setFriendInput] = useState("");
  const [friendMsg, setFriendMsg] = useState("");

  // Wallet
  const [history, setHistory] = useState([]);

  // Socket
  const socketRef = useRef(null);
  const chatEndRef = useRef(null);

  // ─── API HELPERS ────────────────────────────────────────────────────────────
  const api = useCallback(async (path, method = "GET", body = null) => {
    const headers = { "Content-Type": "application/json" };
    if (token) headers["Authorization"] = "Bearer " + token;
    const res = await fetch(API_URL + path, { method, headers, body: body ? JSON.stringify(body) : null });
    const data = await res.json();
    if (!res.ok) throw new Error(data.error || "Erreur");
    return data;
  }, [token]);

  // ─── SOCKET CONNECTION ───────────────────────────────────────────────────────
  useEffect(() => {
    if (!token) return;

    // Load socket.io dynamically
    const script = document.createElement("script");
    script.src = "https://cdn.socket.io/4.7.5/socket.io.min.js";
    script.onload = () => {
      const socket = window.io(SOCKET_URL, { auth: { token } });
      socketRef.current = socket;

      socket.on("games_state", (games) => setActiveGames(games));
      socket.on("game_updated", ({ key, game }) => setActiveGames(prev => ({ ...prev, [key]: game })));
      socket.on("game_result", ({ key, winner, payout, participants }) => {
        setSpinning(false);
        const idx = participants.findIndex(p => p.userId === winner.userId);
        setWinnerIdx(idx);
        setGameResult({ winner, payout, key });
        setActiveGames(prev => { const n = { ...prev }; delete n[key]; return n; });
        // Refresh balance
        api("/user/me").then(u => { setUser(u); localStorage.setItem("spinning_user", JSON.stringify(u)); }).catch(() => {});
      });
      socket.on("chat_message", (msg) => setChatMessages(prev => [...prev, msg].slice(-100)));
      socket.on("joined_game", ({ key }) => {
        setCurrentGame(key);
        setGameCountdown(15);
      });
      socket.on("error", (msg) => alert("Erreur: " + msg));
    };
    document.head.appendChild(script);

    return () => {
      if (socketRef.current) socketRef.current.disconnect();
    };
  }, [token]);

  // Countdown timer
  useEffect(() => {
    if (gameCountdown === null) return;
    if (gameCountdown <= 0) { setGameCountdown(null); setSpinning(true); return; }
    const t = setTimeout(() => setGameCountdown(c => c - 1), 1000);
    return () => clearTimeout(t);
  }, [gameCountdown]);

  // Auto scroll chat
  useEffect(() => { chatEndRef.current?.scrollIntoView({ behavior: "smooth" }); }, [chatMessages]);

  // Load chat history on connect
  useEffect(() => {
    if (!token) return;
    api("/chat/history").then(msgs => {
      setChatMessages(msgs.map(m => ({ id: m.id, from: m.pseudo, text: m.text, ts: new Date(m.created_at).getTime() })));
    }).catch(() => {});
  }, [token]);

  // ─── AUTH ────────────────────────────────────────────────────────────────────
  async function handleAuth(e) {
    if (e?.preventDefault) e.preventDefault();
    setAuthError("");
    if (!authForm.pseudo?.trim() || !authForm.password?.trim()) {
      return setAuthError("Pseudo et mot de passe requis");
    }
    if (authMode === "register") {
      if (authForm.password.length < 6) return setAuthError("Mot de passe trop court (6 caractères min)");
      if (authForm.password !== authForm.confirm) return setAuthError("Les mots de passe ne correspondent pas");
    }
    try {
      const data = await api(`/auth/${authMode}`, "POST", authForm);
      setToken(data.token);
      setUser(data.user);
      localStorage.setItem("spinning_token", data.token);
      localStorage.setItem("spinning_user", JSON.stringify(data.user));
    } catch (err) {
      setAuthError(err.message);
    }
  }

  function logout() {
    setToken(null); setUser(null);
    localStorage.removeItem("spinning_token");
    localStorage.removeItem("spinning_user");
    if (socketRef.current) socketRef.current.disconnect();
  }

  // ─── GAME ACTIONS ────────────────────────────────────────────────────────────
  function joinGame() {
    if (!socketRef.current || !selectedWheel) return;
    setGameResult(null);
    socketRef.current.emit("join_game", { wheelId: selectedWheel.id, betAmount: selectedBet, tickets: ticketCount });
    setPage("game");
  }

  function sendChat() {
    if (!chatInput.trim() || !socketRef.current) return;
    socketRef.current.emit("chat_message", { text: chatInput.trim() });
    setChatInput("");
  }

  async function loadWallet() {
    try {
      const data = await api("/user/history");
      setHistory(data);
    } catch {}
  }

  async function loadFriends() {
    try {
      const data = await api("/user/friends");
      setFriends(data);
    } catch {}
  }

  async function addFriend() {
    try {
      await api("/user/friends", "POST", { pseudo: friendInput });
      setFriendMsg("Ami ajouté !");
      setFriendInput("");
      loadFriends();
    } catch (err) {
      setFriendMsg(err.message);
    }
  }

  // ─── RENDER: AUTH ───────────────────────────────────────────────────────────
  if (!token) return (
    <div style={{ minHeight:"100vh", background:"#0f172a", display:"flex", alignItems:"center", justifyContent:"center", fontFamily:"system-ui" }}>
      <div style={{ background:"#1e293b", borderRadius:16, padding:40, width:340, boxShadow:"0 25px 50px rgba(0,0,0,0.5)" }}>
        <div style={{ textAlign:"center", marginBottom:24 }}>
          <div style={{ fontSize:48 }}>🎡</div>
          <h1 style={{ color:"#f1f5f9", fontSize:28, margin:"8px 0 4px" }}>SPINNING</h1>
          <p style={{ color:"#64748b", fontSize:14 }}>La roue de la fortune crypto</p>
        </div>

        <div style={{ display:"flex", marginBottom:20, background:"#0f172a", borderRadius:8, padding:4 }}>
          {["login","register"].map(m => (
            <button key={m} onClick={() => { setAuthMode(m); setAuthForm({ pseudo: "", password: "", confirm: "" }); setAuthError(""); }} style={{
              flex:1, padding:"8px 0", border:"none", borderRadius:6, cursor:"pointer",
              background: authMode===m ? "#6366f1" : "transparent",
              color: authMode===m ? "#fff" : "#64748b", fontWeight:600, fontSize:13
            }}>{m === "login" ? "Connexion" : "Inscription"}</button>
          ))}
        </div>

        <div>
          <input value={authForm.pseudo} onChange={e => setAuthForm(f => ({...f, pseudo: e.target.value}))}
            placeholder="Pseudo" style={inputStyle}
            onKeyDown={e => e.key === "Enter" && handleAuth(e)} />
          <input value={authForm.password} onChange={e => setAuthForm(f => ({...f, password: e.target.value}))}
            type="password" placeholder="Mot de passe" style={{...inputStyle, marginTop:10}}
            onKeyDown={e => e.key === "Enter" && handleAuth(e)} />
          {authMode === "register" && (
            <input value={authForm.confirm || ""} onChange={e => setAuthForm(f => ({...f, confirm: e.target.value}))}
              type="password" placeholder="Confirmer le mot de passe" style={{...inputStyle, marginTop:10,
                borderColor: authForm.confirm && authForm.confirm !== authForm.password ? "#ef4444" : authForm.confirm && authForm.confirm === authForm.password ? "#22c55e" : "#334155"
              }}
              onKeyDown={e => e.key === "Enter" && handleAuth(e)} />
          )}
          {authMode === "register" && authForm.confirm && authForm.confirm !== authForm.password && (
            <p style={{ color:"#ef4444", fontSize:12, marginTop:6 }}>❌ Les mots de passe ne correspondent pas</p>
          )}
          {authMode === "register" && authForm.confirm && authForm.confirm === authForm.password && (
            <p style={{ color:"#22c55e", fontSize:12, marginTop:6 }}>✅ Mots de passe identiques</p>
          )}
          {authError && <p style={{ color:"#ef4444", fontSize:13, marginTop:8 }}>{authError}</p>}
          <button onClick={handleAuth} style={{
            width:"100%", marginTop:16, padding:"12px 0", border:"none", borderRadius:8,
            background:"linear-gradient(135deg,#6366f1,#8b5cf6)", color:"#fff",
            fontWeight:700, fontSize:15, cursor:"pointer"
          }}>{authMode === "login" ? "Se connecter" : "S'inscrire"}</button>
        </div>
      </div>
    </div>
  );

  // ─── RENDER: GAME VIEW ──────────────────────────────────────────────────────
  if (page === "game" && currentGame) {
    const gameKey = currentGame;
    const game = activeGames[gameKey];
    const participants = game?.participants || [];
    const cfg = WHEEL_CONFIGS.find(w => `${w.id}_${selectedBet}` === gameKey || w.id === selectedWheel?.id);

    return (
      <div style={{ minHeight:"100vh", background:"#0f172a", fontFamily:"system-ui", color:"#f1f5f9" }}>
        <nav style={navStyle}>
          <span style={{ fontWeight:800, fontSize:18 }}>🎡 SPINNING</span>
          <button onClick={() => { setPage("lobby"); setCurrentGame(null); setGameResult(null); }} style={btnSecStyle}>← Lobby</button>
        </nav>

        <div style={{ maxWidth:600, margin:"0 auto", padding:"32px 16px" }}>
          {gameResult ? (
            <div style={{ textAlign:"center" }}>
              <div style={{ fontSize:72, marginBottom:16 }}>
                {gameResult.winner.userId === user?.id ? "🏆" : "😢"}
              </div>
              <h2 style={{ fontSize:28, color: gameResult.winner.userId === user?.id ? "#22c55e" : "#ef4444" }}>
                {gameResult.winner.userId === user?.id ? `Tu gagnes ${gameResult.payout.toFixed(2)}€ !` : `${gameResult.winner.pseudo} a gagné !`}
              </h2>
              <p style={{ color:"#64748b", marginBottom:24 }}>Mise totale: {cfg?.slots || 0} × {selectedBet}€</p>
              <button onClick={() => { setPage("lobby"); setCurrentGame(null); setGameResult(null); }} style={btnPrimStyle}>
                Rejouer
              </button>
            </div>
          ) : (
            <>
              <h2 style={{ textAlign:"center", color:"#6366f1" }}>
                Roue {cfg?.label} — Mise {selectedBet}€
              </h2>
              {gameCountdown !== null && (
                <div style={{ textAlign:"center", fontSize:48, color:"#fbbf24", fontWeight:800 }}>
                  {gameCountdown}s
                </div>
              )}
              <div style={{ display:"flex", justifyContent:"center", margin:"24px 0" }}>
                <WheelCanvas
                  participants={participants.length ? participants : [{ pseudo:"En attente...", tickets:1 }]}
                  spinning={spinning}
                  winnerIndex={winnerIdx}
                  onDone={() => {}}
                />
              </div>
              <div style={{ background:"#1e293b", borderRadius:12, padding:16 }}>
                <h3 style={{ margin:"0 0 12px", color:"#94a3b8", fontSize:14 }}>
                  Joueurs ({game?.filled || 0}/{cfg?.slots || 0})
                </h3>
                {participants.map((p, i) => (
                  <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"6px 0", borderBottom:"1px solid #0f172a" }}>
                    <span style={{ color: p.userId === user?.id ? "#6366f1" : "#e2e8f0" }}>
                      {p.isBot ? "🤖" : "👤"} {p.pseudo}
                    </span>
                    <span style={{ color:"#fbbf24" }}>{p.tickets} ticket(s)</span>
                  </div>
                ))}
              </div>
            </>
          )}
        </div>
      </div>
    );
  }

  // ─── RENDER: LOBBY ──────────────────────────────────────────────────────────
  return (
    <div style={{ minHeight:"100vh", background:"#0f172a", fontFamily:"system-ui", color:"#f1f5f9" }}>
      {/* NAV */}
      <nav style={navStyle}>
        <span style={{ fontWeight:800, fontSize:18 }}>🎡 SPINNING</span>
        <div style={{ display:"flex", gap:8, alignItems:"center" }}>
          {["lobby","wallet","friends","chat"].map(p => (
            <button key={p} onClick={() => { setPage(p); if(p==="wallet") loadWallet(); if(p==="friends") loadFriends(); }}
              style={{ ...btnSecStyle, background: page===p ? "#6366f1" : "transparent" }}>
              {p === "lobby" ? "🎡 Lobby" : p === "wallet" ? "💰 Wallet" : p === "friends" ? "👥 Amis" : "💬 Chat"}
            </button>
          ))}
          <div style={{ background:"#1e293b", borderRadius:8, padding:"6px 12px", fontSize:14 }}>
            <span style={{ color:"#64748b" }}>{user?.pseudo}</span>
            <span style={{ color:"#22c55e", fontWeight:700, marginLeft:8 }}>{(user?.balance || 0).toFixed(2)}€</span>
          </div>
          <button onClick={logout} style={{ ...btnSecStyle, color:"#ef4444" }}>Déco</button>
        </div>
      </nav>

      <div style={{ maxWidth:1200, margin:"0 auto", padding:"24px 16px" }}>

        {/* LOBBY */}
        {page === "lobby" && (
          <>
            {/* Wheel selector */}
            <h2 style={{ color:"#94a3b8", fontSize:14, textTransform:"uppercase", letterSpacing:2, marginBottom:16 }}>
              Choisir la roue
            </h2>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(200px,1fr))", gap:12, marginBottom:32 }}>
              {WHEEL_CONFIGS.map(w => {
                const gameKeys = Object.keys(activeGames).filter(k => k.startsWith(w.id + "_"));
                const totalPlayers = gameKeys.reduce((s, k) => s + (activeGames[k]?.participants?.length || 0), 0);
                const isFull = gameKeys.some(k => activeGames[k]?.filled >= activeGames[k]?.slots);
                return (
                  <div key={w.id} onClick={() => setSelectedWheel(w)} style={{
                    background: selectedWheel?.id === w.id ? "#1e3a5f" : "#1e293b",
                    border: `2px solid ${selectedWheel?.id === w.id ? w.color : "#334155"}`,
                    borderRadius:12, padding:16, cursor:"pointer", transition:"all 0.2s"
                  }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                      <span style={{ fontSize:20, fontWeight:800, color:w.color }}>{w.label}</span>
                      <span style={{ fontSize:11, color:"#64748b" }}>{w.odds}</span>
                    </div>
                    <div style={{ marginTop:8, fontSize:13, color:"#94a3b8" }}>
                      {w.slots} places
                    </div>
                    <div style={{ marginTop:6, fontSize:12, display:"flex", gap:8 }}>
                      <span style={{ color:"#22c55e" }}>🟢 {totalPlayers} joueurs</span>
                      {isFull && <span style={{ color:"#ef4444" }}>🔥 Chaud!</span>}
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Bet + join */}
            {selectedWheel && (
              <div style={{ background:"#1e293b", borderRadius:16, padding:24, marginBottom:32 }}>
                <h3 style={{ margin:"0 0 16px", color:"#e2e8f0" }}>
                  Roue {selectedWheel.label} — Gain potentiel: {(selectedWheel.slots * selectedBet * ticketCount * 0.9).toFixed(2)}€
                </h3>
                <div style={{ marginBottom:16 }}>
                  <p style={{ color:"#64748b", fontSize:13, marginBottom:8 }}>Mise par ticket</p>
                  <div style={{ display:"flex", flexWrap:"wrap", gap:8 }}>
                    {BET_AMOUNTS.filter(b => b <= (user?.balance || 0) || b === 1).map(b => (
                      <button key={b} onClick={() => setSelectedBet(b)} style={{
                        padding:"6px 14px", border:"none", borderRadius:8, cursor:"pointer",
                        background: selectedBet===b ? "#6366f1" : "#334155",
                        color: selectedBet===b ? "#fff" : "#94a3b8", fontWeight:600
                      }}>{b}€</button>
                    ))}
                  </div>
                </div>
                <div style={{ marginBottom:16 }}>
                  <p style={{ color:"#64748b", fontSize:13, marginBottom:8 }}>Nombre de tickets</p>
                  <div style={{ display:"flex", alignItems:"center", gap:12 }}>
                    <button onClick={() => setTicketCount(c => Math.max(1,c-1))} style={btnSecStyle}>-</button>
                    <span style={{ fontSize:20, fontWeight:700, minWidth:40, textAlign:"center" }}>{ticketCount}</span>
                    <button onClick={() => setTicketCount(c => Math.min(selectedWheel.slots, c+1))} style={btnSecStyle}>+</button>
                    <span style={{ color:"#64748b", fontSize:13 }}>Coût total: {ticketCount * selectedBet}€</span>
                  </div>
                </div>
                <button onClick={joinGame} disabled={ticketCount * selectedBet > (user?.balance || 0)}
                  style={{ ...btnPrimStyle, opacity: ticketCount * selectedBet > (user?.balance || 0) ? 0.5 : 1 }}>
                  🎰 Jouer — {ticketCount * selectedBet}€
                </button>
                {ticketCount * selectedBet > (user?.balance || 0) && (
                  <p style={{ color:"#ef4444", fontSize:13, marginTop:8 }}>Solde insuffisant</p>
                )}
              </div>
            )}

            {/* Active games */}
            <h2 style={{ color:"#94a3b8", fontSize:14, textTransform:"uppercase", letterSpacing:2, marginBottom:16 }}>
              Parties en cours ({Object.keys(activeGames).length})
            </h2>
            {Object.keys(activeGames).length === 0 ? (
              <div style={{ background:"#1e293b", borderRadius:16, padding:40, textAlign:"center" }}>
                <div style={{ fontSize:48, marginBottom:12 }}>🎡</div>
                <p style={{ color:"#64748b", fontSize:16 }}>Aucune partie en cours</p>
                <p style={{ color:"#475569", fontSize:13, marginTop:8 }}>Sois le premier à créer une partie en choisissant une roue et une mise !</p>
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:12 }}>
                {Object.entries(activeGames).map(([key, game]) => {
                  const w = WHEEL_CONFIGS.find(w => w.id === game.wheelId);
                  const pct = ((game.filled / game.slots) * 100).toFixed(0);
                  const placesLeft = game.slots - game.filled;
                  const isAlmostFull = placesLeft <= Math.ceil(game.slots * 0.1);
                  return (
                    <div key={key} onClick={() => { setSelectedWheel(w); setSelectedBet(game.betAmount); }}
                      style={{ background:"#1e293b", borderRadius:12, padding:16, cursor:"pointer", border:`1px solid ${isAlmostFull ? "#f97316" : "#334155"}`, transition:"border 0.2s" }}>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <span style={{ fontWeight:700, color:w?.color, fontSize:18 }}>{w?.label}</span>
                        <span style={{ fontSize:13, color:"#fbbf24", fontWeight:700 }}>{game.betAmount}€/ticket</span>
                      </div>
                      <div style={{ margin:"12px 0", background:"#0f172a", borderRadius:4, height:8 }}>
                        <div style={{ width:`${pct}%`, background: isAlmostFull ? "#f97316" : w?.color, height:"100%", borderRadius:4, transition:"width 0.5s" }} />
                      </div>
                      <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center" }}>
                        <p style={{ fontSize:12, color:"#64748b" }}>{game.filled}/{game.slots} joueurs</p>
                        {isAlmostFull && <span style={{ fontSize:11, color:"#f97316", fontWeight:700 }}>🔥 Presque plein!</span>}
                      </div>
                      <div style={{ marginTop:8 }}>
                        {game.participants?.slice(0, 5).map((p, i) => (
                          <span key={i} style={{ display:"inline-block", background:"#334155", borderRadius:4, padding:"2px 6px", fontSize:11, marginRight:4, marginBottom:4, color:"#94a3b8" }}>
                            {p.pseudo}
                          </span>
                        ))}
                        {(game.participants?.length || 0) > 5 && <span style={{ fontSize:11, color:"#475569" }}>+{game.participants.length - 5}</span>}
                      </div>
                      <button style={{ ...btnPrimStyle, width:"100%", marginTop:12, padding:"8px 0", fontSize:13 }}>
                        Rejoindre — {placesLeft} place{placesLeft > 1 ? "s" : ""} restante{placesLeft > 1 ? "s" : ""}
                      </button>
                    </div>
                  );
                })}
              </div>
            )}
          </>
        )}

        {/* WALLET */}
        {page === "wallet" && (
          <div style={{ maxWidth:600 }}>
            <h2 style={{ marginBottom:24 }}>💰 Portefeuille</h2>
            <div style={{ background:"#1e293b", borderRadius:16, padding:24, marginBottom:24, textAlign:"center" }}>
              <p style={{ color:"#64748b", marginBottom:4 }}>Solde actuel</p>
              <p style={{ fontSize:48, fontWeight:800, color:"#22c55e" }}>{(user?.balance || 0).toFixed(2)}€</p>
            </div>
            <h3 style={{ color:"#94a3b8", fontSize:13, textTransform:"uppercase", letterSpacing:2, marginBottom:12 }}>
              Historique
            </h3>
            {history.length === 0 ? (
              <p style={{ color:"#475569" }}>Aucune transaction</p>
            ) : history.map((tx, i) => (
              <div key={i} style={{ display:"flex", justifyContent:"space-between", padding:"12px 16px", background:"#1e293b", borderRadius:8, marginBottom:8 }}>
                <span style={{ color:"#94a3b8", fontSize:13 }}>{tx.description}</span>
                <span style={{ fontWeight:700, color: tx.amount > 0 ? "#22c55e" : "#ef4444" }}>
                  {tx.amount > 0 ? "+" : ""}{tx.amount.toFixed(2)}€
                </span>
              </div>
            ))}
          </div>
        )}

        {/* FRIENDS */}
        {page === "friends" && (
          <div style={{ maxWidth:500 }}>
            <h2 style={{ marginBottom:24 }}>👥 Amis</h2>
            <div style={{ display:"flex", gap:8, marginBottom:16 }}>
              <input value={friendInput} onChange={e => setFriendInput(e.target.value)}
                placeholder="Pseudo de l'ami" style={{ ...inputStyle, flex:1 }} />
              <button onClick={addFriend} style={btnPrimStyle}>Ajouter</button>
            </div>
            {friendMsg && <p style={{ color:"#22c55e", fontSize:13, marginBottom:12 }}>{friendMsg}</p>}
            {friends.length === 0 ? (
              <p style={{ color:"#475569" }}>Aucun ami pour l'instant</p>
            ) : friends.map((f, i) => (
              <div key={i} style={{ display:"flex", alignItems:"center", gap:12, padding:"12px 16px", background:"#1e293b", borderRadius:8, marginBottom:8 }}>
                <div style={{ width:36, height:36, borderRadius:"50%", background:"#6366f1", display:"flex", alignItems:"center", justifyContent:"center", fontWeight:700 }}>
                  {f.pseudo[0].toUpperCase()}
                </div>
                <span style={{ fontWeight:600 }}>{f.pseudo}</span>
              </div>
            ))}
          </div>
        )}

        {/* CHAT */}
        {page === "chat" && (
          <div style={{ maxWidth:600 }}>
            <h2 style={{ marginBottom:16 }}>💬 Chat Global</h2>
            <div style={{ background:"#1e293b", borderRadius:12, padding:16, height:400, overflowY:"auto", marginBottom:12 }}>
              {chatMessages.length === 0 && <p style={{ color:"#475569" }}>Aucun message</p>}
              {chatMessages.map((m, i) => (
                <div key={i} style={{ marginBottom:10 }}>
                  <span style={{ color:"#6366f1", fontWeight:700, fontSize:13 }}>{m.from}</span>
                  <span style={{ color:"#64748b", fontSize:11, marginLeft:8 }}>{new Date(m.ts).toLocaleTimeString()}</span>
                  <p style={{ color:"#e2e8f0", margin:"2px 0 0", fontSize:14 }}>{m.text}</p>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div style={{ display:"flex", gap:8 }}>
              <input value={chatInput} onChange={e => setChatInput(e.target.value)}
                onKeyDown={e => e.key === "Enter" && sendChat()}
                placeholder="Votre message..." style={{ ...inputStyle, flex:1 }} />
              <button onClick={sendChat} style={btnPrimStyle}>Envoyer</button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ─── STYLES ──────────────────────────────────────────────────────────────────
const inputStyle = {
  width:"100%", padding:"10px 14px", background:"#0f172a", border:"1px solid #334155",
  borderRadius:8, color:"#f1f5f9", fontSize:15, boxSizing:"border-box", outline:"none",
};
const navStyle = {
  background:"#1e293b", borderBottom:"1px solid #334155", padding:"12px 24px",
  display:"flex", justifyContent:"space-between", alignItems:"center", flexWrap:"wrap", gap:8,
};
const btnPrimStyle = {
  padding:"10px 20px", background:"linear-gradient(135deg,#6366f1,#8b5cf6)",
  border:"none", borderRadius:8, color:"#fff", fontWeight:700, cursor:"pointer", fontSize:14,
};
const btnSecStyle = {
  padding:"8px 16px", background:"transparent", border:"1px solid #334155",
  borderRadius:8, color:"#94a3b8", cursor:"pointer", fontSize:13,
};
