import { useState, useEffect, useRef, useCallback } from "react";

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

function generateBots(count) {
  const names = ["CryptoKing","LuckyAce","WheelMaster","BigBet","GoldRush","NeonRider","StarDust","IronFist","SilverFox","DiamondHands"];
  return Array.from({ length: count }, (_, i) => ({
    id: "bot_" + i,
    pseudo: names[i % names.length] + Math.floor(Math.random()*99),
    isBot: true,
    avatar: COLORS[i % COLORS.length],
  }));
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

  const drawWheel = useCallback((angle) => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext("2d");
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;
    const r = cx - 10;
    ctx.clearRect(0, 0, canvas.width, canvas.height);

    let startAngle = angle;
    segments.forEach((seg) => {
      const sliceAngle = seg.pct * 2 * Math.PI;
      ctx.beginPath();
      ctx.moveTo(cx, cy);
      ctx.arc(cx, cy, r, startAngle, startAngle + sliceAngle);
      ctx.closePath();
      ctx.fillStyle = seg.color;
      ctx.fill();
      ctx.strokeStyle = "#0f172a";
      ctx.lineWidth = 2;
      ctx.stroke();

      // label
      if (seg.pct > 0.04) {
        ctx.save();
        ctx.translate(cx, cy);
        ctx.rotate(startAngle + sliceAngle / 2);
        ctx.textAlign = "right";
        ctx.fillStyle = "#fff";
        ctx.font = "bold 12px 'DM Sans', sans-serif";
        ctx.fillText(seg.label.slice(0, 10), r - 8, 4);
        ctx.restore();
      }
      startAngle += sliceAngle;
    });

    // center circle
    ctx.beginPath();
    ctx.arc(cx, cy, 22, 0, 2 * Math.PI);
    ctx.fillStyle = "#0f172a";
    ctx.fill();
    ctx.strokeStyle = "#334155";
    ctx.lineWidth = 3;
    ctx.stroke();

    // pointer
    ctx.beginPath();
    ctx.moveTo(canvas.width - 6, cy - 12);
    ctx.lineTo(canvas.width - 6, cy + 12);
    ctx.lineTo(canvas.width - 32, cy);
    ctx.closePath();
    ctx.fillStyle = "#f8fafc";
    ctx.fill();
  }, [segments]);

  useEffect(() => {
    if (!spinning) {
      drawWheel(0);
      return;
    }
    const totalTickets = participants.reduce((s, p) => s + p.tickets, 0);
    let cumulative = 0;
    for (let i = 0; i < winnerIndex; i++) cumulative += participants[i].tickets;
    const winnerMid = (cumulative + participants[winnerIndex].tickets / 2) / totalTickets;
    // We want pointer (at 0 rad = right) to land at winnerMid
    const targetAngle = -winnerMid * 2 * Math.PI + Math.PI; // offset so pointer hits winner

    const duration = 4000;
    const spins = 5;
    const start = performance.now();
    const startA = angleRef.current;

    const animate = (now) => {
      const t = Math.min((now - start) / duration, 1);
      const ease = 1 - Math.pow(1 - t, 4);
      const currentAngle = startA + (spins * 2 * Math.PI + targetAngle - startA) * ease;
      angleRef.current = currentAngle;
      drawWheel(currentAngle);
      if (t < 1) {
        animRef.current = requestAnimationFrame(animate);
      } else {
        onDone && onDone();
      }
    };
    animRef.current = requestAnimationFrame(animate);
    return () => cancelAnimationFrame(animRef.current);
  }, [spinning]);

  useEffect(() => {
    if (!spinning) drawWheel(angleRef.current);
  }, [segments]);

  return (
    <div style={{ position: "relative", display: "inline-block" }}>
      <canvas ref={canvasRef} width={300} height={300} style={{ borderRadius: "50%", boxShadow: "0 0 40px rgba(99,102,241,0.3)" }} />
    </div>
  );
}

// ─── MAIN APP ─────────────────────────────────────────────────────────────────
export default function App() {
  const [screen, setScreen] = useState("auth"); // auth | lobby | game | chat | wallet | friends
  const [authMode, setAuthMode] = useState("login");
  const [users, setUsers] = useState([
    { id: "demo", pseudo: "DemoUser", password: "demo123", balance: 1000, friends: [], history: [] },
  ]);
  const [currentUser, setCurrentUser] = useState(null);
  const [authForm, setAuthForm] = useState({ pseudo: "DemoUser", password: "demo123", confirm: "" });
  const [authError, setAuthError] = useState("");

  // Game state
  const [selectedWheel, setSelectedWheel] = useState(null);
  const [selectedBet, setSelectedBet] = useState(null);
  const [ticketCount, setTicketCount] = useState(1);
  const [activeGames, setActiveGames] = useState({});
  const [pityCounters, setPityCounters] = useState({}); // key: wheelId_betAmount → loss streak
  const [gameResult, setGameResult] = useState(null);
  const [spinning, setSpinning] = useState(false);
  const [winnerIdx, setWinnerIdx] = useState(0);
  const [waitingCountdown, setWaitingCountdown] = useState(null); // seconds remaining before spin

  // Pre-populate some random active games on mount
  useEffect(() => {
    const initial = {};
    WHEEL_CONFIGS.forEach(w => {
      BET_AMOUNTS.forEach(bet => {
        if (Math.random() < 0.3) { // 30% chance a game exists for this wheel/bet combo
          const key = `${w.id}_${bet}`;
          const botCount = Math.floor(Math.random() * 5) + 1;
          const bots = generateBots(botCount);
          // Random fill between 10% and 95%
          const fillPct = 0.10 + Math.random() * 0.85;
          const filled = Math.max(botCount, Math.floor(w.slots * fillPct));
          const slotsPerBot = Math.ceil(filled / botCount);
          initial[key] = {
            key, wheelId: w.id, betAmount: bet, slots: w.slots,
            participants: bots.map(b => ({ ...b, tickets: slotsPerBot })),
            filled: Math.min(filled, w.slots - 1),
          };
        }
      });
    });
    setActiveGames(initial);
  }, []);

  // Chat
  const [chatMessages, setChatMessages] = useState([
    { id: 1, from: "System", text: "Bienvenue sur Spinning! 🎰", ts: Date.now() },
  ]);
  const [chatInput, setChatInput] = useState("");
  const [chatTarget, setChatTarget] = useState("global");

  // Friends
  const [friendSearch, setFriendSearch] = useState("");
  const [friendMsg, setFriendMsg] = useState("");

  const chatEndRef = useRef(null);

  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [chatMessages]);

  // ── AUTH ──
  const handleAuth = () => {
    setAuthError("");
    if (authMode === "login") {
      const u = users.find(u => u.pseudo === authForm.pseudo && u.password === authForm.password);
      if (!u) return setAuthError("Pseudo ou mot de passe incorrect");
      setCurrentUser(u);
      setScreen("lobby");
    } else {
      if (!authForm.pseudo || !authForm.password) return setAuthError("Remplis tous les champs");
      if (authForm.password !== authForm.confirm) return setAuthError("Mots de passe différents");
      if (users.find(u => u.pseudo === authForm.pseudo)) return setAuthError("Pseudo déjà pris");
      const newUser = { id: generateId(), pseudo: authForm.pseudo, password: authForm.password, balance: 500, friends: [], history: [] };
      setUsers(prev => [...prev, newUser]);
      setCurrentUser(newUser);
      setScreen("lobby");
    }
  };

  const updateUser = (updater) => {
    setCurrentUser(prev => {
      const updated = updater(prev);
      setUsers(us => us.map(u => u.id === updated.id ? updated : u));
      return updated;
    });
  };

  // ── GAME ──
  const openWheel = (wheel) => {
    setSelectedWheel(wheel);
    setSelectedBet(null);
    setTicketCount(1);
    setGameResult(null);
    setScreen("game");
  };

  const getGame = (wheelId, betAmount) => {
    const key = `${wheelId}_${betAmount}`;
    if (!activeGames[key]) {
      const cfg = WHEEL_CONFIGS.find(w => w.id === wheelId);
      const bots = generateBots(Math.min(cfg.slots - 1, 5));
      const game = {
        key,
        wheelId,
        betAmount,
        slots: cfg.slots,
        participants: bots.map(b => ({
          ...b,
          tickets: Math.max(1, Math.floor(Math.random() * Math.ceil(cfg.slots / bots.length))),
        })),
        filled: bots.reduce((s, b) => s + Math.max(1, Math.floor(Math.random() * 3)), 0),
      };
      game.filled = Math.min(game.filled, cfg.slots - 1);
      setActiveGames(prev => ({ ...prev, [key]: game }));
      return game;
    }
    return activeGames[key];
  };

  const joinGame = () => {
    if (!selectedBet || !selectedWheel) return;
    const totalCost = ticketCount * selectedBet;
    if (currentUser.balance < totalCost) return alert("Solde insuffisant !");

    const key = `${selectedWheel.id}_${selectedBet}`;
    const game = getGame(selectedWheel.id, selectedBet);
    const remaining = selectedWheel.slots - game.filled;
    const actualTickets = Math.min(ticketCount, remaining - 1, remaining);

    if (actualTickets <= 0) return alert("Plus de places disponibles !");

    const updatedGame = {
      ...game,
      participants: [...game.participants, { id: currentUser.id, pseudo: currentUser.pseudo, tickets: actualTickets, isBot: false }],
      filled: game.filled + actualTickets,
    };

    updateUser(u => ({ ...u, balance: u.balance - actualTickets * selectedBet }));

    // Fill remaining with bots after random delay 5-15s
    const botSlots = selectedWheel.slots - updatedGame.filled;
    const extraBots = generateBots(Math.min(Math.max(botSlots, 1), 8));
    const withBots = {
      ...updatedGame,
      participants: [...updatedGame.participants, ...extraBots.map(b => ({ ...b, tickets: Math.ceil(botSlots / extraBots.length) }))],
      filled: selectedWheel.slots,
      betAmount: selectedBet,
    };
    setActiveGames(prev => ({ ...prev, [key]: withBots }));

    const delay = 5000 + Math.random() * 10000; // 5s to 15s
    const delaySeconds = Math.ceil(delay / 1000);
    setWaitingCountdown(delaySeconds);
    const countdownInterval = setInterval(() => {
      setWaitingCountdown(prev => {
        if (prev <= 1) { clearInterval(countdownInterval); return null; }
        return prev - 1;
      });
    }, 1000);
    setTimeout(() => launchSpin(withBots, key, actualTickets * selectedBet), delay);
  };

  const launchSpin = (game, key, playerCost) => {
    const pityKey = key;
    const lossStreak = pityCounters[pityKey] || 0;

    const participants = game.participants;
    const totalTickets = participants.reduce((s, p) => s + p.tickets, 0);
    const playerEntry = participants.find(p => p.id === currentUser?.id);

    if (!playerEntry) {
      // No player, just pick random
      const rand = Math.random() * totalTickets;
      let cum = 0, wIdx = 0;
      for (let i = 0; i < participants.length; i++) {
        cum += participants[i].tickets;
        if (rand <= cum) { wIdx = i; break; }
      }
      setWinnerIdx(wIdx);
      setSpinning(true);
      setGameResult({ pending: true, game, winnerIdx: wIdx, playerCost });
      return;
    }

    // Pity system (hidden from user):
    // Chaque ticket perdu = +1% de bonus de chance pour ce joueur
    // On calcule le score pondéré de chaque participant: tickets × (1 + pity*0.01)
    // Puis on tire au sort proportionnellement à ces scores

    // Pour les bots, on leur attribue un pity aléatoire simulé (0-5 pertes)
    const weightedParticipants = participants.map(p => {
      let pity = 0;
      if (p.id === currentUser?.id) {
        // Pity divisé par le nombre de tickets pris (plus tu prends de tickets, moins le bonus par ticket compte)
        pity = p.tickets > 0 ? lossStreak / p.tickets : lossStreak;
      } else {
        pity = Math.floor(Math.random() * 6); // bots: 0-5 pertes simulées
      }
      const weight = p.tickets * (1 + pity * 0.01);
      return { ...p, weight };
    });

    const totalWeight = weightedParticipants.reduce((s, p) => s + p.weight, 0);
    const rand2 = Math.random() * totalWeight;
    let cum2 = 0;
    let wIdx = 0;
    for (let i = 0; i < weightedParticipants.length; i++) {
      cum2 += weightedParticipants[i].weight;
      if (rand2 <= cum2) { wIdx = i; break; }
    }
    const finalProb = weightedParticipants.find(p => p.id === currentUser?.id)?.weight / totalWeight || 0;
    const playerWins = weightedParticipants[wIdx].id === currentUser?.id;

    setWinnerIdx(wIdx);
    setSpinning(true);
    setGameResult({ pending: true, game, winnerIdx: wIdx, playerCost, playerWins, pityKey, lossStreak });
  };

  const onSpinDone = () => {
    setSpinning(false);
    const { game, winnerIdx: wIdx, playerCost, pityKey } = gameResult;
    const winner = game.participants[wIdx];
    const pot = game.slots * game.betAmount;
    const payout = pot * 0.9;
    const isWinner = winner.id === currentUser.id;

    // Update pity counter: reset on win, add tickets lost on loss
    // pityKey might be undefined if playerEntry wasn't found, guard it
    if (pityKey) {
      const myTickets = game.participants.find(p => p.id === currentUser?.id)?.tickets || 1;
      setPityCounters(prev => ({
        ...prev,
        // Chaque ticket perdu = +1% → on accumule le nb de tickets perdus
        [pityKey]: isWinner ? 0 : (prev[pityKey] || 0) + myTickets,
      }));
    }

    if (isWinner) {
      updateUser(u => ({
        ...u,
        balance: u.balance + payout,
        history: [{ id: generateId(), type: "win", amount: payout, desc: `Gagné roue ${selectedWheel?.label}`, ts: Date.now() }, ...u.history],
      }));
    } else {
      updateUser(u => ({
        ...u,
        history: [{ id: generateId(), type: "loss", amount: -playerCost, desc: `Perdu roue ${selectedWheel?.label}`, ts: Date.now() }, ...u.history],
      }));
    }

    setGameResult({ ...gameResult, pending: false, winner, payout, isWinner });
    const key = `${game.wheelId}_${game.betAmount}`;
    setActiveGames(prev => { const n = { ...prev }; delete n[key]; return n; });
  };

  const sendChat = () => {
    if (!chatInput.trim()) return;
    setChatMessages(prev => [...prev, { id: Date.now(), from: currentUser.pseudo, text: chatInput, ts: Date.now() }]);
    setChatInput("");
  };

  const addFriend = (pseudo) => {
    const target = users.find(u => u.pseudo === pseudo && u.id !== currentUser.id);
    if (!target) return setFriendMsg("Utilisateur introuvable");
    if (currentUser.friends.includes(target.id)) return setFriendMsg("Déjà ami !");
    updateUser(u => ({ ...u, friends: [...u.friends, target.id] }));
    setFriendMsg(`${pseudo} ajouté !`);
  };

  const friendUsers = currentUser ? users.filter(u => currentUser.friends.includes(u.id)) : [];

  // ── RENDER ──

  const styles = {
    app: { minHeight: "100vh", background: "#f8fafc", fontFamily: "'DM Sans', 'Segoe UI', sans-serif", color: "#0f172a" },
    card: { background: "#fff", borderRadius: 16, boxShadow: "0 2px 20px rgba(0,0,0,0.08)", padding: 24 },
    btn: { background: "#6366f1", color: "#fff", border: "none", borderRadius: 10, padding: "10px 22px", fontWeight: 700, cursor: "pointer", fontSize: 14, transition: "all 0.15s" },
    btnGray: { background: "#e2e8f0", color: "#475569", border: "none", borderRadius: 10, padding: "10px 22px", fontWeight: 600, cursor: "pointer", fontSize: 14 },
    input: { border: "2px solid #e2e8f0", borderRadius: 10, padding: "10px 14px", fontSize: 14, width: "100%", outline: "none", boxSizing: "border-box", fontFamily: "inherit" },
    nav: { display: "flex", gap: 8, background: "#fff", padding: "12px 24px", boxShadow: "0 2px 8px rgba(0,0,0,0.06)", position: "sticky", top: 0, zIndex: 100, alignItems: "center" },
    navBtn: (active) => ({ background: active ? "#6366f1" : "transparent", color: active ? "#fff" : "#64748b", border: "none", borderRadius: 8, padding: "8px 16px", fontWeight: 600, cursor: "pointer", fontSize: 13 }),
    tag: (color) => ({ background: color + "22", color, borderRadius: 6, padding: "2px 8px", fontSize: 12, fontWeight: 700 }),
    badge: { background: "#6366f1", color: "#fff", borderRadius: 99, padding: "2px 8px", fontSize: 11, fontWeight: 700 },
  };

  // AUTH SCREEN
  if (screen === "auth") {
    return (
      <div style={{ ...styles.app, display: "flex", alignItems: "center", justifyContent: "center", background: "linear-gradient(135deg,#f0f4ff 0%,#fdf4ff 100%)" }}>
        <div style={{ ...styles.card, width: 380, padding: 40 }}>
          <div style={{ textAlign: "center", marginBottom: 32 }}>
            <div style={{ fontSize: 40, marginBottom: 8 }}>🎡</div>
            <h1 style={{ margin: 0, fontSize: 28, fontWeight: 800, letterSpacing: -1 }}>Spinning</h1>
            <p style={{ color: "#94a3b8", margin: "4px 0 0", fontSize: 14 }}>La roue de la fortune crypto</p>
          </div>

          <div style={{ display: "flex", gap: 8, marginBottom: 24, background: "#f1f5f9", borderRadius: 10, padding: 4 }}>
            {["login", "register"].map(m => (
              <button key={m} onClick={() => setAuthMode(m)} style={{ flex: 1, border: "none", borderRadius: 8, padding: "8px 0", fontWeight: 700, cursor: "pointer", fontSize: 13, background: authMode === m ? "#fff" : "transparent", color: authMode === m ? "#6366f1" : "#64748b", boxShadow: authMode === m ? "0 1px 4px rgba(0,0,0,0.1)" : "none" }}>
                {m === "login" ? "Connexion" : "Inscription"}
              </button>
            ))}
          </div>

          <div style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            <input style={styles.input} placeholder="Pseudo" value={authForm.pseudo} onChange={e => setAuthForm(f => ({ ...f, pseudo: e.target.value }))} />
            <input style={styles.input} type="password" placeholder="Mot de passe" value={authForm.password} onChange={e => setAuthForm(f => ({ ...f, password: e.target.value }))} />
            {authMode === "register" && <input style={styles.input} type="password" placeholder="Confirmer mot de passe" value={authForm.confirm} onChange={e => setAuthForm(f => ({ ...f, confirm: e.target.value }))} />}
            {authError && <p style={{ color: "#ef4444", fontSize: 13, margin: 0 }}>{authError}</p>}
            <button style={{ ...styles.btn, padding: "12px 0", fontSize: 15 }} onClick={handleAuth}>
              {authMode === "login" ? "Se connecter" : "Créer mon compte"}
            </button>
          </div>

          <p style={{ textAlign: "center", color: "#94a3b8", fontSize: 12, marginTop: 20 }}>
            Démo: pseudo <b>DemoUser</b> / mdp <b>demo123</b> · Solde 1000€
          </p>
        </div>
      </div>
    );
  }

  return (
    <div style={styles.app}>
      {/* NAV */}
      <div style={styles.nav}>
        <div style={{ fontSize: 22, marginRight: 8 }}>🎡</div>
        <span style={{ fontWeight: 800, fontSize: 18, letterSpacing: -0.5, marginRight: 16 }}>Spinning</span>
        {[["lobby","🏠 Lobby"],["wallet","💰 Portefeuille"],["friends","👥 Amis"],["chat","💬 Chat"]].map(([s, label]) => (
          <button key={s} onClick={() => setScreen(s)} style={styles.navBtn(screen === s)}>{label}</button>
        ))}
        <div style={{ marginLeft: "auto", display: "flex", alignItems: "center", gap: 12 }}>
          <div style={{ background: "#f0fdf4", border: "2px solid #86efac", borderRadius: 10, padding: "6px 14px", fontWeight: 700, color: "#16a34a", fontSize: 14 }}>
            💎 {currentUser?.balance?.toFixed(2)} €
          </div>
          <div style={{ width: 34, height: 34, borderRadius: "50%", background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800, fontSize: 14 }}>
            {currentUser?.pseudo?.[0]?.toUpperCase()}
          </div>
          <button style={styles.btnGray} onClick={() => { setCurrentUser(null); setScreen("auth"); }}>Déco</button>
        </div>
      </div>

      {/* LOBBY */}
      {screen === "lobby" && (
        <div style={{ maxWidth: 1100, margin: "0 auto", padding: "32px 16px" }}>
          <h2 style={{ fontWeight: 800, fontSize: 24, marginBottom: 8 }}>Choisir une Roue</h2>
          <p style={{ color: "#64748b", marginBottom: 24 }}>Plus la fraction est petite, plus les gains sont élevés — mais moins tu as de chances de gagner.</p>

          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 16 }}>
            {WHEEL_CONFIGS.map(w => {
              const wheelGames = Object.values(activeGames).filter(g => g.wheelId === w.id);
              const totalPlayers = wheelGames.reduce((s, g) => s + g.participants.length, 0);
              const waitingGames = wheelGames.length;
              const almostFullGames = wheelGames.filter(g => (w.slots - g.filled) / w.slots < 0.10).length;
              return (
                <div key={w.id} onClick={() => openWheel(w)} style={{ ...styles.card, cursor: "pointer", borderTop: `4px solid ${w.color}`, transition: "transform 0.15s, box-shadow 0.15s", padding: 20 }}
                  onMouseEnter={e => { e.currentTarget.style.transform = "translateY(-4px)"; e.currentTarget.style.boxShadow = "0 8px 30px rgba(0,0,0,0.13)"; }}
                  onMouseLeave={e => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 20px rgba(0,0,0,0.08)"; }}>

                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: 8 }}>
                    <div style={{ fontSize: 32 }}>🎡</div>
                    {totalPlayers > 0 && (
                      <div style={{ display: "flex", alignItems: "center", gap: 4, background: "#f0fdf4", border: "1px solid #86efac", borderRadius: 8, padding: "3px 8px" }}>
                        <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#22c55e" }} />
                        <span style={{ fontSize: 12, fontWeight: 700, color: "#16a34a" }}>{totalPlayers} joueur{totalPlayers > 1 ? "s" : ""}</span>
                      </div>
                    )}
                  </div>

                  <div style={{ fontWeight: 800, fontSize: 22 }}>{w.label}</div>
                  <div style={styles.tag(w.color)}>{w.odds} de gain</div>
                  <div style={{ color: "#94a3b8", fontSize: 13, marginTop: 8 }}>{w.slots} places max</div>

                  {almostFullGames > 0 && (
                    <div style={{ marginTop: 10, padding: "6px 10px", background: "#fff7ed", border: "1px solid #fed7aa", borderRadius: 10, display: "flex", alignItems: "center", gap: 6 }}>
                      <span>🔥</span>
                      <span style={{ fontSize: 12, fontWeight: 700, color: "#ea580c" }}>{almostFullGames} bientôt pleine{almostFullGames > 1 ? "s" : ""} !</span>
                    </div>
                  )}

                  <button style={{ ...styles.btn, marginTop: 12, width: "100%", padding: "8px 0", background: w.color }}>Jouer</button>
                </div>
              );
            })}
          </div>
        </div>
      )}

      {/* GAME */}
      {screen === "game" && selectedWheel && (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "32px 16px" }}>
          <button style={styles.btnGray} onClick={() => { setScreen("lobby"); setGameResult(null); setSpinning(false); }}>← Retour</button>

          <h2 style={{ fontWeight: 800, fontSize: 24, margin: "20px 0 4px" }}>Roue {selectedWheel.label}</h2>
          <p style={{ color: "#64748b", marginBottom: 24 }}>{selectedWheel.slots} participants · {selectedWheel.odds} de chance de gagner</p>

          {!selectedBet ? (
            <>
              <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Choisir la mise par ticket</h3>
              <div style={{ display: "flex", flexWrap: "wrap", gap: 10 }}>
                {BET_AMOUNTS.map(b => (
                  <button key={b} onClick={() => setSelectedBet(b)}
                    style={{ ...styles.btn, background: "#f1f5f9", color: "#0f172a", border: "2px solid #e2e8f0", padding: "12px 20px", fontSize: 15, fontWeight: 700 }}
                    onMouseEnter={e => e.currentTarget.style.background = "#6366f1" + "22"}
                    onMouseLeave={e => e.currentTarget.style.background = "#f1f5f9"}>
                    {b} €
                  </button>
                ))}
              </div>
            </>
          ) : (
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 24 }}>
              {/* LEFT: wheel */}
              <div style={styles.card}>
                <div style={{ textAlign: "center", marginBottom: 16 }}>
                  {(() => {
                    const game = getGame(selectedWheel.id, selectedBet);
                    const allParticipants = gameResult?.game?.participants || [...game.participants, { id: currentUser.id, pseudo: currentUser.pseudo, tickets: ticketCount, isBot: false }];
                    return (
                      <>
                        <WheelCanvas
                          participants={allParticipants}
                          spinning={spinning}
                          winnerIndex={winnerIdx}
                          onDone={onSpinDone}
                        />
                        {gameResult && !gameResult.pending && (
                          <div style={{ marginTop: 16, padding: 16, background: gameResult.isWinner ? "#f0fdf4" : "#fff1f2", borderRadius: 12, border: `2px solid ${gameResult.isWinner ? "#86efac" : "#fecaca"}` }}>
                            {gameResult.isWinner
                              ? <><div style={{ fontSize: 28 }}>🏆</div><div style={{ fontWeight: 800, color: "#16a34a", fontSize: 18 }}>Tu as gagné {gameResult.payout.toFixed(2)} €!</div></>
                              : <><div style={{ fontSize: 28 }}>😢</div><div style={{ fontWeight: 800, color: "#dc2626", fontSize: 16 }}>Gagné par {gameResult.winner.pseudo}</div></>
                            }
                            <button style={{ ...styles.btn, marginTop: 12 }} onClick={() => { setSelectedBet(null); setGameResult(null); }}>Rejouer</button>
                          </div>
                        )}
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* RIGHT: join */}
              <div style={{ display: "flex", flexDirection: "column", gap: 16 }}>
                <div style={styles.card}>
                  <h3 style={{ margin: "0 0 12px", fontWeight: 700 }}>Ta participation</h3>
                  <div style={{ color: "#64748b", fontSize: 13, marginBottom: 12 }}>Mise: <b>{selectedBet} €</b> par ticket · Cagnotte totale: <b>{(selectedBet * selectedWheel.slots * 0.9).toFixed(0)} €</b> (après 10% commission)</div>

                  <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
                    <button style={{ ...styles.btnGray, padding: "8px 16px", fontSize: 18, lineHeight: 1 }} onClick={() => setTicketCount(t => Math.max(1, t - 1))}>−</button>
                    <input
                      type="number"
                      min={1}
                      max={selectedWheel.slots - 1}
                      value={ticketCount}
                      onChange={e => {
                        const val = parseInt(e.target.value) || 1;
                        setTicketCount(Math.min(Math.max(1, val), selectedWheel.slots - 1));
                      }}
                      style={{
                        border: "2px solid #e2e8f0",
                        borderRadius: 10,
                        textAlign: "center",
                        fontWeight: 800,
                        fontFamily: "inherit",
                        outline: "none",
                        background: "#f8fafc",
                        color: "#0f172a",
                        transition: "font-size 0.15s, width 0.15s",
                        fontSize: ticketCount >= 100 ? 16 : ticketCount >= 10 ? 20 : 26,
                        width: ticketCount >= 1000 ? 80 : ticketCount >= 100 ? 68 : ticketCount >= 10 ? 58 : 52,
                        padding: "6px 4px",
                        MozAppearance: "textfield",
                      }}
                    />
                    <button style={{ ...styles.btnGray, padding: "8px 16px", fontSize: 18, lineHeight: 1 }} onClick={() => setTicketCount(t => Math.min(t + 1, selectedWheel.slots - 1))}>+</button>
                    <span style={{ color: "#94a3b8", fontSize: 13 }}>tickets</span>
                  </div>

                  <div style={{ background: "#f8fafc", borderRadius: 10, padding: 12, marginBottom: 12 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13 }}>
                      <span>Coût total</span><b>{(ticketCount * selectedBet).toFixed(2)} €</b>
                    </div>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 13, marginTop: 4 }}>
                      <span>Tes chances</span><b>{((ticketCount / selectedWheel.slots) * 100).toFixed(2)}%</b>
                    </div>
                  </div>

                  {waitingCountdown !== null && !spinning && (
                    <div style={{ background: "#fffbeb", border: "2px solid #fde68a", borderRadius: 10, padding: "10px 14px", marginBottom: 10, display: "flex", alignItems: "center", gap: 10 }}>
                      <div style={{ fontSize: 20 }}>⏳</div>
                      <div>
                        <div style={{ fontWeight: 700, fontSize: 13, color: "#92400e" }}>Remplissage en cours...</div>
                        <div style={{ fontSize: 12, color: "#b45309" }}>Lancement dans <b>{waitingCountdown}s</b></div>
                      </div>
                    </div>
                  )}
                  <button style={{ ...styles.btn, width: "100%", padding: "12px 0", opacity: waitingCountdown !== null || spinning ? 0.6 : 1 }} onClick={joinGame} disabled={spinning || waitingCountdown !== null}>
                    {spinning ? "🎡 Roue en cours..." : waitingCountdown !== null ? `⏳ Lancement dans ${waitingCountdown}s` : `Rejoindre — ${(ticketCount * selectedBet).toFixed(2)} €`}
                  </button>
                  <button style={{ ...styles.btnGray, width: "100%", padding: "10px 0", marginTop: 8 }} onClick={() => setSelectedBet(null)}>Changer la mise</button>
                </div>

                {/* Participants */}
                <div style={styles.card}>
                  <h3 style={{ margin: "0 0 12px", fontWeight: 700 }}>Participants</h3>
                  {(() => {
                    const game = getGame(selectedWheel.id, selectedBet);
                    const totalT = game.participants.reduce((s, p) => s + p.tickets, 0);
                    return (
                      <>
                        <div style={{ marginBottom: 8 }}>
                          <div style={{ height: 8, background: "#e2e8f0", borderRadius: 4, overflow: "hidden" }}>
                            <div style={{ height: "100%", width: `${(game.filled / selectedWheel.slots) * 100}%`, background: "#6366f1", borderRadius: 4, transition: "width 0.5s" }} />
                          </div>
                          <div style={{ fontSize: 12, color: "#94a3b8", marginTop: 4 }}>{game.filled}/{selectedWheel.slots} places</div>
                        </div>
                        <div style={{ display: "flex", flexDirection: "column", gap: 6, maxHeight: 160, overflowY: "auto" }}>
                          {game.participants.map((p, i) => (
                            <div key={p.id} style={{ display: "flex", alignItems: "center", gap: 8, fontSize: 13 }}>
                              <div style={{ width: 24, height: 24, borderRadius: "50%", background: COLORS[i % COLORS.length], display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontSize: 10, fontWeight: 700 }}>
                                {p.pseudo[0]}
                              </div>
                              <span style={{ flex: 1, fontWeight: p.id === currentUser?.id ? 700 : 400 }}>{p.pseudo}</span>
                              <span style={{ color: "#94a3b8" }}>{p.tickets}t</span>
                              <span style={{ ...styles.tag("#6366f1") }}>{((p.tickets / totalT) * 100).toFixed(1)}%</span>
                            </div>
                          ))}
                        </div>
                      </>
                    );
                  })()}
                </div>
              </div>
            </div>
          )}
        </div>
      )}

      {/* WALLET */}
      {screen === "wallet" && (
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 16px" }}>
          <h2 style={{ fontWeight: 800, fontSize: 24, marginBottom: 24 }}>Mon Portefeuille</h2>
          <div style={{ ...styles.card, background: "linear-gradient(135deg,#6366f1,#8b5cf6)", color: "#fff", marginBottom: 24 }}>
            <div style={{ fontSize: 13, opacity: 0.8 }}>Solde disponible</div>
            <div style={{ fontSize: 48, fontWeight: 800, margin: "8px 0" }}>💎 {currentUser.balance.toFixed(2)} €</div>
            <div style={{ fontSize: 13, opacity: 0.7 }}>Crypto simulé · {currentUser.pseudo}</div>
          </div>

          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 24 }}>
            <div style={styles.card}>
              <div style={{ fontSize: 13, color: "#64748b" }}>Parties jouées</div>
              <div style={{ fontSize: 28, fontWeight: 800 }}>{currentUser.history.length}</div>
            </div>
            <div style={styles.card}>
              <div style={{ fontSize: 13, color: "#64748b" }}>Total gagné</div>
              <div style={{ fontSize: 28, fontWeight: 800, color: "#16a34a" }}>
                {currentUser.history.filter(h => h.type === "win").reduce((s, h) => s + h.amount, 0).toFixed(2)} €
              </div>
            </div>
          </div>

          <div style={styles.card}>
            <h3 style={{ fontWeight: 700, marginBottom: 16 }}>Historique</h3>
            {currentUser.history.length === 0
              ? <p style={{ color: "#94a3b8", textAlign: "center" }}>Aucune transaction</p>
              : currentUser.history.map(h => (
                <div key={h.id} style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <div>
                    <div style={{ fontWeight: 600, fontSize: 14 }}>{h.desc}</div>
                    <div style={{ color: "#94a3b8", fontSize: 12 }}>{new Date(h.ts).toLocaleString("fr-FR")}</div>
                  </div>
                  <div style={{ fontWeight: 800, color: h.type === "win" ? "#16a34a" : "#ef4444" }}>
                    {h.type === "win" ? "+" : ""}{h.amount.toFixed(2)} €
                  </div>
                </div>
              ))
            }
          </div>
        </div>
      )}

      {/* FRIENDS */}
      {screen === "friends" && (
        <div style={{ maxWidth: 600, margin: "0 auto", padding: "32px 16px" }}>
          <h2 style={{ fontWeight: 800, fontSize: 24, marginBottom: 24 }}>Amis</h2>

          <div style={{ ...styles.card, marginBottom: 20 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Ajouter un ami</h3>
            <div style={{ display: "flex", gap: 10 }}>
              <input style={{ ...styles.input }} placeholder="Pseudo exact..." value={friendSearch} onChange={e => setFriendSearch(e.target.value)} />
              <button style={styles.btn} onClick={() => { addFriend(friendSearch); setFriendSearch(""); }}>Ajouter</button>
            </div>
            {friendMsg && <p style={{ color: "#6366f1", fontWeight: 600, margin: "8px 0 0", fontSize: 13 }}>{friendMsg}</p>}
          </div>

          <div style={styles.card}>
            <h3 style={{ fontWeight: 700, marginBottom: 12 }}>Mes amis ({friendUsers.length})</h3>
            {friendUsers.length === 0
              ? <p style={{ color: "#94a3b8", textAlign: "center" }}>Ajoute des amis !</p>
              : friendUsers.map(u => (
                <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 0", borderBottom: "1px solid #f1f5f9" }}>
                  <div style={{ width: 40, height: 40, borderRadius: "50%", background: "#6366f1", display: "flex", alignItems: "center", justifyContent: "center", color: "#fff", fontWeight: 800 }}>
                    {u.pseudo[0].toUpperCase()}
                  </div>
                  <div style={{ flex: 1 }}>
                    <div style={{ fontWeight: 700 }}>{u.pseudo}</div>
                    <div style={{ color: "#94a3b8", fontSize: 12 }}>En ligne</div>
                  </div>
                  <button style={{ ...styles.btn, padding: "6px 14px", fontSize: 12 }} onClick={() => { setChatTarget(u.pseudo); setScreen("chat"); }}>
                    💬 Message
                  </button>
                </div>
              ))
            }
          </div>

          <div style={{ ...styles.card, marginTop: 20 }}>
            <h3 style={{ fontWeight: 700, marginBottom: 8 }}>Joueurs ({users.length})</h3>
            {users.filter(u => u.id !== currentUser.id).map(u => (
              <div key={u.id} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: "1px solid #f1f5f9" }}>
                <div style={{ width: 32, height: 32, borderRadius: "50%", background: "#e2e8f0", display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 700, fontSize: 13 }}>
                  {u.pseudo[0].toUpperCase()}
                </div>
                <span style={{ flex: 1, fontSize: 14 }}>{u.pseudo}</span>
                {!currentUser.friends.includes(u.id) && (
                  <button style={{ ...styles.btnGray, padding: "4px 10px", fontSize: 12 }} onClick={() => addFriend(u.pseudo)}>+ Ami</button>
                )}
              </div>
            ))}
          </div>
        </div>
      )}

      {/* CHAT */}
      {screen === "chat" && (
        <div style={{ maxWidth: 700, margin: "0 auto", padding: "32px 16px" }}>
          <h2 style={{ fontWeight: 800, fontSize: 24, marginBottom: 16 }}>Chat Global 💬</h2>
          <div style={{ ...styles.card, display: "flex", flexDirection: "column", height: 460 }}>
            <div style={{ flex: 1, overflowY: "auto", display: "flex", flexDirection: "column", gap: 10, paddingRight: 4 }}>
              {chatMessages.map(m => (
                <div key={m.id} style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
                  <div style={{ width: 30, height: 30, borderRadius: "50%", background: m.from === "System" ? "#e2e8f0" : "#6366f1", flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", color: m.from === "System" ? "#64748b" : "#fff", fontSize: 12, fontWeight: 700 }}>
                    {m.from[0]}
                  </div>
                  <div>
                    <span style={{ fontWeight: 700, fontSize: 13, color: m.from === currentUser.pseudo ? "#6366f1" : "#0f172a" }}>{m.from}</span>
                    <span style={{ color: "#94a3b8", fontSize: 11, marginLeft: 6 }}>{new Date(m.ts).toLocaleTimeString("fr-FR", { hour: "2-digit", minute: "2-digit" })}</span>
                    <div style={{ fontSize: 14, marginTop: 2 }}>{m.text}</div>
                  </div>
                </div>
              ))}
              <div ref={chatEndRef} />
            </div>
            <div style={{ display: "flex", gap: 10, marginTop: 16, paddingTop: 12, borderTop: "1px solid #f1f5f9" }}>
              <input style={{ ...styles.input }} placeholder="Ton message..." value={chatInput} onChange={e => setChatInput(e.target.value)} onKeyDown={e => e.key === "Enter" && sendChat()} />
              <button style={styles.btn} onClick={sendChat}>Envoyer</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
