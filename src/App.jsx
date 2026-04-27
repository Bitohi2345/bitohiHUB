import { useState, useEffect, useCallback, useRef, useMemo } from "react";

const SUPA_URL = "https://nleopuntavfotcjminic.supabase.co";
const SUPA_KEY = "sb_publishable_sgsjQy-QGShbeFDNqC6N7w_6R3sJwak";
const SUPA_HEADERS = SUPA_KEY.startsWith("eyJ") ? { apikey: SUPA_KEY, Authorization: "Bearer " + SUPA_KEY, "Content-Type": "application/json" } : { apikey: SUPA_KEY, "Content-Type": "application/json" };

const remote = {
  async get(key) {
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 10000);
    try {
      const r = await fetch(SUPA_URL + "/rest/v1/bitohi_data?key=eq." + encodeURIComponent(key) + "&select=value", { headers: SUPA_HEADERS, signal: ctrl.signal });
      if (!r.ok) return null;
      const rows = await r.json();
      return rows.length ? { key, value: rows[0].value } : null;
    } catch { return null; } finally { clearTimeout(timeoutId); }
  },
  async getStrict(key) {
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 10000);
    try {
      const r = await fetch(SUPA_URL + "/rest/v1/bitohi_data?key=eq." + encodeURIComponent(key) + "&select=value", { headers: SUPA_HEADERS, signal: ctrl.signal });
      if (!r.ok) throw new Error("Supabase read failed: " + r.status);
      const rows = await r.json();
      return rows.length ? { key, value: rows[0].value } : null;
    } finally { clearTimeout(timeoutId); }
  },
  async set(key, value) {
    const ctrl = new AbortController();
    const timeoutId = setTimeout(() => ctrl.abort(), 10000);
    try {
      const r = await fetch(SUPA_URL + "/rest/v1/bitohi_data", {
        method: "POST",
        headers: { ...SUPA_HEADERS, Prefer: "resolution=merge-duplicates" },
        body: JSON.stringify({ key, value }),
        signal: ctrl.signal
      });
      if (!r.ok) throw new Error("Supabase write failed: " + r.status);
      return { key, value };
    } finally { clearTimeout(timeoutId); }
  },
  async delete(key) {
    try {
      await fetch(SUPA_URL + "/rest/v1/bitohi_data?key=eq." + encodeURIComponent(key), { method: "DELETE", headers: SUPA_HEADERS });
      return { key, deleted: true };
    } catch { return null; }
  }
};

const local = {
  get(key) { try { const v = localStorage.getItem("bh:" + key); return v !== null ? { key, value: v } : null; } catch { return null; } },
  set(key, value) { try { localStorage.setItem("bh:" + key, value); return { key, value }; } catch { return null; } },
  delete(key) { try { localStorage.removeItem("bh:" + key); return { key, deleted: true }; } catch { return null; } }
};

const ADMIN_CODE = "bitohi";
const POLL_MS = 8000;
const MAX_FILES = 10;
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB
const IMG_MAX_DIM = 800;
const IMG_QUALITY = 0.7;

const PRODUCERS = {
  "1105": { name: "Lumboc", emoji: "🎮", role: "Producer" },
  "2010": { name: "Caleb", emoji: "🎯", role: "Producer" },
  "3307": { name: "Hussain", emoji: "👑", role: "COO" },
  "4421": { name: "indyah", emoji: "🌸", role: "Producer" },
  "5599": { name: "famedchris", emoji: "⚡", role: "Producer" },
};

const DEFAULT_GAMES = [
  { id: "knockout", name: "Knockout!", color: "#3B82F6", icon: "🐧" },
  { id: "fisch", name: "Fisch", color: "#2D6A4F", icon: "🌲" },
  { id: "swing-obby", name: "Swing Obby for Brainrots!", color: "#8B5CF6", icon: "🧠" },
  { id: "double-jump", name: "+1 Double Jump for Brainrots!", color: "#E11D48", icon: "🦘" },
  { id: "run-brainrots", name: "Run For Brainrots!", color: "#F97316", icon: "🏃" },
  { id: "gym-star", name: "Gym Star Simulator", color: "#EAB308", icon: "🏋️" },
  { id: "climb-jump-tower", name: "Climb and Jump Tower", color: "#06B6D4", icon: "🗼" },
  { id: "redfield", name: "Redfield Elementary School", color: "#7C3AED", icon: "🎳" },
  { id: "lucky-block", name: "Break a Lucky Block!", color: "#14B8A6", icon: "⛏️" },
  { id: "grow-beanstalk", name: "Grow Beanstalk For Brainrots!", color: "#22C55E", icon: "🌱" },
  { id: "build-island", name: "Build An Island!", color: "#0EA5E9", icon: "🏝️" },
  { id: "dudes-battlegrounds", name: "Dudes Battlegrounds", color: "#DC2626", icon: "⚔️" },
  { id: "bee-garden", name: "Bee Garden", color: "#FACC15", icon: "🐝" },
  { id: "build-pet-factory", name: "Build A Pet Factory", color: "#F472B6", icon: "🧸" },
  { id: "pew-pew-blocks", name: "Pew Pew Blocks", color: "#EF4444", icon: "🔫" },
  { id: "jump-brainrots", name: "Jump for Brainrots!", color: "#A855F7", icon: "📦" },
  { id: "climb-brainrots", name: "Climb For Brainrots", color: "#F59E0B", icon: "☢️" },
  { id: "hunty-zombie", name: "Hunty Zombie", color: "#991B1B", icon: "🧟" },
  { id: "scamming-brainrots", name: "My Scamming Brainrots!", color: "#6D28D9", icon: "😈" },
  { id: "speed-lucky-block", name: "+1 Speed Be a Lucky Block!", color: "#10B981", icon: "🍀" },
  { id: "escape-knockout", name: "Escape Knockout For Brainrots", color: "#3B82F6", icon: "🏃" },
  { id: "find-brainrot", name: "Find the Brainrot", color: "#EC4899", icon: "🔍" },
  { id: "the-armory", name: "The Armory", color: "#78716C", icon: "🛡️" },
  { id: "get-tall-fall", name: "Get Tall and Fall", color: "#F43F5E", icon: "🚨" },
  { id: "liberty-high", name: "Liberty High School RP", color: "#8B5CF6", icon: "🏫" },
  { id: "aura-farm", name: "Aura Farm For Brainrots", color: "#A78BFA", icon: "✨" },
  { id: "tycoon-farm", name: "My Tycoon Farm", color: "#16A34A", icon: "🌾" },
  { id: "pull-lucky-block", name: "Pull a Lucky Block!", color: "#E11D48", icon: "💪" },
  { id: "reel-brainrot", name: "Reel a Brainrot!", color: "#0284C7", icon: "🎣" },
  { id: "deadeye", name: "Deadeye", color: "#B91C1C", icon: "🎯" },
  { id: "catch-brainrots-river", name: "Catch Brainrots From River", color: "#0891B2", icon: "🐟" },
  { id: "race-clicker", name: "Race Clicker", color: "#7C3AED", icon: "⚡" },
  { id: "fever-meme", name: "FEVER MEME", color: "#DB2777", icon: "🔥" },
  { id: "one-block", name: "ONE BLOCK", color: "#059669", icon: "🧱" },
  { id: "steal-brainrots", name: "Steal From Brainrots", color: "#6366F1", icon: "🤫" },
  { id: "cars-vs-trucks", name: "Cars vs Trucks", color: "#EA580C", icon: "🚗" },
  { id: "obby-cursed", name: "Obby But You're Cursed", color: "#4F46E5", icon: "🌎" },
  { id: "jump-escape-brainrots", name: "Jump and Escape Brainrots", color: "#8B5CF6", icon: "🧠" },
  { id: "dragon-training", name: "Dragon Training", color: "#DC2626", icon: "🐉" },
  { id: "obby-spiderman", name: "Obby but you're Spider-Man!", color: "#EF4444", icon: "🕷️" },
  { id: "escape-logs", name: "Escape Logs for Brainrots", color: "#92400E", icon: "🪵" },
  { id: "ghoul-re", name: "GHOUL:// RE", color: "#1E1B4B", icon: "👻" },
  { id: "flag-football", name: "Flag Football", color: "#15803D", icon: "🏈" },
  { id: "blind-shot", name: "Blind Shot", color: "#0369A1", icon: "🎯" },
  { id: "run-or-die", name: "Run or Die", color: "#BE123C", icon: "💀" },
  { id: "singing-brainrot", name: "My Singing Brainrot", color: "#D946EF", icon: "🎤" },
  { id: "stop-brainrots", name: "Stop The Brainrots!", color: "#B45309", icon: "🛑" },
  { id: "trap-and-bait", name: "Trap and Bait", color: "#854D0E", icon: "🪤" },
  { id: "tribe-survival", name: "Tribe Survival", color: "#0D9488", icon: "🏝️" },
  { id: "go-fishing", name: "GO FISHING", color: "#2563EB", icon: "🐟" },
  { id: "shoot-a-plane", name: "Shoot a Plane", color: "#64748B", icon: "✈️" },
  { id: "grow-your-farm", name: "Grow Your Farm", color: "#16A34A", icon: "🦊" },
  { id: "trap-run", name: "Trap Run", color: "#F97316", icon: "💥" },
  { id: "care-for-cats", name: "Care for Cats", color: "#EC4899", icon: "🐱" },
  { id: "skinwalkers", name: "Skinwalkers", color: "#1C1917", icon: "👁️" },
  { id: "own-a-zoo", name: "Own a Zoo!", color: "#65A30D", icon: "🦁" },
  { id: "slide-brainrots", name: "Slide For Brainrots", color: "#0EA5E9", icon: "🛝" },
  { id: "duck-tycoon", name: "2 Player Duck Tycoon", color: "#EAB308", icon: "🦆" },
  { id: "hidden-within", name: "Hidden Within", color: "#4338CA", icon: "🛒" },
  { id: "start-business", name: "Start your Business!", color: "#047857", icon: "💼" },
  { id: "pixel-playground", name: "Pixel Playground", color: "#6366F1", icon: "🎨" },
  { id: "lps", name: "Littlest Pet Shop", color: "#EC4899", icon: "🐾" },
  { id: "alien-td", name: "Alien TD", color: "#10B981", icon: "👽" },
  { id: "piggy-misfits", name: "Piggy: Misfits", color: "#F59E0B", icon: "🐷" },
  { id: "kreekcraft", name: "KreekCraft World", color: "#EF4444", icon: "🌍" },
  { id: "misfits-craft", name: "MisfitsCraft", color: "#14B8A6", icon: "⛏️" },
  { id: "get-strong", name: "Get STRONG For Brainrots", color: "#DC2626", icon: "💪" },
  { id: "build-an-island", name: "Build an Island", color: "#0EA5E9", icon: "🏝️" },
  { id: "parkour-for-brainrots", name: "Parkour For Brainrots!", color: "#2D6A4F", icon: "🎯" },
  { id: "throw-lucky-blocks-for-brainrots", name: "Throw Lucky Blocks for Brainrots!", color: "#8B5CF6", icon: "⚡" },
  { id: "grow-anything", name: "Grow Anything", color: "#E11D48", icon: "🔥" },
  { id: "become-the-fastest-brainrot", name: "Become the fastest Brainrot", color: "#F97316", icon: "🎨" },
  { id: "build-a-store", name: "Build a Store", color: "#EAB308", icon: "🏆" },
  { id: "1-speed-keyboard-escape-asmr", name: "+1 Speed Keyboard Escape ASMR", color: "#06B6D4", icon: "💎" },
  { id: "scroll-a-brainrot", name: "Scroll a Brainrot", color: "#7C3AED", icon: "🚀" },
  { id: "homeless-simulator", name: "Homeless Simulator", color: "#14B8A6", icon: "🌟" },
  { id: "parkour-rush", name: "Parkour Rush", color: "#22C55E", icon: "⚔️" },
  { id: "my-car-show", name: "My Car Show", color: "#0EA5E9", icon: "🎪" },
  { id: "dig-and-hatch-a-brainrot", name: "Dig and Hatch a Brainrot", color: "#DC2626", icon: "🐾" },
  { id: "build-a-mech", name: "Build a Mech", color: "#FACC15", icon: "🎲" },
  { id: "hatch-a-pet", name: "Hatch A Pet", color: "#F472B6", icon: "🧩" },
  { id: "survive-on-an-island", name: "Survive on an Island", color: "#EF4444", icon: "🎭" },
  { id: "slice-a-brainrot", name: "Slice A Brainrot", color: "#A855F7", icon: "🌈" },
  { id: "leash-brainrot-race", name: "Leash Brainrot & Race", color: "#F59E0B", icon: "🎵" },
  { id: "blood-of-punch", name: "Blood of Punch", color: "#991B1B", icon: "💫" },
  { id: "silent-strike", name: "Silent Strike", color: "#6D28D9", icon: "🔮" },
  { id: "bid-a-brainrot", name: "Bid A Brainrot", color: "#10B981", icon: "🎸" },
  { id: "plague", name: "Plague", color: "#EC4899", icon: "🏅" },
  { id: "1-speed-raft-escape", name: "+1 Speed Raft Escape", color: "#78716C", icon: "🎬" },
  { id: "my-fishing-pier", name: "My Fishing Pier", color: "#F43F5E", icon: "🎹" },
  { id: "build-a-firework-show", name: "Build A Firework Show", color: "#0284C7", icon: "🌺" },
  { id: "my-burger-factory", name: "My Burger Factory", color: "#B91C1C", icon: "🦋" },
  { id: "find-brainrots-tower", name: "Find Brainrots Tower", color: "#0891B2", icon: "🎁" },
  { id: "climb-staircase-for-brainrots", name: "Climb Staircase For Brainrots!", color: "#DB2777", icon: "🍀" },
  { id: "run-from-bosses", name: "Run From Bosses!", color: "#059669", icon: "🌙" },
  { id: "basketball-showdown", name: "Basketball Showdown", color: "#6366F1", icon: "⭐" },
  { id: "feed-your-car", name: "Feed Your Car", color: "#EA580C", icon: "🎊" },
  { id: "battle-for-brainrots", name: "Battle for Brainrots!", color: "#3B82F6", icon: "🎮" },
  { id: "chase-train-for-brainrots", name: "Chase Train for Brainrots!", color: "#2D6A4F", icon: "🎯" },
  { id: "mutate-or-lose-brainrot", name: "Mutate or Lose Brainrot", color: "#8B5CF6", icon: "⚡" },
  { id: "robot-evolution", name: "Robot Evolution", color: "#E11D48", icon: "🔥" },
  { id: "school-fight", name: "School Fight", color: "#F97316", icon: "🎨" },
  { id: "punch-wall", name: "Punch Wall", color: "#EAB308", icon: "🏆" },
  { id: "tennis-zero", name: "Tennis: Zero", color: "#06B6D4", icon: "💎" },
  { id: "cool-a-baddie", name: "Cool a Baddie", color: "#7C3AED", icon: "🚀" },
  { id: "mountain-cart-ride", name: "Mountain Cart Ride", color: "#14B8A6", icon: "🌟" },
  { id: "pet-incremental", name: "Pet Incremental", color: "#22C55E", icon: "⚔️" },
  { id: "ants", name: "Ants", color: "#0EA5E9", icon: "🎪" },
  { id: "find-a-meme", name: "Find a Meme", color: "#DC2626", icon: "🐾" },
  { id: "pick-doors-for-brainrots", name: "Pick Doors For Brainrots", color: "#FACC15", icon: "🎲" },
  { id: "don-t-wake-the-dinos", name: "Don't Wake The Dinos!", color: "#F472B6", icon: "🧩" },
  { id: "color-everything", name: "Color Everything!", color: "#EF4444", icon: "🎭" },
  { id: "rebound", name: "REBOUND", color: "#A855F7", icon: "🌈" },
  { id: "1-speed-rocket-escape", name: "+1 Speed Rocket Escape", color: "#F59E0B", icon: "🎵" },
  { id: "bridge-to-brainrot", name: "Bridge to Brainrot", color: "#991B1B", icon: "💫" },
  { id: "lift-with-brainrots", name: "Lift with Brainrots", color: "#6D28D9", icon: "🔮" },
  { id: "make-a-car", name: "Make a Car", color: "#10B981", icon: "🎸" },
  { id: "carry-a-fish", name: "Carry a Fish", color: "#EC4899", icon: "🏅" },
  { id: "stretch-your-neck", name: "Stretch Your Neck", color: "#78716C", icon: "🎬" },
  { id: "winner-takes-all", name: "Winner Takes ALL", color: "#F43F5E", icon: "🎹" },
  { id: "color-pick", name: "Color Pick!", color: "#0284C7", icon: "🌺" },
  { id: "climb-and-glide", name: "Climb and Glide", color: "#B91C1C", icon: "🦋" },
  { id: "grow-flowers", name: "Grow Flowers", color: "#0891B2", icon: "🎁" },
  { id: "bounce-a-brainrot", name: "Bounce A Brainrot!", color: "#DB2777", icon: "🍀" },
  { id: "waterslide-racing", name: "Waterslide Racing", color: "#059669", icon: "🌙" },
  { id: "anime-geek", name: "Anime Geek", color: "#6366F1", icon: "⭐" },
  { id: "anime-surge-simulator", name: "Anime Surge Simulator", color: "#EA580C", icon: "🎊" },
];

const _DEFAULT_GAMES_CLEAN = DEFAULT_GAMES.filter(g => g && g.id);

const PRIORITIES = ["Low", "Medium", "High", "Urgent"];
const PRIORITY_COLORS = { Low: "#94A3B8", Medium: "#3B82F6", High: "#F59E0B", Urgent: "#EF4444" };
const PRIORITY_HINTS = { Low: "~5d turnaround", Medium: "~2d turnaround", High: "~1d turnaround", Urgent: "Same-day / ASAP" };

const STATUS_META = {
  pending:       { label: "Pending",     color: "#94A3B8" },
  accepted:      { label: "Accepted",    color: "#3B82F6" },
  "in-progress": { label: "In Progress", color: "#F59E0B" },
  review:        { label: "Review",      color: "#8B5CF6" },
  completed:     { label: "Completed",   color: "#10B981" },
  rejected:      { label: "Rejected",    color: "#EF4444" },
  cancelled:     { label: "Cancelled",   color: "#64748B" },
};

const TERMINAL = new Set(["completed", "rejected", "cancelled"]);

const F = "'Montserrat', sans-serif";
const BD = "3px solid #000";
const SH = "4px 4px 0px 0px rgba(0,0,0,1)";
const SH_L = "6px 6px 0px 0px rgba(0,0,0,1)";
const SH_S = "2px 2px 0px 0px rgba(0,0,0,1)";
const SH_LG = "8px 8px 0px 0px rgba(0,0,0,1)";

const uid = () => typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
const refId = () => "BH-" + Math.random().toString(36).slice(2, 6).toUpperCase();

const LOCAL_TZ = Intl.DateTimeFormat().resolvedOptions().timeZone;
const _tzCache = {};
function shortTZ(tz) { if (_tzCache[tz]) return _tzCache[tz]; try { const r = new Date().toLocaleString("en-US", { timeZone: tz, timeZoneName: "short" }).split(" ").pop(); _tzCache[tz] = r; return r; } catch { return tz; } }
function fmtInTZ(iso, tz) { if (!iso) return ""; try { return new Date(iso).toLocaleString("en-US", { timeZone: tz || LOCAL_TZ, month: "short", day: "numeric", hour: "numeric", minute: "2-digit", hour12: true }); } catch { return new Date(iso).toLocaleString(); } }

function useTimeTick(ms = 30000) { const [, setTick] = useState(0); useEffect(() => { const t = setInterval(() => setTick(k => k + 1), ms); return () => clearInterval(t); }, [ms]); }

function compressImage(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error("read fail"));
    reader.onload = (e) => {
      const img = new Image();
      img.onerror = () => reject(new Error("decode fail"));
      img.onload = () => { try { const c = document.createElement("canvas"); let w = img.width, h = img.height; if (w > IMG_MAX_DIM) { h = (h * IMG_MAX_DIM) / w; w = IMG_MAX_DIM; } if (h > IMG_MAX_DIM) { w = (w * IMG_MAX_DIM) / h; h = IMG_MAX_DIM; } c.width = w; c.height = h; c.getContext("2d").drawImage(img, 0, 0, w, h); resolve(c.toDataURL("image/jpeg", IMG_QUALITY)); } catch (err) { reject(err); } };
      img.src = e.target.result;
    };
    reader.readAsDataURL(file);
  });
}

function formatFileSize(b) { if (b < 1024) return b + " B"; if (b < 1024 * 1024) return (b / 1024).toFixed(1) + " KB"; return (b / (1024 * 1024)).toFixed(1) + " MB"; }

async function uploadFile(file) {
  try {
    const ext = (file.name.split('.').pop() || 'bin').toLowerCase();
    const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, '_');
    const path = Date.now() + '-' + Math.random().toString(36).slice(2, 5) + '-' + safeName;
    const hdrs = SUPA_KEY.startsWith("eyJ") ? { apikey: SUPA_KEY, Authorization: "Bearer " + SUPA_KEY } : { apikey: SUPA_KEY };
    const r = await fetch(SUPA_URL + "/storage/v1/object/bitohi-files/" + encodeURIComponent(path), { method: "POST", headers: hdrs, body: file });
    if (!r.ok) return null;
    return { url: SUPA_URL + "/storage/v1/object/public/bitohi-files/" + encodeURIComponent(path), name: file.name, size: file.size, type: file.type || "application/octet-stream" };
  } catch { return null; }
}

function timeAgo(ts) { const s = Math.floor((Date.now() - ts) / 1000); if (s < 10) return "just now"; if (s < 60) return s + "s ago"; const m = Math.floor(s / 60); if (m < 60) return m + "m ago"; const h = Math.floor(m / 60); if (h < 24) return h + "h ago"; const d = Math.floor(h / 24); if (d < 7) return d + "d ago"; return new Date(ts).toLocaleDateString("en-US", { month: "short", day: "numeric" }); }

function dueDateLabel(ts) { if (!ts) return null; const diff = Math.ceil((new Date(ts).getTime() - Date.now()) / 86400000); if (diff < 0) return { text: Math.abs(diff) + "d overdue", color: "#EF4444" }; if (diff === 0) return { text: "Due today", color: "#F59E0B" }; if (diff === 1) return { text: "Due tomorrow", color: "#F59E0B" }; return { text: "Due in " + diff + "d", color: "#94A3B8" }; }

function groupByGame(orders, gm) { const groups = new Map(); for (const o of orders) { const gId = o.gameId || "_ungrouped"; if (!groups.has(gId)) groups.set(gId, []); groups.get(gId).push(o); } return [...groups.entries()].map(([gId, items]) => ({ game: gm[gId] || null, gameId: gId, orders: items })); }

const gMap = (games) => { const m = {}; for (const g of games) if (g?.id) m[g.id] = g; return m; };

const ARCHIVE_AGE_MS = 28 * 86400000;

function ordersHash(o) { let h = o.length; for (let i = 0; i < o.length; i++) { const s = (o[i].id || "") + (o[i].status || "") + (o[i].adminNote || "") + (o[i].producerNote || "") + (o[i].priority || "") + (o[i].deliverables?.length || 0); for (let j = 0; j < s.length; j++) h = ((h << 5) - h + s.charCodeAt(j)) | 0; } return String(h); }
function gamesHash(g) { let h = g.length; for (let i = 0; i < g.length; i++) { if (!g[i]) continue; const n = g[i].name || ""; for (let j = 0; j < n.length; j++) h = ((h << 5) - h + n.charCodeAt(j)) | 0; } return h; }

let _saveTimer = null, _draftTimer = null, _lastHash = "", _saving = false, _onSaveFail = null, _pendingOrders = null, _saveAttempt = 0;
const _deletedIds = new Set();
const _syncedIds = new Set(); // IDs confirmed present in remote (optimistic-creation protection)

async function loadOrdersStrict() {
  // Used by save merge — throws on read failure to prevent data loss
  let a = [], b = [];
  const ra = await remote.getStrict("bh-active");
  if (ra) a = JSON.parse(ra.value);
  const rb = await remote.getStrict("bh-archive");
  if (rb) b = JSON.parse(rb.value);
  // Dedup by id (mirror loadOrders dedup logic)
  const byId = new Map();
  for (const o of a) { if (o?.id) byId.set(o.id, { order: o, src: "active" }); }
  for (const o of b) {
    if (!o?.id) continue;
    const existing = byId.get(o.id);
    if (!existing) { byId.set(o.id, { order: o, src: "archive" }); continue; }
    const eTerminal = TERMINAL.has(existing.order.status);
    const oTerminal = TERMINAL.has(o.status);
    if (oTerminal && !eTerminal) byId.set(o.id, { order: o, src: "archive" });
    else if (oTerminal === eTerminal) byId.set(o.id, { order: o, src: "archive" });
  }
  return [...byId.values()].map(v => v.order);
}

async function loadOrders() {
  try {
    let a = [], b = [];
    try { const r = await remote.get("bh-active"); if (r) a = JSON.parse(r.value); } catch {}
    try { const r = await remote.get("bh-archive"); if (r) b = JSON.parse(r.value); } catch {}
    if (!a.length && !b.length) { try { const legacy = await remote.get("bitohi-orders"); if (legacy) { const all = JSON.parse(legacy.value); if (all.length) { await migrateOrders(all); return all; } } } catch {} }
    // Guard against split-write duplicates: if one of the two independent
    // writes (bh-active, bh-archive) fails, an order can temporarily exist
    // in both keys. Dedup by id. For conflicts: prefer the version whose
    // status matches its storage bucket (terminal→archive, active→active).
    // Fallback: prefer archive (more recent transition).
    const byId = new Map();
    for (const o of a) if (o?.id) byId.set(o.id, { order: o, src: "active" });
    for (const o of b) {
      if (!o?.id) continue;
      const existing = byId.get(o.id);
      if (!existing) { byId.set(o.id, { order: o, src: "archive" }); continue; }
      // Duplicate found — pick the correct version
      const eTerminal = TERMINAL.has(existing.order.status);
      const oTerminal = TERMINAL.has(o.status);
      // Prefer the version whose status matches its bucket
      if (oTerminal && !eTerminal) byId.set(o.id, { order: o, src: "archive" });
      // If both terminal or both active, prefer archive (later transition)
      else if (oTerminal === eTerminal) byId.set(o.id, { order: o, src: "archive" });
    }
    return [...byId.values()].map(v => v.order);
  } catch { return []; }
}

async function migrateOrders(all) {
  try {
    const now = Date.now();
    const ageMs = (o) => (typeof o.createdAt === 'number' && !isNaN(o.createdAt)) ? (now - o.createdAt) : 0;
    const active = all.filter(o => !TERMINAL.has(o.status) || ageMs(o) < ARCHIVE_AGE_MS);
    const archive = all.filter(o => TERMINAL.has(o.status) && ageMs(o) >= ARCHIVE_AGE_MS);
    await Promise.all([remote.set("bh-active", JSON.stringify(active)), remote.set("bh-archive", JSON.stringify(archive))]);
    try { await remote.delete("bitohi-orders"); } catch {}
  } catch {}
}

const _stripForSave = o => { const s = { ...o }; if (s.images?.length) { s.imageCount = (s.imageCount || 0) + s.images.length; s.images = []; } return s; };

const NEW_ORDER_GRACE_MS = 300000; // 5min — generous fallback; primary protection is _syncedIds

async function _mergeAndPersist(localOrders) {
  // STRICT load — if remote read fails, throw to abort save (no data loss).
  const remoteOrders = await loadOrdersStrict();
  const remoteIds = new Set();
  for (const o of remoteOrders) {
    if (o?.id) {
      remoteIds.add(o.id);
      _syncedIds.add(o.id); // confirm sync from this read
    }
  }
  const byId = new Map();
  const now = Date.now();
  // Add remote orders (skip tombstoned)
  for (const o of remoteOrders) { if (!_deletedIds.has(o.id)) byId.set(o.id, o); }
  // Decide each local order:
  for (const o of localOrders) {
    if (!o?.id || _deletedIds.has(o.id)) continue;
    const inRemote = remoteIds.has(o.id);
    if (inRemote) { byId.set(o.id, o); continue; } // local edit overlays remote
    const wasSynced = _syncedIds.has(o.id);
    if (!wasSynced) {
      // Never confirmed in remote — optimistic local order, protect indefinitely
      // (until either successful sync or explicit delete by user)
      byId.set(o.id, o);
    } else {
      // Was synced before, no longer in remote → confirmed deleted by another session
      // No grace window — deletion is authoritative once we've seen the absence
      _syncedIds.delete(o.id);
    }
  }
  const merged = [...byId.values()];
  // Validate createdAt so orders with missing/invalid timestamps don't silently disappear
  const ageMs = (o) => (typeof o.createdAt === 'number' && !isNaN(o.createdAt)) ? (now - o.createdAt) : 0;
  const active = merged.filter(o => !TERMINAL.has(o.status) || ageMs(o) < ARCHIVE_AGE_MS);
  const archive = merged.filter(o => TERMINAL.has(o.status) && ageMs(o) >= ARCHIVE_AGE_MS);
  const activeLite = active.map(_stripForSave);
  const archiveLite = archive.map(_stripForSave);
  await Promise.all([remote.set("bh-active", JSON.stringify(activeLite)), remote.set("bh-archive", JSON.stringify(archiveLite))]);
  _lastHash = ordersHash([...activeLite, ...archiveLite]);
  // Mark all written orders as synced (confirmed in remote after this write)
  const writtenIds = new Set(merged.map(o => o.id));
  for (const o of merged) { if (o?.id) _syncedIds.add(o.id); }
  // Clean up tombstones for IDs we successfully wrote without (they're confirmed deleted now)
  // Snapshot to array first to avoid iterator-during-mutation foot-guns
  for (const id of Array.from(_deletedIds)) { if (!writtenIds.has(id)) _deletedIds.delete(id); }
  // Clean up _syncedIds for orders we no longer wrote (e.g., admin removed them)
  for (const id of Array.from(_syncedIds)) { if (!writtenIds.has(id)) _syncedIds.delete(id); }
}

function saveOrders(localOrders) {
  clearTimeout(_saveTimer);
  _saveTimer = setTimeout(() => { saveOrdersNow(localOrders); }, 400);
}

// Single drain promise — all callers chain on this. Only one drain runs at a time.
let _drainPromise = null;

async function _runDrain() {
  // Process _pendingOrders until empty. Returns final success state.
  let overallSuccess = true;
  let sawAnyData = false;
  while (_pendingOrders !== null) {
    sawAnyData = true;
    const delays = [0, 1500, 4000];
    let attemptSucceeded = false;
    for (let i = 0; i < delays.length; i++) {
      if (delays[i]) await new Promise(r => setTimeout(r, delays[i]));
      const snapshot = _pendingOrders;
      try {
        await _mergeAndPersist(snapshot);
        attemptSucceeded = true;
        // Only clear if no newer data arrived during save
        if (_pendingOrders === snapshot) _pendingOrders = null;
        break;
      } catch {
        if (i === delays.length - 1) {
          if (_onSaveFail) _onSaveFail();
          _pendingOrders = null;
          overallSuccess = false;
        }
      }
    }
    if (!attemptSucceeded) {
      overallSuccess = false;
      break;
    }
  }
  return sawAnyData ? overallSuccess : true;
}

async function saveOrdersNow(localOrders) {
  _pendingOrders = localOrders; // collapse — latest write wins
  // If drain is already running, all we need to do is await it.
  // The running drain will pick up our _pendingOrders before it finishes.
  if (_drainPromise) {
    return await _drainPromise;
  }
  // Otherwise we own the drain. Run it and clean up.
  _saving = true;
  const myDrain = (async () => {
    try {
      return await _runDrain();
    } finally {
      _saving = false;
      _drainPromise = null;
    }
  })();
  _drainPromise = myDrain;
  return await myDrain;
}

// Legacy alias for any leftover references (keep safe)
async function _drainQueue() {
  return await saveOrdersNow(_pendingOrders || []);
}

let _polling = false;
async function pollData(curG, setO, setG) {
  if (_saving || _polling) return;
  _polling = true;
  try {
    // Use strict load: if it fails, skip this poll silently (preserve current state)
    const [o, g] = await Promise.all([loadOrdersStrict(), loadGames()]);
    // Update _syncedIds: anything in remote is now confirmed synced
    const remoteIds = new Set();
    for (const ord of o) {
      if (ord?.id) {
        remoteIds.add(ord.id);
        _syncedIds.add(ord.id);
      }
    }
    // Remove from _syncedIds anything that's been confirmed gone
    for (const id of Array.from(_syncedIds)) {
      if (!remoteIds.has(id)) _syncedIds.delete(id);
    }
    const filtered = o.filter(ord => !_deletedIds.has(ord.id));
    const h = ordersHash(filtered);
    if (h !== _lastHash) { _lastHash = h; setO(filtered); }
    if (gamesHash(g) !== gamesHash(curG)) setG(g);
  } catch {} finally { _polling = false; }
}

async function loadDrafts(code) { try { const r = await local.get("bh-drafts-" + code); return r ? JSON.parse(r.value) : []; } catch { return []; } }

function saveDrafts(code, drafts) {
  clearTimeout(_draftTimer);
  _draftTimer = setTimeout(async () => {
    try { const now = Date.now(); const lite = drafts.map(d => { const dd = { ...d }; if (dd.images?.length) { dd.imageCount = dd.images.length; dd.images = []; } return dd; }); await local.set("bh-drafts-" + code, JSON.stringify(lite)); } catch {}
  }, 300);
}

async function loadGames() {
  try {
    const r = await remote.get("bitohi-games");
    if (!r) return _DEFAULT_GAMES_CLEAN;
    const stored = JSON.parse(r.value);
    if (!Array.isArray(stored) || !stored.length) return _DEFAULT_GAMES_CLEAN;
    const ids = new Set(stored.filter(Boolean).map(g => g.id));
    let added = 0;
    for (const g of _DEFAULT_GAMES_CLEAN) { if (!ids.has(g.id)) { stored.push(g); added++; } }
    if (added) { try { await remote.set("bitohi-games", JSON.stringify(stored)); } catch {} }
    return stored.filter(g => g && g.id);
  } catch { return _DEFAULT_GAMES_CLEAN; }
}
async function saveGames(g) { try { await remote.set("bitohi-games", JSON.stringify(g)); } catch {} }

function GlobalStyles() {
  return <style>{`@import url('https://fonts.googleapis.com/css2?family=Montserrat:wght@400;500;600;700;800;900&family=Be+Vietnam+Pro:wght@300;400;500;600;700;800;900&display=swap');*,*::before,*::after{box-sizing:border-box}body{margin:0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif}@keyframes asb-dropdown{from{opacity:0;max-height:0}to{opacity:1;max-height:340px}}@keyframes asb-item{from{opacity:0;transform:translateY(12px)}to{opacity:1;transform:translateY(0)}}.asb-item:hover{background:rgba(255,255,255,.06)!important}.asb-input::placeholder{color:#64748B}@keyframes login-match-pop{from{opacity:0;transform:scale(.9) translateY(6px)}to{opacity:1;transform:scale(1) translateY(0)}}@keyframes login-shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-6px)}40%,80%{transform:translateX(6px)}}@keyframes bh-draw{0%{stroke-dashoffset:1200;opacity:0}5%{opacity:1}100%{stroke-dashoffset:0;opacity:1}}@keyframes bh-title-in{0%{opacity:0;transform:translateY(16px) scale(.9)}100%{opacity:1;transform:translateY(0) scale(1)}}@keyframes bh-sub-in{from{opacity:0;letter-spacing:.5em}to{opacity:1;letter-spacing:.3em}}@keyframes bh-glow{0%,100%{filter:drop-shadow(0 0 6px rgba(59,130,246,0))}50%{filter:drop-shadow(0 0 18px rgba(59,130,246,.25))}}@keyframes bh-float{0%,100%{transform:translateY(0)}50%{transform:translateY(-18px)}}@keyframes bh-progress{0%{width:0%}30%{width:35%}60%{width:58%}80%{width:72%}100%{width:100%}}@keyframes bh-sparkle{0%,100%{opacity:.4;transform:scale(.8)}50%{opacity:1;transform:scale(1.2)}}@keyframes bh-spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}@keyframes app-rise{from{transform:translateY(60px);opacity:0}to{transform:translateY(0);opacity:1}}@keyframes expand-in{from{max-height:0;opacity:0}to{max-height:400px;opacity:1}}@keyframes form-shake{0%,100%{transform:translateX(0)}20%,60%{transform:translateX(-4px)}40%,80%{transform:translateX(4px)}}@keyframes suc-bg{from{opacity:0}to{opacity:1}}@keyframes suc-circle-grow{0%{transform:scale(0);opacity:0}50%{transform:scale(1.15);opacity:1}100%{transform:scale(1);opacity:1}}@keyframes suc-check-draw{0%{stroke-dashoffset:60}100%{stroke-dashoffset:0}}@keyframes suc-ring-pulse{0%{transform:scale(1);opacity:.4}100%{transform:scale(2.2);opacity:0}}@keyframes suc-text-in{0%{opacity:0;transform:translateY(20px) scale(.9)}100%{opacity:1;transform:translateY(0) scale(1)}}@keyframes suc-sub-in{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}@keyframes suc-rocket{0%{transform:translate(-50%,-50%) scale(1) rotate(-15deg);opacity:1}15%{transform:translate(-50%,-60%) scale(1.3) rotate(-12deg);opacity:1}100%{transform:translate(-50%,-800%) scale(.3) rotate(-5deg);opacity:0}}@keyframes suc-flame{0%,100%{transform:scaleY(1) scaleX(1);opacity:.9}50%{transform:scaleY(1.4) scaleX(.8);opacity:1}}@keyframes suc-shake{0%,100%{transform:translate(-50%,-50%) rotate(-15deg)}25%{transform:translate(-48%,-51%) rotate(-17deg)}75%{transform:translate(-52%,-49%) rotate(-13deg)}}@keyframes suc-particle{0%{transform:translate(var(--tx),var(--ty)) scale(1);opacity:1}50%{opacity:.8}100%{transform:translate(calc(var(--tx)*2.5),calc(var(--ty)*2.5)) scale(0);opacity:0}}.p-btn{transition:transform .15s cubic-bezier(.34,1.56,.64,1),box-shadow .15s ease;will-change:transform}.p-btn:hover{transform:translateY(-2px);box-shadow:6px 6px 0px 0px rgba(0,0,0,1)!important}.p-btn:active{transform:translateY(1px) scale(.97);box-shadow:2px 2px 0px 0px rgba(0,0,0,1)!important;transition-duration:.08s}.p-btn-pill{transition:transform .18s cubic-bezier(.34,1.56,.64,1),box-shadow .15s ease;will-change:transform}.p-btn-pill:hover{transform:translateY(-3px) scale(1.02);box-shadow:8px 8px 0px 0px rgba(0,0,0,1)!important}.p-btn-pill:active{transform:translateY(1px) scale(.96);box-shadow:2px 2px 0px 0px rgba(0,0,0,1)!important;transition-duration:.08s}.p-btn-icon{transition:transform .15s ease;will-change:transform}.p-btn-icon:hover{transform:rotate(-8deg) scale(1.1)}.p-btn-icon:active{transform:rotate(0deg) scale(.9);transition-duration:.06s}.p-card{transition:transform .2s cubic-bezier(.34,1.56,.64,1),box-shadow .2s ease;will-change:transform}.p-card:hover{transform:translateY(-3px);box-shadow:6px 8px 0px 0px rgba(0,0,0,1)!important}.p-card-press{transition:transform .15s cubic-bezier(.34,1.56,.64,1),box-shadow .15s ease;will-change:transform;cursor:pointer}.p-card-press:hover{transform:translateY(-2px);box-shadow:6px 6px 0px 0px rgba(0,0,0,1)!important}.p-card-press:active{transform:translateY(1px) scale(.99);box-shadow:2px 2px 0px 0px rgba(0,0,0,1)!important;transition-duration:.08s}@keyframes p-breathe{0%,100%{transform:scale(1)}50%{transform:scale(1.05)}}.p-breathe{animation:p-breathe 3s ease-in-out infinite}@keyframes p-wiggle{0%,100%{transform:rotate(0deg)}25%{transform:rotate(-6deg)}75%{transform:rotate(6deg)}}.p-wiggle:hover{animation:p-wiggle .4s ease}@keyframes p-bob{0%,100%{transform:translateY(0)}50%{transform:translateY(-6px)}}.p-bob{animation:p-bob 2.5s ease-in-out infinite}@keyframes p-slide-up{from{opacity:0;transform:translateY(16px)}to{opacity:1;transform:translateY(0)}}.p-slide-up{animation:p-slide-up .4s cubic-bezier(.34,1.56,.64,1) both}.p-stagger>*:nth-child(1){animation-delay:.05s}.p-stagger>*:nth-child(2){animation-delay:.1s}.p-stagger>*:nth-child(3){animation-delay:.15s}.p-stagger>*:nth-child(4){animation-delay:.2s}.p-stagger>*:nth-child(5){animation-delay:.25s}.p-stagger>*:nth-child(6){animation-delay:.3s}.p-stagger>*:nth-child(7){animation-delay:.35s}.p-stagger>*:nth-child(8){animation-delay:.4s}@keyframes p-pop{from{opacity:0;transform:scale(.8)}to{opacity:1;transform:scale(1)}}.p-pop{animation:p-pop .3s cubic-bezier(.34,1.56,.64,1) both}@keyframes p-fab-idle{0%,100%{transform:scale(1) rotate(0deg)}25%{transform:scale(1.05) rotate(3deg)}75%{transform:scale(1.05) rotate(-3deg)}}.p-fab{animation:p-fab-idle 3s ease-in-out infinite;transition:transform .15s ease;will-change:transform}.p-fab:hover{animation:none;transform:scale(1.12) rotate(90deg)}.p-fab:active{transform:scale(.92) rotate(90deg);transition-duration:.08s}.p-nav{transition:transform .12s ease;will-change:transform;position:relative}.p-nav:hover{transform:scale(1.05)}.p-nav:active{transform:scale(.95)}.p-input{transition:box-shadow .2s ease,transform .2s ease}.p-input:focus{box-shadow:6px 6px 0px 0px rgba(0,0,0,1)!important;transform:translateY(-1px)}.p-chip{transition:transform .12s ease;will-change:transform}.p-chip:hover{transform:scale(1.08)}@keyframes p-toast-in{from{transform:translateX(100%) scale(.8);opacity:0}to{transform:translateX(0) scale(1);opacity:1}}.p-toast{animation:p-toast-in .35s cubic-bezier(.34,1.56,.64,1) both}@keyframes p-dropzone-pulse{0%,100%{border-color:#0060AC;background:rgba(0,96,172,.04)}50%{border-color:#4953BC;background:rgba(0,96,172,.1)}}.p-dropzone-active{animation:p-dropzone-pulse .8s ease-in-out infinite}@media(max-width:768px){.bh-sprint-grid{grid-template-columns:repeat(2,1fr)!important;gap:6px!important}.bh-submit-cols{flex-direction:column!important}.bh-submit-cols>*:last-child{width:100%!important;flex-shrink:unset!important}.bh-nav{flex-wrap:wrap!important;gap:8px!important;padding:10px 16px!important}.bh-nav-links{gap:10px!important;width:100%;order:3;justify-content:center!important}.bh-hero{padding:20px!important}.bh-hero h2{font-size:20px!important}.bh-main{padding:20px 14px!important}.bh-deco{display:none!important}.bh-form-card{padding:16px!important}.bh-filters{overflow-x:auto;-webkit-overflow-scrolling:touch;flex-wrap:nowrap!important}.bh-filters::-webkit-scrollbar{display:none}}@media(max-width:420px){.bh-sprint-grid{grid-template-columns:1fr!important}.bh-nav-links{gap:6px!important}.bh-hero h2{font-size:16px!important}.bh-form-card{padding:12px!important}}/* ── SPRING PAGE ENTRANCE (CSS-only,triggered by React key remount) ── */ @keyframes p-spring{0%{opacity:0;transform:translateY(24px) scale(.92)}40%{opacity:1;transform:translateY(-6px) scale(1.02)}70%{transform:translateY(2px) scale(.99)}100%{opacity:1;transform:translateY(0) scale(1)}}.p-spring>*{opacity:0;animation:p-spring .45s cubic-bezier(.34,1.56,.64,1) both}.p-spring>*:nth-child(1){animation-delay:.04s}.p-spring>*:nth-child(2){animation-delay:.09s}.p-spring>*:nth-child(3){animation-delay:.14s}.p-spring>*:nth-child(4){animation-delay:.19s}.p-spring>*:nth-child(5){animation-delay:.24s}.p-spring>*:nth-child(6){animation-delay:.29s}.p-spring>*:nth-child(7){animation-delay:.34s}.p-spring>*:nth-child(8){animation-delay:.39s}.p-spring>*:nth-child(9){animation-delay:.44s}.p-spring>*:nth-child(10){animation-delay:.49s}.p-spring>*:nth-child(11){animation-delay:.54s}.p-spring>*:nth-child(12){animation-delay:.59s}@media(prefers-reduced-motion:reduce){*,.p-btn,.p-btn-pill,.p-card,.p-card-press,.p-fab,.p-breathe,.p-bob,.p-wiggle{animation:none!important;transition:none!important}.p-spring>*{animation:none!important;opacity:1!important}}`}</style>;
}

const GameIcon = ({ game, size = 32 }) => (
  <div style={{ width: size, height: size, borderRadius: size > 36 ? 12 : 8, background: game?.color || "#6366F1", display: "flex", alignItems: "center", justifyContent: "center", fontSize: size * 0.5, flexShrink: 0, border: "2px solid #000" }}>{game?.icon || "🎮"}</div>
);

const PriorityDot = ({ priority }) => { const c = PRIORITY_COLORS[priority] || "#94A3B8"; return (
  <span className="bh-priority" style={{ display: "inline-flex", alignItems: "center", gap: 4, fontSize: 11, color: c, fontWeight: 700, fontFamily: "'Montserrat', sans-serif" }}>
    <span style={{ width: 7, height: 7, borderRadius: "50%", background: c, border: "1.5px solid #000" }} /><span>{priority}</span>
  </span>
);};

const StatusBadge = ({ status }) => { const m = STATUS_META[status] || STATUS_META.pending; return (
  <span className="bh-status" style={{ padding: "4px 10px", borderRadius: 999, fontSize: 10, fontWeight: 900, background: m.color, color: "#000", border: "2px solid #000", textTransform: "uppercase", letterSpacing: ".05em", fontFamily: "'Montserrat', sans-serif" }}>{m.label}</span>
);};

const GameTag = ({ game, size = "sm" }) => { if (!game) return null; const isSm = size === "sm"; return (
  <span className="p-chip" style={{ display: "inline-flex", alignItems: "center", gap: isSm ? 5 : 7, padding: isSm ? "3px 10px 3px 4px" : "4px 12px 4px 5px", borderRadius: 999, background: game.color, border: "2px solid #000", boxShadow: "2px 2px 0px 0px rgba(0,0,0,1)", flexShrink: 0 }}>
    <span style={{ width: isSm ? 18 : 22, height: isSm ? 18 : 22, background: "rgba(255,255,255,.25)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: isSm ? 10 : 13 }}>{game.icon}</span>
    <span style={{ fontFamily: "'Montserrat', sans-serif", fontWeight: 800, fontSize: isSm ? 10 : 12, color: "#fff", textTransform: "uppercase", letterSpacing: ".02em", textShadow: "1px 1px 0px rgba(0,0,0,.3)" }}>{game.name}</span>
  </span>
);};

const DeadlineBar = ({ createdAt, dueDate }) => { if (!dueDate || !createdAt) return null; const now = Date.now(); const end = new Date(dueDate).getTime(); const total = end - createdAt; const elapsed = Math.max(0, Math.min(now - createdAt, Math.max(total, 1))); const pct = Math.min(1, elapsed / Math.max(total, 1)); const diff = Math.ceil((end - now) / 86400000); const barColor = pct >= 1 ? "#EF4444" : pct >= .85 ? "#F59E0B" : pct >= .6 ? "#3B82F6" : "#4ADE80"; const dlText = diff < 0 ? Math.abs(diff) + "d overdue" : diff === 0 ? "Due today" : diff === 1 ? "Due tomorrow" : "Due in " + diff + "d"; const dlColor = diff < 0 ? "#EF4444" : diff <= 1 ? "#F59E0B" : "#94A3B8"; return (
  <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8 }}>
    <div style={{ flex: 1, height: 6, background: "#E0E3E5", borderRadius: 999, overflow: "hidden", border: "1.5px solid #000" }}>
      <div style={{ height: "100%", width: (pct * 100) + "%", background: barColor, borderRadius: 999, transition: "width .5s ease" }} />
    </div>
    <span style={{ fontFamily: "'Montserrat', sans-serif", fontSize: 10, fontWeight: 800, color: dlColor, flexShrink: 0 }}>{dlText}</span>
  </div>
);};

const FileIcon = ({ type }) => {
  if (type?.startsWith("image/")) return "🖼️";
  const ext = { "application/pdf": "📄", "application/zip": "📦", "text/plain": "📝" };
  return ext[type] || "📎";
};

const Attachments = ({ files, images, imageCount, onRemove, onView, pending }) => {
  const hasFiles = files?.length > 0;
  const hasImages = images?.length > 0;
  const hasPending = pending?.length > 0;
  if (!hasFiles && !hasImages && !hasPending && imageCount > 0) return <div style={{ marginTop: 8, padding: "6px 12px", background: "#F2F4F6", borderRadius: 8, fontSize: 11, color: "#717783", display: "flex", alignItems: "center", gap: 6 }}>📎 {imageCount} attachment{imageCount !== 1 ? "s" : ""} (archived)</div>;
  if (!hasFiles && !hasImages && !hasPending) return null;
  return (<div style={{ display: "flex", gap: 8, flexWrap: "wrap", marginTop: 8 }}>
    {hasFiles && files.map((f, i) => {
      const isImg = f.type?.startsWith("image/");
      if (isImg) return (
        <div key={f.url || i} style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "2px solid #000", boxShadow: SH_S }}>
          <img src={f.url} alt={f.name} loading="lazy" decoding="async" onClick={() => onView?.(f.url)} style={{ width: 72, height: 72, objectFit: "cover", display: "block", cursor: "pointer" }} />
        </div>
      );
      return (
        <a key={f.url || i} href={f.url} target="_blank" rel="noopener noreferrer" download={f.name} className="p-btn" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: "#F2F4F6", border: "2px solid #000", borderRadius: 10, boxShadow: SH_S, textDecoration: "none", color: "#414751", fontSize: 11, fontWeight: 700, fontFamily: F, maxWidth: 220 }}>
          <span style={{ fontSize: 16 }}><FileIcon type={f.type} /></span>
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
          <span style={{ color: "#94A3B8", fontSize: 9, flexShrink: 0 }}>{formatFileSize(f.size)}</span>
          <span style={{ fontSize: 12 }}>⬇</span>
        </a>
      );
    })}
    {hasImages && images.map((src, i) => (
      <div key={(typeof src === "string" ? src.slice(0, 40) : i)} style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "2px solid #000", boxShadow: SH_S }}>
        <img src={src} alt="" loading="lazy" decoding="async" onClick={() => onView?.(src)} style={{ width: 72, height: 72, objectFit: "cover", display: "block", cursor: "pointer" }} />
        {onRemove && <button onClick={(e) => { e.stopPropagation(); onRemove(i); }} className="p-btn-icon" style={{ position: "absolute", top: 3, right: 3, width: 20, height: 20, borderRadius: "50%", background: "#BA1A1A", border: "2px solid #000", color: "#fff", cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>×</button>}
      </div>
    ))}
    {hasPending && pending.map((pf, i) => {
      if (pf.preview) return (
        <div key={"pf-"+i} style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "2px solid #000", boxShadow: SH_S }}>
          <img src={pf.preview} alt={pf.name} style={{ width: 72, height: 72, objectFit: "cover", display: "block" }} />
          {onRemove && <button onClick={(e) => { e.stopPropagation(); onRemove(i); }} className="p-btn-icon" style={{ position: "absolute", top: 3, right: 3, width: 20, height: 20, borderRadius: "50%", background: "#BA1A1A", border: "2px solid #000", color: "#fff", cursor: "pointer", fontSize: 10, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>×</button>}
        </div>
      );
      return (
        <div key={"pf-"+i} className="p-btn" style={{ display: "flex", alignItems: "center", gap: 6, padding: "8px 12px", background: "#F2F4F6", border: "2px solid #000", borderRadius: 10, boxShadow: SH_S, fontSize: 11, fontWeight: 700, fontFamily: F, maxWidth: 220, position: "relative" }}>
          <span style={{ fontSize: 16 }}><FileIcon type={pf.type} /></span>
          <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", color: "#414751" }}>{pf.name}</span>
          <span style={{ color: "#94A3B8", fontSize: 9, flexShrink: 0 }}>{formatFileSize(pf.size)}</span>
          {onRemove && <button onClick={(e) => { e.stopPropagation(); onRemove(i); }} className="p-btn-icon" style={{ position: "absolute", top: -6, right: -6, width: 18, height: 18, borderRadius: "50%", background: "#BA1A1A", border: "2px solid #000", color: "#fff", cursor: "pointer", fontSize: 9, display: "flex", alignItems: "center", justifyContent: "center", fontWeight: 900 }}>×</button>}
        </div>
      );
    })}
  </div>);
};

const Lightbox = ({ src, onClose }) => {
  useEffect(() => { if (!src) return; const h = (e) => { if (e.key === "Escape") onClose(); }; document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h); }, [src, onClose]);
  if (!src) return null; return (
  <div onClick={onClose} style={{ position: "fixed", inset: 0, zIndex: 9999, background: "rgba(0,0,0,.85)", display: "flex", alignItems: "center", justifyContent: "center", cursor: "zoom-out", backdropFilter: "blur(8px)" }}>
    <img src={src} alt="" className="p-pop" style={{ maxWidth: "92vw", maxHeight: "92vh", borderRadius: 12, border: "3px solid #000", boxShadow: "8px 8px 0px 0px rgba(0,0,0,1)" }} />
  </div>
);};

const Field = ({ label, children }) => (
  <div><label style={{ display: "block", fontFamily: "'Montserrat', sans-serif", fontWeight: 900, fontSize: 11, color: "#414751", textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{label}</label>{children}</div>
);

// Toast system
function useToast() {
  const [toasts, setToasts] = useState([]);
  const timersRef = useRef([]);
  useEffect(() => { return () => { timersRef.current.forEach(clearTimeout); }; }, []);
  const push = useCallback((msg, type = "info") => {
    const id = Date.now() + Math.random();
    setToasts(p => [...p, { id, msg, type }]);
    const tmr = setTimeout(() => setToasts(p => p.filter(x => x.id !== id)), 3500);
    timersRef.current.push(tmr);
    if (timersRef.current.length > 20) timersRef.current = timersRef.current.slice(-10);
  }, []);
  return useMemo(() => ({ toasts, push }), [toasts, push]);
}

function ToastContainer({ toasts }) {
  const colors = { success: { bg: "#4ADE80", icon: "✓" }, error: { bg: "#F87171", icon: "✕" }, info: { bg: "#60A5FA", icon: "i" } };
  return (<div style={{ position: "fixed", top: 20, right: 20, zIndex: 99999, display: "flex", flexDirection: "column", gap: 8 }}>
    {toasts.map(t => { const c = colors[t.type] || colors.info; return (
      <div key={t.id} className="p-toast" style={{ padding: "12px 18px", background: c.bg, border: "3px solid #000", borderRadius: 12, color: "#000", fontSize: 13, fontWeight: 700, display: "flex", alignItems: "center", gap: 8, boxShadow: "4px 4px 0px 0px rgba(0,0,0,1)", minWidth: 220, maxWidth: 340, fontFamily: "'Montserrat', sans-serif" }}>
        <span style={{ width: 22, height: 22, borderRadius: "50%", background: "#fff", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 900, flexShrink: 0 }}>{c.icon}</span>{t.msg}
      </div>
    );})}
  </div>);
}

function GameAutocomplete({ games, value, onChange, onAddGame, recentIds = [] }) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [creating, setCreating] = useState(false);
  const [customEmoji, setCustomEmoji] = useState("🎮");
  const ref = useRef(null);

  const filtered = useMemo(() => { const q = query.toLowerCase(); return games.filter(g => g.name.toLowerCase().includes(q)); }, [games, query]);

  useEffect(() => {
    const out = (e) => { if (ref.current && !ref.current.contains(e.target)) { setOpen(false); setCreating(false); } };
    const esc = (e) => { if (e.key === "Escape") { setOpen(false); setCreating(false); } };
    document.addEventListener("mousedown", out); document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("mousedown", out); document.removeEventListener("keydown", esc); };
  }, []);

  const handleCreate = () => {
    if (!query.trim()) return;
    const newGame = { id: query.toLowerCase().replace(/[^a-z0-9]+/g, "-") + "-" + Date.now().toString(36).slice(-3), name: query.trim(), icon: customEmoji, color: "#6366F1" };
    onAddGame(newGame);
    onChange(newGame.id);
    setOpen(false); setQuery(""); setCreating(false);
  };

  const gLookup = useMemo(() => { const m = {}; for (const g of games) if (g?.id) m[g.id] = g; return m; }, [games]);
  const selected = gLookup[value] || null;

  return (
    <div ref={ref} style={{ position: "relative", zIndex: open ? 200 : 1 }}>
      <div onClick={() => setOpen(!open)} className="p-card-press" style={{ background: "#fff", border: BD, borderRadius: 12, padding: "10px 14px", display: "flex", alignItems: "center", gap: 12, cursor: "pointer", boxShadow: SH_S }}>
        {selected ? <><GameIcon game={selected} size={36} /><span style={{ flex: 1, fontWeight: 700, fontSize: 14, color: "#191C1E", fontFamily: F }}>{selected.name}</span></> : <span style={{ flex: 1, color: "#94A3B8", fontSize: 14 }}>Select a game...</span>}
        {value && <button onClick={(e) => { e.stopPropagation(); onChange(""); setQuery(""); }} className="p-btn-icon" style={{ background: "none", border: "none", color: "#717783", cursor: "pointer", fontSize: 16, padding: 4 }}>✕</button>}
        <span style={{ color: "#717783", fontSize: 10 }}>▼</span>
      </div>
      {open && (
        <div style={{ position: "absolute", top: "calc(100% + 6px)", left: 0, right: 0, zIndex: 100, background: "#1E293B", border: BD, borderRadius: 14, boxShadow: "8px 8px 0px 0px rgba(0,0,0,1)", animation: "asb-dropdown .25s ease forwards" }}>
          <div style={{ padding: "10px 12px", borderBottom: "2px solid rgba(255,255,255,.1)" }}>
            <input autoFocus value={query} onChange={e => setQuery(e.target.value)} placeholder="Search games..." className="asb-input p-input" style={{ width: "100%", padding: "10px 14px", background: "rgba(255,255,255,.06)", border: BD, borderRadius: 10, color: "#E2E8F0", fontSize: 13, fontWeight: 600, outline: "none", fontFamily: F, boxShadow: SH_S }} />
          </div>
          <div style={{ overflowY: "auto", maxHeight: 300, padding: 6, borderRadius: "0 0 11px 11px" }}>
            {!query && recentIds.length > 0 && <>
              <div style={{ padding: "6px 14px 4px", fontSize: 9, fontWeight: 900, color: "#717783", fontFamily: F, textTransform: "uppercase", letterSpacing: ".1em" }}>RECENT</div>
              {recentIds.map(id => gLookup[id]).filter(Boolean).map(g => (
                <div key={"r-"+g.id} onClick={() => { onChange(g.id); setOpen(false); setQuery(""); }} className="asb-item" style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", cursor: "pointer", borderRadius: 10, background: value === g.id ? "rgba(96,165,250,.15)" : "transparent" }}>
                  <GameIcon game={g} size={36} /><span style={{ flex: 1, color: "#EFF1F3", fontSize: 14, fontWeight: 700, fontFamily: F }}>{g.name}</span>
                  <span style={{ fontSize: 9, color: "#4ADE80", padding: "3px 8px", background: "rgba(74,222,128,.1)", borderRadius: 999, fontWeight: 800 }}>Recent</span>
                </div>
              ))}
              <div style={{ height: 1, background: "rgba(255,255,255,.06)", margin: "6px 14px" }} />
              <div style={{ padding: "6px 14px 4px", fontSize: 9, fontWeight: 900, color: "#717783", fontFamily: F, textTransform: "uppercase", letterSpacing: ".1em" }}>ALL GAMES</div>
            </>}
            {filtered.map((g, i) => (
              <div key={g.id} className="asb-item" onClick={() => { onChange(g.id); setOpen(false); setQuery(""); setCreating(false); }}
                style={{ display: "flex", alignItems: "center", gap: 12, padding: "10px 14px", cursor: "pointer", borderRadius: 10, background: value === g.id ? "rgba(96,165,250,.15)" : "transparent", animation: `asb-item .2s ease both ${Math.min(i, 10) * .03}s` }}>
                <GameIcon game={g} size={36} /><span style={{ flex: 1, color: "#EFF1F3", fontSize: 14, fontWeight: 700, fontFamily: F }}>{g.name}</span>
                <span style={{ fontSize: 9, color: "#64748B", padding: "3px 8px", background: "rgba(255,255,255,.03)", borderRadius: 999, fontWeight: 700 }}>GAME</span>
              </div>
            ))}
            {filtered.length === 0 && !creating && query.trim() && (
              <div style={{ padding: 16, textAlign: "center" }}>
                <div style={{ color: "#64748B", fontSize: 12, marginBottom: 8 }}>No game found</div>
                <button onClick={() => setCreating(true)} className="p-btn" style={{ padding: "10px 24px", borderRadius: 999, cursor: "pointer", background: "#AD91FF", border: BD, color: "#fff", fontWeight: 900, fontSize: 12, fontFamily: F, textTransform: "uppercase", boxShadow: SH_S }}>+ Add "{query.trim()}"</button>
              </div>
            )}
            {creating && (
              <div style={{ padding: 16 }}>
                <div style={{ fontSize: 11, color: "#94A3B8", marginBottom: 8, fontWeight: 700 }}>Pick an icon:</div>
                <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginBottom: 12 }}>
                  {["🎮","🎯","⚡","🔥","🎨","🏆","💎","🚀","🌟","⚔️","🎪","🐾"].map(e => (
                    <button key={e} onClick={() => setCustomEmoji(e)} style={{ width: 36, height: 36, borderRadius: 8, cursor: "pointer", background: "rgba(255,255,255,.04)", border: customEmoji === e ? "2px solid #000" : "2px solid transparent", boxShadow: customEmoji === e ? SH_S : "none", display: "flex", alignItems: "center", justifyContent: "center" }}>{e}</button>
                  ))}
                </div>
                <button onClick={handleCreate} className="p-btn-pill" style={{ width: "100%", padding: "12px 0", borderRadius: 999, cursor: "pointer", background: "linear-gradient(90deg,#674BB5,#4953BC)", border: BD, color: "#fff", fontWeight: 900, fontSize: 13, fontFamily: F, textTransform: "uppercase", boxShadow: SH }}>Add & Select</button>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

const DAYS = ["MO","TU","WE","TH","FR","SA","SU"];
const TIMES = ["9:00 AM","10:00 AM","11:00 AM","12:00 PM","2:00 PM","4:00 PM","5:00 PM","8:00 PM","11:59 PM"];

function parseTime12(str) { const m = str.match(/(\d+):(\d+)\s*(AM|PM)/i); if (!m) return { h: 23, m: 59 }; let h = parseInt(m[1]); const min = parseInt(m[2]); if (m[3].toUpperCase() === "PM" && h !== 12) h += 12; if (m[3].toUpperCase() === "AM" && h === 12) h = 0; return { h, m: min }; }

function DateTimePicker({ value, onChange }) {
  const today = new Date();
  const [viewMonth, setViewMonth] = useState(today.getMonth());
  const [viewYear, setViewYear] = useState(today.getFullYear());
  const [selectedDate, setSelectedDate] = useState(value ? new Date(value) : null);
  const [selectedTime, setSelectedTime] = useState(null);

  const externalUpdate = useRef(false);

  useEffect(() => {
    if (externalUpdate.current) { externalUpdate.current = false; return; }
    if (selectedDate && selectedTime) { const { h, m } = parseTime12(selectedTime); const d = new Date(selectedDate); d.setHours(h, m, 0, 0); onChange(d.toISOString()); }
    else if (selectedDate && !selectedTime) { const d = new Date(selectedDate); d.setHours(23, 59, 0, 0); onChange(d.toISOString()); }
  }, [selectedDate, selectedTime]);

  useEffect(() => { if (value) { externalUpdate.current = true; const d = new Date(value); setSelectedDate(d); setViewMonth(d.getMonth()); setViewYear(d.getFullYear()); } else { setSelectedDate(null); setSelectedTime(null); } }, [value]);

  const prevMonth = () => { if (viewMonth === 0) { setViewMonth(11); setViewYear(y => y - 1); } else setViewMonth(m => m - 1); };
  const nextMonth = () => { if (viewMonth === 11) { setViewMonth(0); setViewYear(y => y + 1); } else setViewMonth(m => m + 1); };

  const firstDay = new Date(viewYear, viewMonth, 1);
  let startOffset = firstDay.getDay() - 1; if (startOffset < 0) startOffset = 6;
  const daysInMonth = new Date(viewYear, viewMonth + 1, 0).getDate();
  const cells = [];
  for (let i = 0; i < startOffset; i++) cells.push(null);
  for (let d = 1; d <= daysInMonth; d++) cells.push(d);

  const isToday = (d) => d === today.getDate() && viewMonth === today.getMonth() && viewYear === today.getFullYear();
  const isSel = (d) => selectedDate && d === selectedDate.getDate() && viewMonth === selectedDate.getMonth() && viewYear === selectedDate.getFullYear();
  const isPastMonth = viewYear < today.getFullYear() || (viewYear === today.getFullYear() && viewMonth < today.getMonth());
  const isFutureMonth = viewYear > today.getFullYear() || (viewYear === today.getFullYear() && viewMonth > today.getMonth());
  const isPast = isPastMonth ? () => true : isFutureMonth ? () => false : (d) => d < today.getDate();

  return (
    <div style={{ background: "#fff", border: BD, borderRadius: 14, overflow: "hidden", boxShadow: SH }}>
      <div style={{ background: "#0060AC", padding: "14px 16px", display: "flex", alignItems: "center", justifyContent: "space-between", borderBottom: "4px solid #000" }}>
        <button onClick={() => { setViewYear(today.getFullYear()); setViewMonth(today.getMonth()); setSelectedDate(new Date(today.getFullYear(), today.getMonth(), today.getDate())); }} className="p-btn" style={{ padding: "4px 10px", borderRadius: 6, background: "rgba(255,255,255,.2)", border: "none", color: "#fff", cursor: "pointer", fontSize: 10, fontWeight: 800, fontFamily: F, textTransform: "uppercase" }}>Today</button>
        <span style={{ fontFamily: F, fontWeight: 900, color: "#fff", fontSize: 14, textTransform: "uppercase" }}>{new Date(viewYear, viewMonth).toLocaleDateString("en-US", { month: "long", year: "numeric" })}</span>
        <div style={{ display: "flex", gap: 4 }}>
          <button onClick={prevMonth} style={{ width: 30, height: 30, background: "rgba(255,255,255,.15)", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>‹</button>
          <button onClick={nextMonth} style={{ width: 30, height: 30, background: "rgba(255,255,255,.15)", border: "none", borderRadius: 6, color: "#fff", cursor: "pointer", fontSize: 18, display: "flex", alignItems: "center", justifyContent: "center" }}>›</button>
        </div>
      </div>
      <div style={{ padding: "10px 12px" }}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2, marginBottom: 4 }}>
          {DAYS.map(d => <div key={d} style={{ textAlign: "center", fontSize: 10, fontWeight: 900, color: (d === "SA" || d === "SU") ? "#EF4444" : "#717783", fontFamily: F, padding: 4 }}>{d}</div>)}
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 2 }}>
          {cells.map((d, i) => d === null ? <div key={"e"+i} /> : (
            <button key={d} disabled={isPast(d)} onClick={() => setSelectedDate(new Date(viewYear, viewMonth, d))}
              style={{ width: "100%", aspectRatio: "1", borderRadius: 8, border: isToday(d) ? "2px solid #0060AC" : "2px solid transparent", background: isSel(d) ? "#0060AC" : "transparent", color: isSel(d) ? "#fff" : isPast(d) ? "#C1C7D3" : "#191C1E", fontWeight: 700, fontSize: 13, cursor: isPast(d) ? "not-allowed" : "pointer", fontFamily: F, display: "flex", alignItems: "center", justifyContent: "center" }}>{d}</button>
          ))}
        </div>
      </div>
      {selectedDate && (
        <div style={{ padding: "10px 12px", borderTop: "2px solid #E0E3E5" }}>
          <div style={{ fontSize: 10, fontWeight: 900, color: "#717783", fontFamily: F, textTransform: "uppercase", marginBottom: 6 }}>TIME</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {TIMES.map(t => { const sel = selectedTime === t; return (
              <button key={t} onClick={() => setSelectedTime(sel ? null : t)} className="p-btn" style={{ padding: "5px 10px", borderRadius: 999, border: sel ? BD : "2px solid #E0E3E5", background: sel ? "#0060AC" : "#fff", color: sel ? "#fff" : "#414751", fontSize: 11, fontWeight: 800, fontFamily: F, cursor: "pointer", boxShadow: sel ? SH_S : "none" }}>{t}</button>
            );})}
          </div>
        </div>
      )}
      {selectedDate && (
        <div style={{ background: "#fff", border: BD, borderRadius: 14, boxShadow: SH, padding: "14px 16px", margin: "10px 12px 12px", display: "flex", alignItems: "center", gap: 14 }}>
          <div style={{ width: 44, height: 44, borderRadius: 12, background: "#AD91FF", border: BD, boxShadow: SH_S, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }} className="p-breathe">📅</div>
          <div style={{ flex: 1 }}>
            <div style={{ fontFamily: F, fontWeight: 900, fontSize: 10, color: "#4953BC", textTransform: "uppercase", letterSpacing: ".1em" }}>DEADLINE SET</div>
            <div style={{ fontFamily: F, fontWeight: 800, fontSize: 15, color: "#191C1E", marginTop: 2 }}>
              {selectedDate.toLocaleDateString("en-US", { month: "short", day: "numeric" })}{selectedTime ? ` at ${selectedTime}` : " (end of day)"}
              <span style={{ fontSize: 9, fontWeight: 900, color: "#fff", background: "#0060AC", padding: "2px 6px", borderRadius: 4, marginLeft: 8, border: "1.5px solid #000", verticalAlign: "middle" }}>{shortTZ(LOCAL_TZ)}</span>
            </div>
          </div>
          <button onClick={() => { setSelectedDate(null); setSelectedTime(null); onChange(""); }} className="p-btn-icon" style={{ width: 28, height: 28, borderRadius: "50%", background: "#F2F4F6", border: "2px solid #000", display: "flex", alignItems: "center", justifyContent: "center", cursor: "pointer", fontSize: 12, fontWeight: 900, color: "#717783", boxShadow: SH_S, flexShrink: 0 }}>✕</button>
        </div>
      )}
    </div>
  );
}

function SuccessOverlay({ title, gameName, onDone, onSubmitAnother, batchMode }) {
  const [phase, setPhase] = useState("check");
  const onDoneRef = useRef(onDone); onDoneRef.current = onDone;
  const onAnotherRef = useRef(onSubmitAnother); onAnotherRef.current = onSubmitAnother;
  useEffect(() => { const fast = batchMode; const t1 = setTimeout(() => setPhase("rocket"), fast ? 400 : 900); const t2 = setTimeout(() => setPhase("launch"), fast ? 800 : 1800); const t3 = setTimeout(() => { if (batchMode && onAnotherRef.current) onAnotherRef.current(); else if (!batchMode) onDoneRef.current(); }, fast ? 1600 : 3800); return () => { clearTimeout(t1); clearTimeout(t2); clearTimeout(t3); }; }, [batchMode]);
  const particles = useMemo(() => Array.from({ length: 18 }, (_, i) => ({ angle: (i / 18) * 360, dist: 80 + Math.random() * 120, size: 6 + Math.random() * 10, delay: Math.random() * 0.4, emoji: ["✦","⭐","✨","💫","🔥","⚡"][Math.floor(Math.random() * 6)] })), []);

  return (
    <div style={{ position: "fixed", inset: 0, zIndex: 99998, background: "rgba(0,0,0,.75)", backdropFilter: "blur(12px)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", animation: "suc-bg .3s ease forwards" }}>
      <div style={{ position: "absolute", width: 160, height: 160, borderRadius: "50%", border: "4px solid #4ADE80", animation: "suc-ring-pulse 1.5s ease-out infinite" }} />
      <div style={{ position: "absolute", width: 160, height: 160, borderRadius: "50%", border: "4px solid #4ADE80", animation: "suc-ring-pulse 1.5s ease-out infinite .5s" }} />
      <div style={{ width: 140, height: 140, borderRadius: "50%", background: "#4ADE80", border: "4px solid #000", boxShadow: "6px 6px 0px 0px rgba(0,0,0,1)", display: "flex", alignItems: "center", justifyContent: "center", animation: "suc-circle-grow .6s cubic-bezier(.34,1.56,.64,1) forwards", position: "relative", zIndex: 5 }}>
        <svg viewBox="0 0 52 52" style={{ width: 70, height: 70 }}><path d="M14 27 L22 35 L38 18" fill="none" stroke="#000" strokeWidth="5" strokeLinecap="round" strokeLinejoin="round" strokeDasharray="60" strokeDashoffset="60" style={{ animation: "suc-check-draw .5s ease forwards .4s" }} /></svg>
      </div>
      {(phase === "rocket" || phase === "launch") && particles.map((p, i) => { const rad = (p.angle * Math.PI) / 180; return (
        <div key={i} style={{ position: "absolute", fontSize: p.size, zIndex: 4, animation: `suc-particle .8s ease-out forwards ${p.delay}s`, left: "50%", top: "50%", marginLeft: -p.size/2, marginTop: -p.size/2, "--tx": `${Math.cos(rad)*p.dist}px`, "--ty": `${Math.sin(rad)*p.dist}px` }}>{p.emoji}</div>
      );})}
      {(phase === "rocket" || phase === "launch") && (
        <div style={{ position: "absolute", left: "50%", top: "50%", fontSize: 64, zIndex: 10, lineHeight: 1, animation: phase === "launch" ? "suc-rocket 1.2s cubic-bezier(.45,.02,.84,.6) forwards" : "suc-shake .15s ease infinite" }}>
          🚀
          {phase === "launch" && <><div style={{ position: "absolute", bottom: -18, left: "50%", transform: "translateX(-50%)", fontSize: 28, animation: "suc-flame .1s ease infinite" }}>🔥</div><div style={{ position: "absolute", bottom: -38, left: "50%", transform: "translateX(-50%)", fontSize: 20, opacity: .7, animation: "suc-flame .12s ease infinite .05s" }}>🔥</div></>}
          {phase === "rocket" && <div style={{ position: "absolute", bottom: -20, left: "50%", transform: "translateX(-50%)", fontSize: 32, animation: "suc-flame .15s ease infinite" }}>🔥</div>}
        </div>
      )}
      <div style={{ marginTop: 40, textAlign: "center", position: "relative", zIndex: 6 }}>
        <h2 style={{ fontFamily: F, fontWeight: 900, fontSize: 32, color: "#fff", textTransform: "uppercase", margin: "0 0 8px", opacity: 0, animation: "suc-text-in .5s ease forwards .6s" }}>REQUEST LAUNCHED</h2>
        <p style={{ fontFamily: F, fontSize: 14, color: "rgba(255,255,255,.7)", fontWeight: 600, margin: 0, opacity: 0, animation: "suc-sub-in .4s ease forwards .9s" }}>{gameName ? gameName + " — " : ""}{title || "Your request"} is in the queue</p>
        <div style={{ display: "flex", gap: 12, marginTop: 24, justifyContent: "center", opacity: 0, animation: "suc-sub-in .4s ease forwards 1.2s" }}>
          {onSubmitAnother && <button onClick={onSubmitAnother} className="p-btn-pill" style={{ padding: "12px 28px", borderRadius: 999, border: "3px solid #000", background: "#fff", color: "#191C1E", fontFamily: F, fontWeight: 900, fontSize: 13, cursor: "pointer", textTransform: "uppercase", boxShadow: "4px 4px 0px 0px rgba(0,0,0,1)" }}>SUBMIT ANOTHER →</button>}
          <button onClick={onDone} className="p-btn" style={{ padding: "12px 24px", borderRadius: 999, border: "2px solid rgba(255,255,255,.3)", background: "transparent", color: "rgba(255,255,255,.7)", fontFamily: F, fontWeight: 700, fontSize: 12, cursor: "pointer", textTransform: "uppercase" }}>VIEW BOARD</button>
        </div>
      </div>
    </div>
  );
}

function getWeekKey(ts) { const d = new Date(ts); const jan1 = new Date(d.getFullYear(), 0, 1); return d.getFullYear() + "-W" + Math.ceil(((d - jan1) / 86400000 + jan1.getDay() + 1) / 7); }
function getWeekLabel(wk) { const now = new Date(); if (wk === getWeekKey(now)) return "This Week"; const lw = new Date(now); lw.setDate(lw.getDate() - 7); if (wk === getWeekKey(lw)) return "Last Week"; const [y, w] = wk.split("-W").map(Number); const jan1 = new Date(y, 0, 1); const s = new Date(jan1.getTime() + ((w - 1) * 7 - jan1.getDay()) * 86400000); const e = new Date(s.getTime() + 6 * 86400000); return s.toLocaleDateString("en-US",{month:"short",day:"numeric"}) + " – " + e.toLocaleDateString("en-US",{month:"short",day:"numeric"}); }
function groupByWeek(orders) { const g = new Map(); for (const o of orders) { const k = getWeekKey(o.createdAt); if (!g.has(k)) g.set(k, []); g.get(k).push(o); } return [...g.entries()]; }

const DAY_NAMES = ["SUN","MON","TUE","WED","THU","FRI","SAT"];

function useSprintDays(orders) {
  return useMemo(() => {
    const now = new Date();
    const todayStart = new Date(now.getFullYear(), now.getMonth(), now.getDate()).getTime();
    const days = [];
    for (let i = 0; i < 7; i++) {
      const d = new Date(todayStart + i * 86400000);
      days.push({ date: d, dayStart: d.getTime(), dayEnd: d.getTime() + 86400000, label: DAY_NAMES[d.getDay()], dateLabel: d.toLocaleDateString("en-US", { month: "short", day: "numeric" }), isToday: i === 0 });
    }
    const active = orders.filter(o => !TERMINAL.has(o.status) && o.dueDate);
    const overdue = [], buckets = days.map(() => []);
    for (const o of active) {
      const due = new Date(o.dueDate).getTime();
      if (due < todayStart) { overdue.push(o); continue; }
      for (let i = 0; i < 7; i++) { if (due >= days[i].dayStart && due < days[i].dayEnd) { buckets[i].push(o); break; } }
    }
    for (const b of buckets) b.sort((a, c) => new Date(a.dueDate).getTime() - new Date(c.dueDate).getTime());
    overdue.sort((a, c) => new Date(a.dueDate).getTime() - new Date(c.dueDate).getTime());
    const total = buckets.reduce((s, b) => s + b.length, 0);
    return { days, buckets, overdue, total };
  }, [orders]);
}

function SprintCalendar({ orders, gm, producerCode, dark }) {
  const { days, buckets, overdue, total: totalThisWeek } = useSprintDays(orders);
  const bg = dark ? "#0F172A" : "#fff";
  const cardBg = dark ? "#1E293B" : "#F8F9FB";
  const textPrimary = dark ? "#E2E8F0" : "#191C1E";
  const textSecondary = dark ? "#64748B" : "#717783";
  const dividerColor = dark ? "rgba(255,255,255,.06)" : "#E0E3E5";

  return (
    <div>
      <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
        <h2 style={{ fontFamily: F, fontSize: 22, fontWeight: 900, color: "#fff", textTransform: "uppercase", margin: 0 }} className="bh-section-title">📅 SPRINT CALENDAR</h2>
        <span style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: dark ? "rgba(255,255,255,.5)" : "rgba(255,255,255,.9)" }}>{totalThisWeek} due this week{overdue.length > 0 ? " · " + overdue.length + " overdue" : ""}</span>
      </div>

      {overdue.length > 0 && (
        <div style={{ marginBottom: 16, padding: "14px 16px", background: "rgba(239,68,68,.1)", border: "2px solid #EF4444", borderRadius: 14, boxShadow: SH_S }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 10 }}>
            <span style={{ fontSize: 16 }}>🚨</span>
            <span style={{ fontFamily: F, fontWeight: 900, fontSize: 12, color: "#EF4444", textTransform: "uppercase", textShadow: "-1px -1px 0 #000, 1px -1px 0 #000, -1px 1px 0 #000, 1px 1px 0 #000" }}>OVERDUE ({overdue.length})</span>
          </div>
          <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
            {overdue.map(o => { const g = gm[o.gameId]; const mine = producerCode && o.producerCode === producerCode; return (
              <div key={o.id} className="p-card-press" style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", background: cardBg, border: "2px solid #EF4444", borderRadius: 10, borderLeft: mine ? "5px solid #0060AC" : "2px solid #EF4444" }}>
                {g && <GameTag game={g} />}
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontFamily: F, fontWeight: 800, fontSize: 13, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{o.title}</div>
                  <div style={{ fontSize: 10, color: "#EF4444", fontWeight: 700, fontFamily: F }}>{dueDateLabel(o.dueDate)?.text}</div>
                </div>
                <PriorityDot priority={o.priority} />
                <StatusBadge status={o.status} />
              </div>
            );})}
          </div>
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }} className="bh-sprint-grid">
        {days.map((day, di) => {
          const tasks = buckets[di];
          const hasItems = tasks.length > 0;
          return (
            <div key={di} style={{ display: "flex", flexDirection: "column", minHeight: 160 }}>
              <div style={{ textAlign: "center", marginBottom: 8, padding: "10px 4px", background: day.isToday ? "#0060AC" : cardBg, border: day.isToday ? BD : "2px solid " + dividerColor, borderRadius: 12, boxShadow: day.isToday ? SH_S : "none" }}>
                <div style={{ fontFamily: F, fontWeight: 900, fontSize: 10, color: day.isToday ? "#fff" : textSecondary, textTransform: "uppercase", letterSpacing: ".08em" }}>{day.label}</div>
                <div style={{ fontFamily: F, fontWeight: 900, fontSize: 18, color: day.isToday ? "#fff" : textPrimary, marginTop: 2 }}>{day.date.getDate()}</div>
                {hasItems && <div style={{ marginTop: 4, fontSize: 9, fontWeight: 900, color: day.isToday ? "rgba(255,255,255,.7)" : textSecondary, fontFamily: F }}>{tasks.length} TASK{tasks.length !== 1 ? "S" : ""}</div>}
              </div>
              <div style={{ flex: 1, display: "flex", flexDirection: "column", gap: 6 }}>
                {tasks.map(o => { const g = gm[o.gameId]; const p = PRODUCERS[o.producerCode]; const mine = producerCode && o.producerCode === producerCode; return (
                  <div key={o.id} className="p-card" style={{ padding: "8px 10px", background: cardBg, border: "2px solid " + dividerColor, borderRadius: 10, borderLeft: mine ? "4px solid #0060AC" : "2px solid " + dividerColor, transition: "transform .15s ease", overflow: "hidden" }}>
                    {g && <div style={{ display: "flex", alignItems: "center", gap: 4, marginBottom: 4 }}><span style={{ width: 16, height: 16, borderRadius: 4, background: g.color, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 8, flexShrink: 0, border: "1px solid #000" }}>{g.icon}</span><span style={{ fontFamily: F, fontWeight: 800, fontSize: 9, color: g.color, textTransform: "uppercase", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{g.name}</span></div>}
                    <div style={{ fontFamily: F, fontWeight: 800, fontSize: 11, color: textPrimary, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap", marginBottom: 3 }}>{o.title}</div>
                    <div style={{ display: "flex", alignItems: "center", gap: 4, flexWrap: "wrap" }}>
                      <PriorityDot priority={o.priority} />
                      {p && <span style={{ fontSize: 9, color: textSecondary, fontWeight: 600 }}>{mine ? "You" : p.name}</span>}
                    </div>
                    {o.ref && <div style={{ fontSize: 8, color: "#AD91FF", fontWeight: 700, fontFamily: F, marginTop: 2 }}>{o.ref}</div>}
                    <div style={{ display: "flex", alignItems: "center", gap: 4, marginTop: 3 }}><span style={{ width: 6, height: 6, borderRadius: "50%", background: STATUS_META[o.status]?.color || "#94A3B8", border: "1px solid #000", flexShrink: 0 }} /><span style={{ fontSize: 8, color: textSecondary, fontWeight: 700, fontFamily: F, textTransform: "uppercase" }}>{STATUS_META[o.status]?.label}</span></div>
                  </div>
                );})}
                {!hasItems && <div style={{ flex: 1, display: "flex", alignItems: "center", justifyContent: "center", opacity: .3, fontSize: 11, color: textSecondary, fontFamily: F, fontWeight: 600 }}>—</div>}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}


function DeleteModal({ id, order, onClose, editingOrderId, cancelEditOrder, onDelete, toast }) {
  const [isDeleting, setIsDeleting] = useState(false);
  const handledRef = useRef(false);
  // Auto-close if order disappears (deleted by another session)
  useEffect(() => {
    if (!order && !handledRef.current) {
      handledRef.current = true;
      onClose();
    }
  }, [order, onClose]);
  if (!order) return null;
  const TERMINAL_LOCAL = new Set(["completed", "cancelled", "rejected"]);
  const onConfirm = async () => {
    if (isDeleting || handledRef.current) return;
    // Re-validate: must still be active when user confirms
    if (TERMINAL_LOCAL.has(order.status)) {
      toast.push("Order status changed — cannot delete", "error");
      handledRef.current = true;
      onClose();
      return;
    }
    handledRef.current = true;
    setIsDeleting(true);
    if (editingOrderId === id) cancelEditOrder();
    try {
      const result = await onDelete(id);
      if (result === 'ok') {
        toast.push("🗑️ Request deleted", "success");
      } else if (result === 'permission') {
        toast.push("Cannot delete this order", "error");
      }
      // result === 'failed' → _onSaveFail already showed "Failed to save" toast,
      // do NOT show a duplicate error here
    } catch {
      toast.push("Delete error — try again", "error");
    }
    onClose();
  };
  const onCancel = () => { if (!isDeleting) onClose(); };
  return (
    <div onClick={onCancel} style={{ position: "fixed", inset: 0, background: "rgba(0,0,0,.65)", backdropFilter: "blur(4px)", zIndex: 99998, display: "flex", alignItems: "center", justifyContent: "center", padding: 20 }}>
      <div onClick={e => e.stopPropagation()} className="p-pop" style={{ background: "#fff", border: BD, borderRadius: 16, boxShadow: SH_L, padding: "28px 32px", maxWidth: 420, width: "100%" }}>
        <div style={{ fontFamily: F, fontWeight: 900, fontSize: 18, color: "#191C1E", marginBottom: 8 }}>Delete this request?</div>
        <div style={{ fontSize: 13, color: "#414751", marginBottom: 6, fontWeight: 700 }}>"{order.title}"</div>
        <div style={{ fontSize: 12, color: "#B91C1C", marginBottom: 20, fontWeight: 700 }}>This cannot be undone.</div>
        <div style={{ display: "flex", gap: 10, justifyContent: "flex-end" }}>
          <button onClick={onCancel} disabled={isDeleting} className="p-btn" style={{ padding: "10px 20px", borderRadius: 999, background: "#F2F4F6", border: "2px solid #000", color: "#414751", fontWeight: 700, fontSize: 12, fontFamily: F, cursor: isDeleting ? "not-allowed" : "pointer", textTransform: "uppercase", opacity: isDeleting ? 0.5 : 1 }}>Cancel</button>
          <button onClick={onConfirm} disabled={isDeleting} className="p-btn" style={{ padding: "10px 20px", borderRadius: 999, background: isDeleting ? "#888" : "#B91C1C", border: "2px solid #000", color: "#fff", fontWeight: 900, fontSize: 12, fontFamily: F, cursor: isDeleting ? "not-allowed" : "pointer", textTransform: "uppercase" }}>{isDeleting ? "Deleting..." : "🗑️ Delete"}</button>
        </div>
      </div>
    </div>
  );
}

function ProducerView({ producer, producerCode, orders, games, onSubmit, onUpdateOrder, onForceUpdate, onDelete, onAddGame, onCancel, onLogout, toast }) {
  const [gameId, setGameId] = useState("");
  const [title, setTitle] = useState("");
  const [desc, setDesc] = useState("");
  const [priority, setPriority] = useState("Medium");
  const [dueDate, setDueDate] = useState("");
  const [tab, setTab] = useState("board");
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [expandedId, setExpandedId] = useState(null);
  const [historySearch, setHistorySearch] = useState("");
  const [cancelConfirm, setCancelConfirm] = useState(null);
  const [boardSearch, setBoardSearch] = useState("");
  const [boardMineOnly, setBoardMineOnly] = useState(false);
  const [prodNoteId, setProdNoteId] = useState(null);
  const [prodNoteText, setProdNoteText] = useState("");
  const [historyFilter, setHistoryFilter] = useState("all");
  const [historyLimit, setHistoryLimit] = useState(20);
  const [recentGameIds, setRecentGameIds] = useState([]);
  const [drafts, setDrafts] = useState([]);
  const [editingDraftId, setEditingDraftId] = useState(null);
  const [editingOrderId, setEditingOrderId] = useState(null);
  const [deleteConfirm, setDeleteConfirm] = useState(null);
  useEffect(() => { loadDrafts(producerCode).then(setDrafts); }, [producerCode]);
  const removeDraft = useCallback((id) => { setDrafts(prev => { const next = prev.filter(d => d.id !== id); saveDrafts(producerCode, next); return next; }); }, [producerCode]);
  const clearDraftEdit = useCallback(() => setEditingDraftId(null), []);
  const saveDraftEntry = useCallback((data) => { const id = data.id || uid(); const draft = { ...data, id, updatedAt: Date.now() }; setDrafts(prev => { const existing = prev.find(d => d.id === id); const merged = existing ? { ...draft, createdAt: existing.createdAt || Date.now() } : { ...draft, createdAt: Date.now() }; const next = existing ? prev.map(d => d.id === id ? merged : d) : [merged, ...prev]; saveDrafts(producerCode, next); return next; }); return draft; }, [producerCode]);
  const [shakeForm, setShakeForm] = useState(false);
  const [batchMode, setBatchMode] = useState(false);
  const [sessionCount, setSessionCount] = useState(0);
  const [successInfo, setSuccessInfo] = useState(null);

  useTimeTick();

  const prevStatusRef = useRef({});
  const [unseenChanges, setUnseenChanges] = useState(0);
  const [seenDeliveryIds, setSeenDeliveryIds] = useState(() => { try { const s = localStorage.getItem("bh:seen-deliveries-" + producerCode); return s ? JSON.parse(s) : []; } catch { return []; } });
  const clearUnseen = useCallback(() => setUnseenChanges(0), []);
  const switchTab = useCallback((t) => { setTab(t); setBoardSearch(""); setExpandedId(null); setProdNoteId(null); if (t !== "submit") setEditingOrderId(null); if (t === "board") clearUnseen(); if (t === "deliveries") markDeliveriesSeenRef.current(); window.scrollTo({ top: 0, behavior: "smooth" }); }, []);
  const [pendingFiles, setPendingFiles] = useState([]);
  const [uploading, setUploading] = useState(false);
  const [isDragging, setIsDragging] = useState(false);
  const fileRef = useRef(null);
  const addFiles = useCallback(async (fileList) => {
    const allowed = [...fileList].filter(f => f.size <= MAX_FILE_SIZE);
    const items = await Promise.all(allowed.map(async f => {
      let preview = null;
      if (f.type.startsWith("image/")) { try { preview = await compressImage(f); } catch {} }
      return { file: f, preview, name: f.name, size: f.size, type: f.type || "application/octet-stream" };
    }));
    setPendingFiles(p => [...p, ...items].slice(0, MAX_FILES));
  }, []);
  const handlePaste = useCallback((e) => { const blobs = []; for (const item of e.clipboardData?.items || []) { const f = item.getAsFile(); if (f) { e.preventDefault(); blobs.push(f); } } if (blobs.length) addFiles(blobs); }, [addFiles]);
  const handleDrop = useCallback((e) => { e.preventDefault(); e.stopPropagation(); addFiles([...(e.dataTransfer?.files || [])]); }, [addFiles]);
  const removeFile = useCallback((idx) => setPendingFiles(p => p.filter((_, x) => x !== idx)), []);
  const clearFiles = useCallback(() => setPendingFiles([]), []);
  const hasDraft = useMemo(() => !!(gameId || title.trim() || desc.trim() || pendingFiles.length), [gameId, title, desc, pendingFiles]);
  const gm = useMemo(() => gMap(games), [games]);
  const { myOrders, rawActiveQueue, myActive } = useMemo(() => { const my = [], aq = [], myA = []; for (const o of orders) { const mine = o.producerCode === producerCode, active = !TERMINAL.has(o.status); if (mine) { my.push(o); if (active) myA.push(o); } if (active) aq.push(o); } return { myOrders: my, rawActiveQueue: aq, myActive: myA }; }, [orders, producerCode]);
  const activeQueue = useMemo(() => { let list = rawActiveQueue; if (boardMineOnly) list = list.filter(o => o.producerCode === producerCode); if (!boardSearch.trim()) return list; const q = boardSearch.toLowerCase(); return list.filter(o => o.title.toLowerCase().includes(q) || gm[o.gameId]?.name.toLowerCase().includes(q) || PRODUCERS[o.producerCode]?.name.toLowerCase().includes(q) || (o.ref && o.ref.toLowerCase().includes(q))); }, [rawActiveQueue, boardSearch, boardMineOnly, gm, producerCode]);
  const gameGroups = useMemo(() => groupByGame(activeQueue, gm), [activeQueue, gm]);
  const queuePosMap = useMemo(() => { const m = {}; rawActiveQueue.forEach((o, i) => { m[o.id] = i + 1; }); return m; }, [rawActiveQueue]);
  const filteredHistory = useMemo(() => { let list = myOrders; if (historyFilter === "active") list = list.filter(o => !TERMINAL.has(o.status)); else if (historyFilter === "completed") list = list.filter(o => o.status === "completed"); else if (historyFilter === "cancelled") list = list.filter(o => o.status === "cancelled" || o.status === "rejected"); if (historySearch.trim()) { const q = historySearch.toLowerCase(); list = list.filter(o => o.title.toLowerCase().includes(q) || gm[o.gameId]?.name.toLowerCase().includes(q) || (o.ref && o.ref.toLowerCase().includes(q))); } return list; }, [myOrders, historySearch, historyFilter, gm]);
  const paginatedHistory = useMemo(() => [...filteredHistory].reverse().slice(0, historyLimit), [filteredHistory, historyLimit]);
  const weekGroups = useMemo(() => groupByWeek(paginatedHistory), [paginatedHistory]);
  const historyCounts = useMemo(() => { const c = { all: myOrders.length, active: 0, done: 0, cancelled: 0 }; for (const o of myOrders) { if (!TERMINAL.has(o.status)) c.active++; else if (o.status === "completed") c.done++; else c.cancelled++; } return c; }, [myOrders]);
  const deliveries = useMemo(() => myOrders.filter(o => o.deliverables?.length > 0).sort((a, b) => (b.deliverables?.[b.deliverables.length-1]?.url ? 1 : 0) - (a.deliverables?.[a.deliverables.length-1]?.url ? 1 : 0) || b.createdAt - a.createdAt), [myOrders]);
  const unseenDeliveries = useMemo(() => deliveries.filter(o => !seenDeliveryIds.includes(o.id)).length, [deliveries, seenDeliveryIds]);
  const markDeliveriesSeen = useCallback(() => { const ids = deliveries.map(o => o.id); setSeenDeliveryIds(ids); try { localStorage.setItem("bh:seen-deliveries-" + producerCode, JSON.stringify(ids)); } catch {} }, [deliveries, producerCode]);
  const markDeliveriesSeenRef = useRef(markDeliveriesSeen); markDeliveriesSeenRef.current = markDeliveriesSeen;
  useEffect(() => { const prev = prevStatusRef.current; let changed = 0; myOrders.forEach(o => { if (prev[o.id] && prev[o.id] !== o.status) { changed++; toast.push('"' + o.title + '" → ' + (STATUS_META[o.status]?.label || o.status), o.status === "rejected" ? "error" : "info"); } }); if (changed > 0 && tab !== "board") setUnseenChanges(n => n + changed);
    myOrders.forEach(o => { if (o.deliverables?.length && prev[o.id] && !TERMINAL.has(prev[o.id]) && o.status === "completed") toast.push('📦 "' + o.title + '" delivered!', "success"); }); const next = {}; myOrders.forEach(o => { next[o.id] = o.status; }); prevStatusRef.current = next; }, [myOrders, toast.push, tab]);
  useEffect(() => { setHistoryLimit(20); }, [historyFilter, historySearch]);

  const cancelTimerRef = useRef(null);
  const submittingRef = useRef(false);
  const shakeTimerRef = useRef(null);
  const submitCooldownRef = useRef(null);
  useEffect(() => { return () => { clearTimeout(shakeTimerRef.current); clearTimeout(submitCooldownRef.current); clearTimeout(cancelTimerRef.current); }; }, []);
  const submit = async () => {
    if (submittingRef.current) return;
    if (!gameId || !title.trim() || !dueDate) { setShakeForm(true); clearTimeout(shakeTimerRef.current); shakeTimerRef.current = setTimeout(() => setShakeForm(false), 500); toast.push(!gameId ? "Select a game" : !title.trim() ? "Enter a title" : "Pick a deadline", "error"); return; }
    submittingRef.current = true; clearTimeout(submitCooldownRef.current); submitCooldownRef.current = setTimeout(() => { submittingRef.current = false; }, 600);
    const gName = gm[gameId]?.name || "", tTitle = title.trim();
    const newRecent = [gameId, ...recentGameIds.filter(id => id !== gameId)].slice(0, 5);
    setRecentGameIds(newRecent);
    let uploadedFiles = [];
    if (pendingFiles.length) {
      setUploading(true);
      const results = await Promise.allSettled(pendingFiles.map(pf => uploadFile(pf.file)));
      uploadedFiles = results.filter(r => r.status === "fulfilled" && r.value).map(r => r.value);
      const failed = pendingFiles.length - uploadedFiles.length;
      if (failed > 0) toast.push(failed + " file" + (failed !== 1 ? "s" : "") + " failed to upload", "error");
      setUploading(false);
    }
    if (editingOrderId) {
      const upd = { gameId, title: tTitle, desc: desc.trim(), priority, dueDate };
      if (uploadedFiles.length) upd.files = uploadedFiles;
      if (uploadedFiles.length) { await onForceUpdate(editingOrderId, upd); }
      else onUpdateOrder(editingOrderId, upd);
      setEditingOrderId(null);
      setGameId(""); setTitle(""); setDesc(""); clearFiles(); setPriority("Medium"); setDueDate("");
      toast.push("Request updated", "success");
      switchTab("board");
    } else {
      await onSubmit({ gameId, title: tTitle, desc: desc.trim(), priority, files: uploadedFiles, dueDate });
      setSessionCount(n => n + 1);
      setSuccessInfo({ title: tTitle, gameName: gName, batchMode });
    }
    if (batchMode && !editingOrderId) { setTitle(""); setDesc(""); clearFiles(); } else if (!editingOrderId) { setGameId(""); setTitle(""); setDesc(""); clearFiles(); setPriority("Medium"); setDueDate(""); }
    if (editingDraftId) { removeDraft(editingDraftId); clearDraftEdit(); }
  };

  const submitRef = useRef(submit); submitRef.current = submit;
  useEffect(() => { if (tab !== "submit") return; const h = (e) => { if ((e.ctrlKey || e.metaKey) && e.key === "Enter") submitRef.current(); }; document.addEventListener("keydown", h); return () => document.removeEventListener("keydown", h); }, [tab]);

  const doCancel = (id) => { if (cancelConfirm === id) { onCancel(id); toast.push("Cancelled", "info"); setCancelConfirm(null); clearTimeout(cancelTimerRef.current); } else { setCancelConfirm(id); clearTimeout(cancelTimerRef.current); cancelTimerRef.current = setTimeout(() => setCancelConfirm(null), 3000); } };
  const editOrder = (o) => { setGameId(o.gameId); setTitle(o.title); setDesc(o.desc || ""); setPriority(o.priority); setDueDate(o.dueDate || ""); setPendingFiles([]); setEditingOrderId(o.id); setEditingDraftId(null); switchTab("submit"); toast.push("Editing request — update and save", "info"); };
  const cancelEditOrder = () => { setEditingOrderId(null); setGameId(""); setTitle(""); setDesc(""); clearFiles(); setPriority("Medium"); setDueDate(""); };
  // Auto-clear edit state if the order vanishes (deleted by another session/admin)
  useEffect(() => {
    if (editingOrderId && !orders.find(o => o.id === editingOrderId)) {
      cancelEditOrder();
      toast.push("Order no longer exists — edit cancelled", "info");
    }
  }, [orders, editingOrderId]);
  const cloneOrder = (o) => { setGameId(o.gameId); setTitle(o.title); setDesc(o.desc || ""); setPriority(o.priority); setDueDate(""); setPendingFiles([]); switchTab("submit"); toast.push(o.files?.length ? "Cloned (re-attach files to upload)" : "Cloned", "info"); };

  const saveDraft = useCallback(() => {
    if (!gameId && !title.trim() && !desc.trim()) { toast.push("Nothing to save", "error"); return; }
    saveDraftEntry({ id: editingDraftId || undefined, gameId, title: title.trim(), desc: desc.trim(), priority, pendingMeta: pendingFiles.map(pf => ({ name: pf.name, size: pf.size, type: pf.type })), dueDate });
    toast.push(editingDraftId ? "Draft updated" : "Saved as draft", "success");
    clearDraftEdit(); setGameId(""); setTitle(""); setDesc(""); clearFiles(); setPriority("Medium"); setDueDate("");
    switchTab("drafts");
  }, [gameId, title, desc, priority, pendingFiles, dueDate, editingDraftId, saveDraftEntry, clearDraftEdit, toast.push, switchTab]);
  const deleteDraft = useCallback((id) => { removeDraft(id); toast.push("Draft deleted", "info"); }, [removeDraft, toast.push]);
  const editDraft = useCallback((d) => { setGameId(d.gameId || ""); setTitle(d.title || ""); setDesc(d.desc || ""); setPriority(d.priority || "Medium"); setDueDate(d.dueDate || ""); setPendingFiles([]); setEditingDraftId(d.id); switchTab("submit"); toast.push("Editing draft — re-attach files if needed", "info"); }, [switchTab, toast.push]);
  const submitDraft = useCallback((d) => { if (!d.gameId || !d.title?.trim() || !d.dueDate) { editDraft(d); toast.push("Needs game, title & deadline", "error"); return; } onSubmit({ gameId: d.gameId, title: d.title, desc: d.desc || "", priority: d.priority || "Medium", files: [], dueDate: d.dueDate }); removeDraft(d.id); setSessionCount(n => n + 1); setSuccessInfo({ title: d.title, gameName: gm[d.gameId]?.name || "", batchMode: false }); }, [onSubmit, gm, removeDraft, editDraft, toast.push]);

  const closeLightbox = useCallback(() => setLightboxSrc(null), []);

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(135deg, #60A5FA 0%, #818CF8 100%)", fontFamily: "'Be Vietnam Pro', sans-serif", position: "relative" }}>
      <span style={{ position: "absolute", top: 60, left: 30, fontSize: 28, opacity: .4, color: "#AD91FF" }} className="bh-deco">✦</span>
      <span style={{ position: "absolute", top: 280, right: 20, fontSize: 48, opacity: .25, color: "#fff" }} className="bh-deco">☁️</span>
      <span style={{ position: "absolute", bottom: 120, left: 10, fontSize: 56, opacity: .2, color: "#fff" }} className="bh-deco">☁️</span>

      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 24px", background: "#60A5FA", borderBottom: BD, boxShadow: SH, position: "sticky", top: 0, zIndex: 50 }} className="bh-nav">
        <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
          <span style={{ fontFamily: F, fontSize: 22, fontWeight: 900, color: "#fff" }}>Bitohi Hub</span>
          <div style={{ display: "flex", gap: 20, alignItems: "center" }} className="bh-nav-links">
            {[["board","Live Board"],["deliveries","Deliveries"],["calendar","Calendar"],["submit","New Request"],["drafts","Drafts"],["history","History"]].map(([k,l]) => (
              <button key={k} onClick={() => switchTab(k)} className="p-nav" style={{ fontFamily: F, fontWeight: 700, fontSize: 14, background: "none", border: "none", cursor: "pointer", color: tab === k ? "#fff" : "rgba(255,255,255,.6)", borderBottom: tab === k ? "4px solid #fff" : "4px solid transparent", paddingBottom: 4, display: "flex", alignItems: "center", gap: 6 }}>
                {l}
                {k === "board" && unseenChanges > 0 && tab !== "board" && <span style={{ fontSize: 8, fontWeight: 900, color: "#fff", background: "#EF4444", borderRadius: 99, padding: "1px 5px", border: "1.5px solid #000", minWidth: 14, textAlign: "center", lineHeight: "12px" }}>{unseenChanges}</span>}
                {k === "submit" && hasDraft && tab !== "submit" && <span style={{ width: 7, height: 7, borderRadius: "50%", background: "#FACC15", border: "1.5px solid #000" }} />}
                {k === "deliveries" && unseenDeliveries > 0 && <span style={{ fontSize: 8, fontWeight: 900, color: "#fff", background: "#10B981", borderRadius: 99, padding: "1px 5px", border: "1.5px solid #000", minWidth: 14, textAlign: "center", lineHeight: "12px" }}>{unseenDeliveries}</span>}
                {k === "drafts" && drafts.length > 0 && <span style={{ fontSize: 9, fontWeight: 900, color: "#fff", background: "#AD91FF", borderRadius: 99, padding: "1px 6px", border: "1px solid #000", minWidth: 16, textAlign: "center" }}>{drafts.length}</span>}
              </button>
            ))}
          </div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <div style={{ width: 36, height: 36, background: "#fff", borderRadius: "50%", border: BD, boxShadow: SH, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 16 }} className="p-wiggle">{producer.emoji}</div>
          <button onClick={() => { if (hasDraft && !window.confirm("You have an unsaved draft. Leave anyway?")) return; onLogout(); }} className="p-btn-icon" style={{ width: 36, height: 36, background: "#fff", borderRadius: "50%", border: BD, boxShadow: SH, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 14, cursor: "pointer", color: "#414751" }}>⏻</button>
        </div>
      </nav>

      <main key={tab} style={{ maxWidth: tab === "submit" ? 960 : tab === "calendar" ? 1100 : tab === "deliveries" ? 700 : 860, margin: "0 auto", padding: "32px 24px", position: "relative" }} className="bh-main p-spring">

        {/* ── BOARD ── */}
        {tab === "board" && <>
          {myActive.length > 0 && (
            <div className="p-pop bh-hero" style={{ background: "linear-gradient(135deg, #0060AC, #674BB5)", padding: "28px 32px", borderRadius: 16, border: BD, boxShadow: SH_L, marginBottom: 32, position: "relative", overflow: "hidden" }}>
              <div style={{ position: "absolute", right: -20, top: -20, opacity: .08, fontSize: 180 }}>⚡</div>
              <div style={{ position: "relative", zIndex: 2, display: "flex", alignItems: "center", justifyContent: "space-between", flexWrap: "wrap", gap: 16 }}>
                <div>
                  <h2 style={{ fontFamily: F, fontSize: 28, fontWeight: 900, color: "#fff", textTransform: "uppercase", margin: "0 0 6px" }} className="bh-section-title">YOUR ACTIVE REQUESTS</h2>
                  <p style={{ color: "rgba(196,222,255,.8)", fontSize: 14, fontWeight: 500, margin: 0 }}>You have {myActive.length} request{myActive.length !== 1 ? "s" : ""} in the queue. {rawActiveQueue.length > 1 && <span style={{ opacity: .7 }}>~{Math.max(1, Math.ceil(rawActiveQueue.length * 0.5))}d estimated queue time</span>}</p>
                </div>
                <button onClick={() => switchTab("submit")} className="p-btn-pill bh-hero-cta" style={{ background: "#fff", color: "#0060AC", fontFamily: F, fontWeight: 900, fontSize: 14, padding: "12px 28px", borderRadius: 999, border: BD, boxShadow: SH, cursor: "pointer", textTransform: "uppercase" }}>NEW REQUEST →</button>
              </div>
            </div>
          )}
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h3 style={{ fontFamily: F, fontSize: 22, fontWeight: 900, color: "#fff", textTransform: "uppercase", margin: 0 }} className="bh-section-title">📋 {boardSearch.trim() ? activeQueue.length + " RESULT" + (activeQueue.length !== 1 ? "S" : "") : "CURRENT QUEUE"}</h3>
            <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
              <button onClick={() => setBoardMineOnly(!boardMineOnly)} className="p-btn" style={{ padding: "4px 12px", borderRadius: 999, border: boardMineOnly ? BD : "2px solid rgba(255,255,255,.3)", background: boardMineOnly ? "#fff" : "transparent", color: boardMineOnly ? "#0060AC" : "rgba(255,255,255,.7)", fontFamily: F, fontWeight: 800, fontSize: 10, cursor: "pointer", textTransform: "uppercase", boxShadow: boardMineOnly ? SH_S : "none" }}>{boardMineOnly ? "Mine (" + myActive.length + ")" : "Mine"}</button>
              <span style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.9)" }}>{rawActiveQueue.length} active</span>
            </div>
          </div>
          {rawActiveQueue.length > 4 && <div style={{ position: "relative", marginBottom: 12 }}><input placeholder="Search queue by title, game, producer, or ref..." value={boardSearch} onChange={e => setBoardSearch(e.target.value)} onKeyDown={e => { if (e.key === "Escape") setBoardSearch(""); }} className="p-input" style={{ width: "100%", padding: "10px 36px 10px 14px", background: "#fff", border: BD, borderRadius: 12, color: "#191C1E", fontSize: 13, outline: "none", fontFamily: "inherit", boxShadow: SH_S }} />{boardSearch && <button onClick={() => setBoardSearch("")} style={{ position: "absolute", right: 10, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#717783", cursor: "pointer", fontSize: 14, fontWeight: 900, padding: 4 }}>✕</button>}</div>}
          <div className="p-stagger" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
            {activeQueue.length === 0 && <div style={{ background: "#fff", border: BD, borderRadius: 16, boxShadow: SH_L, padding: 48, textAlign: "center" }}><div style={{ fontSize: 48, marginBottom: 12 }}>{boardSearch.trim() ? "🔍" : "📋"}</div><div style={{ fontFamily: F, fontSize: 16, fontWeight: 700, color: "#191C1E", marginBottom: 16 }}>{boardSearch.trim() ? "No matching requests" : "No active requests"}</div>{!boardSearch.trim() && <button onClick={() => switchTab("submit")} className="p-btn-pill" style={{ background: "linear-gradient(90deg,#4953BC,#0060AC)", color: "#fff", fontFamily: F, fontWeight: 900, fontSize: 13, padding: "12px 28px", borderRadius: 999, border: BD, boxShadow: SH, cursor: "pointer", textTransform: "uppercase" }}>Submit your first request →</button>}</div>}
            {gameGroups.map(({ game: grpGame, gameId: grpId, orders: grpOrders }) => (
              <div key={grpId}>
                {gameGroups.length > 1 && <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0 8px", padding: "0 4px" }}>
                  {grpGame ? <GameTag game={grpGame} size="md" /> : <span style={{ fontFamily: F, fontWeight: 900, fontSize: 12, color: "#fff", textTransform: "uppercase" }}>Other</span>}
                  <div style={{ flex: 1, height: 2, background: "rgba(255,255,255,.15)", borderRadius: 1 }} />
                  <span style={{ fontFamily: F, fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.5)" }}>{grpOrders.length} task{grpOrders.length !== 1 ? "s" : ""}</span>
                </div>}
                {grpOrders.map((o) => { const g = gm[o.gameId]; const p = PRODUCERS[o.producerCode]; const mine = o.producerCode === producerCode; const expanded = expandedId === o.id; const qPos = queuePosMap[o.id] || 0; return (
              <div key={o.id} onClick={() => setExpandedId(expanded ? null : o.id)} className="p-card-press p-slide-up" style={{ background: "#fff", borderRadius: 16, border: BD, boxShadow: SH, padding: "16px 20px", cursor: "pointer", borderLeft: mine ? "6px solid #0060AC" : BD, marginBottom: 8 }}>
                <div style={{ display: "flex", alignItems: "center", gap: 14 }}>
                  <div style={{ width: 36, height: 36, background: "#000", color: "#fff", borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F, fontWeight: 900, fontSize: 14, flexShrink: 0 }}>{String(qPos).padStart(2,"0")}</div>
                  <div style={{ flex: 1, minWidth: 0 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                      <span style={{ fontFamily: F, fontWeight: 900, fontSize: 16, color: "#191C1E" }}>{o.title}</span>
                      {o.ref && <span style={{ fontSize: 10, fontWeight: 700, color: "#AD91FF", fontFamily: F }}>{o.ref}</span>}
                      {gameGroups.length <= 1 && g && <GameTag game={g} />}
                    </div>
                    <div style={{ fontSize: 12, color: "#717783", fontWeight: 500, display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                      <span style={{ fontWeight: 700, color: mine ? "#0060AC" : "#717783" }}>{mine ? "You" : (p?.name||"?")}</span>
                      <span style={{ width: 3, height: 3, borderRadius: "50%", background: "#717783", display: "inline-block" }} /><span>{timeAgo(o.createdAt)}</span>
                    </div>
                    <DeadlineBar createdAt={o.createdAt} dueDate={o.dueDate} />
                  </div>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, flexShrink: 0 }}>
                    <PriorityDot priority={o.priority} /><StatusBadge status={o.status} />
                    <span style={{ color: "#717783", fontSize: 10, transition: "transform .2s", transform: expanded ? "rotate(180deg)" : "rotate(0)" }}>▼</span>
                  </div>
                </div>
                {expanded && (
                  <div style={{ marginTop: 12, paddingTop: 12, borderTop: "2px solid #E0E3E5", animation: "expand-in .3s ease both", overflow: "hidden" }} onClick={e => e.stopPropagation()}>
                    {o.desc ? <div style={{ color: "#414751", fontSize: 13, marginBottom: 8 }}>{o.desc}</div> : <div style={{ color: "#717783", fontSize: 13, fontStyle: "italic", marginBottom: 8 }}>No description</div>}
                    {o.dueDate && <div style={{ fontSize: 12, color: "#414751", marginBottom: 8, display: "flex", alignItems: "center", gap: 6 }}><span>📅</span><span style={{ fontWeight: 700 }}>{fmtInTZ(o.dueDate, LOCAL_TZ)}</span><span style={{ fontSize: 10, color: "#8792FE" }}>{shortTZ(LOCAL_TZ)}</span></div>}
                    {(o.files?.length > 0 || o.images?.length > 0 || o.imageCount > 0) && <Attachments files={o.files} images={o.images} imageCount={o.imageCount} onView={setLightboxSrc} />}
                    {o.deliverables?.length > 0 && <div style={{ marginTop: 8, padding: "10px 14px", background: "rgba(74,222,128,.08)", borderRadius: 10, borderLeft: "4px solid #4ADE80" }}><div style={{ fontFamily: F, fontWeight: 900, color: "#4ADE80", fontSize: 10, textTransform: "uppercase", marginBottom: 6 }}>✅ Finished Files</div><Attachments files={o.deliverables} onView={setLightboxSrc} /></div>}
                    {o.adminNote && <div style={{ marginTop: 8, padding: "8px 12px", background: "#F2F4F6", borderRadius: 8, borderLeft: "3px solid #0060AC" }}><span style={{ fontFamily: F, fontWeight: 800, color: "#0060AC", fontSize: 10, textTransform: "uppercase" }}>Bitohi: </span><span style={{ color: "#414751", fontSize: 12 }}>{o.adminNote}</span></div>}
                    {o.producerNote && <div style={{ marginTop: 8, padding: "8px 12px", background: "#F2F4F6", borderRadius: 8, borderLeft: "3px solid #AD91FF" }}><span style={{ fontFamily: F, fontWeight: 800, color: "#AD91FF", fontSize: 10, textTransform: "uppercase" }}>Your Note: </span><span style={{ color: "#414751", fontSize: 12 }}>{o.producerNote}</span></div>}
                    <div style={{ display: "flex", gap: 8, marginTop: 10, flexWrap: "wrap" }}>
                      {mine && !TERMINAL.has(o.status) && <button onClick={(e) => { e.stopPropagation(); editOrder(o); }} className="p-btn" style={{ padding: "6px 16px", borderRadius: 999, cursor: "pointer", background: "#FACC15", border: "2px solid #000", color: "#000", fontWeight: 700, fontSize: 11, fontFamily: F, textTransform: "uppercase" }}>✏️ Edit</button>}
                      {mine && !TERMINAL.has(o.status) && <button onClick={(e) => { e.stopPropagation(); setDeleteConfirm(o.id); }} className="p-btn" style={{ padding: "6px 16px", borderRadius: 999, cursor: "pointer", background: "#FEE2E2", border: "2px solid #B91C1C", color: "#B91C1C", fontWeight: 700, fontSize: 11, fontFamily: F, textTransform: "uppercase" }}>🗑️ Delete</button>}
                      {mine && <button onClick={(e) => { e.stopPropagation(); setGameId(o.gameId); setPriority(o.priority); setDesc("Follow-up to: " + o.title + (o.ref ? " (" + o.ref + ")" : "") + "\n"); switchTab("submit"); toast.push("Follow-up for " + (g?.name||""), "info"); }} className="p-btn" style={{ padding: "6px 16px", borderRadius: 999, cursor: "pointer", background: "#E0E0FF", border: "2px solid #000", color: "#4953BC", fontWeight: 700, fontSize: 11, fontFamily: F, textTransform: "uppercase" }}>+ Follow-up</button>}
                      {mine && !TERMINAL.has(o.status) && <button onClick={(e) => { e.stopPropagation(); setProdNoteId(prodNoteId === o.id ? null : o.id); setProdNoteText(o.producerNote || ""); }} className="p-btn" style={{ padding: "6px 16px", borderRadius: 999, cursor: "pointer", background: "#F2F4F6", border: "2px solid #000", color: "#717783", fontWeight: 700, fontSize: 11, fontFamily: F, textTransform: "uppercase" }}>💬 Note</button>}
                      {mine && o.status === "pending" && <button onClick={(e) => { e.stopPropagation(); doCancel(o.id); }} className="p-btn" style={{ padding: "6px 16px", borderRadius: 999, cursor: "pointer", background: cancelConfirm === o.id ? "#EF4444" : "#FEE2E2", border: "2px solid #000", color: cancelConfirm === o.id ? "#fff" : "#B91C1C", fontWeight: 700, fontSize: 11, fontFamily: F, textTransform: "uppercase" }}>{cancelConfirm === o.id ? "Confirm cancel?" : "Cancel"}</button>}
                    </div>
                    {mine && prodNoteId === o.id && <div style={{ marginTop: 8, display: "flex", gap: 8 }} onClick={e => e.stopPropagation()}>
                      <input value={prodNoteText} onChange={e => setProdNoteText(e.target.value)} onKeyDown={e => { if (e.key === "Enter") { onUpdateOrder(o.id, { producerNote: prodNoteText.trim() || "" }); setProdNoteId(null); toast.push(prodNoteText.trim() ? "Note saved" : "Note cleared", "success"); } }} placeholder="Add context..." className="p-input" style={{ flex: 1, padding: "8px 12px", background: "#F2F4F6", border: BD, borderRadius: 10, color: "#191C1E", fontSize: 12, outline: "none", fontFamily: "inherit" }} />
                      <button onClick={(e) => { e.stopPropagation(); onUpdateOrder(o.id, { producerNote: prodNoteText.trim() || "" }); setProdNoteId(null); toast.push(prodNoteText.trim() ? "Note saved" : "Note cleared", "success"); }} className="p-btn" style={{ padding: "6px 16px", borderRadius: 999, background: "#0060AC", border: "2px solid #000", color: "#fff", fontWeight: 900, fontSize: 11, fontFamily: F, cursor: "pointer", boxShadow: SH_S }}>Save</button>
                    </div>}
                  </div>
                )}
              </div>
            );})}
              </div>
            ))}
          </div>
        </>}

        {/* ── DELIVERIES ── */}
        {tab === "deliveries" && <div className="p-spring">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h2 style={{ fontFamily: F, fontSize: 22, fontWeight: 900, color: "#fff", textTransform: "uppercase", margin: 0 }} className="bh-section-title">📦 Deliveries</h2>
            {deliveries.length > 0 && <span style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.6)" }}>{deliveries.length} delivered</span>}
          </div>
          {deliveries.length === 0 ? (
            <div className="p-pop" style={{ background: "#fff", border: BD, borderRadius: 16, boxShadow: SH_L, padding: 48, textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📦</div>
              <div style={{ fontFamily: F, fontSize: 16, fontWeight: 700, color: "#191C1E", marginBottom: 6 }}>No deliveries yet</div>
              <div style={{ fontSize: 13, color: "#717783" }}>When Bitohi finishes your requests, files will appear here</div>
            </div>
          ) : (
            <div className="p-stagger" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {deliveries.map(o => { const g = gm[o.gameId]; const isNew = !seenDeliveryIds.includes(o.id); return (
                <div key={o.id} className="p-card p-slide-up" style={{ background: "#fff", border: BD, borderRadius: 14, boxShadow: SH, padding: "18px 20px", borderLeft: isNew ? "6px solid #10B981" : BD }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 10 }}>
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 4, flexWrap: "wrap" }}>
                        {isNew && <span style={{ fontSize: 8, fontWeight: 900, color: "#fff", background: "#10B981", borderRadius: 99, padding: "2px 8px", border: "1.5px solid #000", fontFamily: F, textTransform: "uppercase" }}>New</span>}
                        <span style={{ fontFamily: F, fontWeight: 900, fontSize: 15, color: "#191C1E" }}>{o.title}</span>
                        {o.ref && <span style={{ fontSize: 9, fontWeight: 700, color: "#AD91FF", fontFamily: F }}>{o.ref}</span>}
                      </div>
                      {g && <div style={{ marginBottom: 8 }}><GameTag game={g} /></div>}
                      {o.adminNote && <div style={{ marginTop: 4, padding: "8px 12px", background: "#F2F4F6", borderRadius: 8, borderLeft: "3px solid #0060AC", marginBottom: 8 }}><span style={{ fontFamily: F, fontWeight: 800, color: "#0060AC", fontSize: 10, textTransform: "uppercase" }}>Bitohi: </span><span style={{ color: "#414751", fontSize: 12 }}>{o.adminNote}</span></div>}
                      <div style={{ padding: "12px 14px", background: "rgba(74,222,128,.06)", borderRadius: 10, borderLeft: "4px solid #4ADE80" }}>
                        <div style={{ fontFamily: F, fontWeight: 900, color: "#10B981", fontSize: 10, textTransform: "uppercase", marginBottom: 8 }}>📁 Delivered Files</div>
                        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                          {o.deliverables.map((f, fi) => {
                            const isImg = f.type?.startsWith("image/");
                            if (isImg) return (
                              <div key={fi} style={{ position: "relative", borderRadius: 10, overflow: "hidden", border: "2px solid #000", boxShadow: SH_S }}>
                                <img src={f.url} alt={f.name} loading="lazy" style={{ width: 72, height: 72, objectFit: "cover", display: "block", cursor: "pointer" }} onClick={() => setLightboxSrc(f.url)} />
                                <a href={f.url} download={f.name} target="_blank" rel="noopener noreferrer" onClick={e => e.stopPropagation()} style={{ position: "absolute", bottom: 2, right: 2, width: 20, height: 20, borderRadius: "50%", background: "#10B981", border: "1.5px solid #000", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 10, color: "#fff", textDecoration: "none" }}>⬇</a>
                              </div>
                            );
                            return (
                              <a key={fi} href={f.url} target="_blank" rel="noopener noreferrer" download={f.name} className="p-btn" style={{ display: "flex", alignItems: "center", gap: 8, padding: "10px 14px", background: "#fff", border: "2px solid #10B981", borderRadius: 10, boxShadow: SH_S, textDecoration: "none", color: "#191C1E", fontSize: 12, fontWeight: 700, fontFamily: F, maxWidth: 280 }}>
                                <span style={{ fontSize: 18 }}><FileIcon type={f.type} /></span>
                                <span style={{ flex: 1, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{f.name}</span>
                                <span style={{ color: "#94A3B8", fontSize: 10, flexShrink: 0 }}>{formatFileSize(f.size)}</span>
                                <span style={{ fontSize: 14, color: "#10B981" }}>⬇</span>
                              </a>
                            );
                          })}
                        </div>
                      </div>
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 10, color: "#717783", fontSize: 11 }}>
                        <StatusBadge status={o.status} />
                        <span>{timeAgo(o.createdAt)}</span>
                      </div>
                    </div>
                  </div>
                </div>
              );})}</div>
          )}
        </div>}

        {/* ── CALENDAR ── */}
        {tab === "calendar" && <SprintCalendar orders={orders} gm={gm} producerCode={producerCode} dark={false} />}

        {/* ── SUBMIT ── */}
        {tab === "submit" && <div className="p-spring">
          <h2 style={{ fontFamily: F, fontSize: 24, fontWeight: 900, color: "#fff", textTransform: "uppercase", margin: "0 0 20px" }} className="bh-section-title">{editingOrderId ? "✏️ Editing Request" : editingDraftId ? "✏️ Editing Draft" : "New UI Request"}</h2>
          <div style={{ display: "flex", gap: 20, alignItems: "flex-start" }} className="bh-submit-cols">
            <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column", gap: 14, background: "#fff", border: BD, borderRadius: 16, boxShadow: SH_L, padding: 24, animation: shakeForm ? "form-shake .4s ease" : "none" }} className="bh-form-card">
              <div style={{ position: "relative", zIndex: 100 }}><Field label="Game">
                {recentGameIds.length > 0 && !gameId && <div style={{ display: "flex", gap: 6, marginBottom: 8, flexWrap: "wrap" }}>{recentGameIds.slice(0, 3).map(id => { const rg = gm[id]; return rg ? <button key={id} onClick={() => setGameId(id)} className="p-btn" style={{ padding: "5px 12px 5px 6px", borderRadius: 999, border: "2px solid #000", background: rg.color, color: "#fff", fontWeight: 800, fontSize: 10, fontFamily: F, cursor: "pointer", boxShadow: SH_S, display: "flex", alignItems: "center", gap: 5, textTransform: "uppercase" }}><span style={{ width: 16, height: 16, background: "rgba(255,255,255,.25)", borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9 }}>{rg.icon}</span>{rg.name.length > 18 ? rg.name.slice(0, 18) + "…" : rg.name}</button> : null; })}</div>}
                <GameAutocomplete games={games} value={gameId} onChange={setGameId} onAddGame={onAddGame} recentIds={recentGameIds} />
              </Field></div>
              <Field label="Task Title"><input placeholder={gameId && gm[gameId] ? gm[gameId].name + " — describe task..." : "e.g. Battle Pass Season 3 UI"} value={title} onChange={e => setTitle(e.target.value)} className="p-input" style={{ width: "100%", padding: "12px 14px", background: "#F2F4F6", border: BD, borderRadius: 12, color: "#191C1E", fontSize: 14, outline: "none", fontFamily: "inherit" }} /></Field>
              <Field label="Instructions & References">
                <div style={{ display: "flex", gap: 5, flexWrap: "wrap", marginBottom: 6 }}>
                  {["1920×1080","Match existing style","PNG transparent","See attached refs","Needs text/copy","Revision of previous"].map(s => (
                    <button key={s} onClick={() => setDesc(d => (d ? d.trimEnd() + "\n" : "") + "• " + s)} className="p-btn" style={{ padding: "3px 10px", borderRadius: 999, border: "1.5px solid #C1C7D3", background: "#fff", color: "#717783", fontSize: 9, fontWeight: 700, fontFamily: F, cursor: "pointer", textTransform: "uppercase" }}>{s}</button>
                  ))}
                </div>
                <div style={{ background: "#F2F4F6", border: BD, borderRadius: 12, overflow: "hidden" }}>
                  <textarea placeholder={"What do you need?\n• Dimensions / aspect ratio\n• Style refs or color palette\n• Key elements to include\n• Any text or copy needed"} value={desc} onChange={e => { if (e.target.value.length <= 500) setDesc(e.target.value); }} onPaste={handlePaste} rows={3} style={{ width: "100%", padding: "10px 14px", background: "transparent", border: "none", color: "#191C1E", fontSize: 13, outline: "none", fontFamily: "inherit", resize: "vertical", display: "block" }} />
                  {pendingFiles.length > 0 && <div style={{ padding: "0 12px 8px" }}><Attachments pending={pendingFiles} onRemove={removeFile} onView={setLightboxSrc} /></div>}
                  <div style={{ display: "flex", alignItems: "center", padding: "5px 12px", borderTop: "2px solid #E0E3E5" }}>
                    <button onClick={() => fileRef.current?.click()} style={{ background: "none", border: "none", cursor: "pointer", padding: "4px 8px", color: "#717783", fontSize: 16, lineHeight: 1 }}>📎</button>
                    <input ref={fileRef} type="file" multiple hidden onChange={e => { if (e.target.files) addFiles(e.target.files); e.target.value = ""; }} />
                    <span style={{ color: "#717783", fontSize: 11 }}>{pendingFiles.length ? pendingFiles.length + "/" + MAX_FILES : "Paste, drop, or 📎"}</span>
                    <span style={{ marginLeft: "auto", fontSize: 10, fontWeight: 700, color: desc.length > 450 ? "#BA1A1A" : desc.length > 300 ? "#F59E0B" : "#C1C7D3", fontFamily: F }}>{desc.length > 400 ? (500 - desc.length) + " left" : desc.length + "/500"}</span>
                  </div>
                </div>
              </Field>
              <Field label="Attachments">
                <div onDrop={e => { handleDrop(e); setIsDragging(false); }} onDragOver={e => { e.preventDefault(); e.stopPropagation(); setIsDragging(true); }} onDragLeave={() => setIsDragging(false)} onClick={() => fileRef.current?.click()} className={isDragging ? "p-dropzone-active" : "p-card-press"} style={{ border: isDragging ? "3px solid #0060AC" : "3px dashed #C1C7D3", borderRadius: 14, padding: "28px 20px", textAlign: "center", cursor: "pointer", background: isDragging ? "rgba(0,96,172,.06)" : "transparent", transition: "all .2s ease" }}>
                  <div style={{ fontSize: 40, marginBottom: 8, opacity: isDragging ? 1 : .5, transition: "opacity .2s" }}>{isDragging ? "📥" : "📁"}</div>
                  <div style={{ fontFamily: F, fontWeight: 800, fontSize: 13, color: isDragging ? "#0060AC" : "#414751", textTransform: "uppercase", marginBottom: 4 }}>{isDragging ? "Drop files here!" : "Drop files or click to upload"}</div>
                  <div style={{ fontSize: 11, color: "#717783" }}>Any file type — up to {MAX_FILES} files, 10MB each</div>
                  {pendingFiles.length > 0 && <div style={{ marginTop: 8, fontSize: 11, fontWeight: 700, color: "#0060AC" }}>{pendingFiles.length} file{pendingFiles.length !== 1 ? "s" : ""} attached</div>}
                </div>
              </Field>
              <Field label="Priority">
                <div style={{ display: "flex", gap: 6 }}>
                  {PRIORITIES.map(p => { const c = PRIORITY_COLORS[p]; const a = priority === p; return (
                    <button key={p} onClick={() => setPriority(p)} title={PRIORITY_HINTS[p]} className="p-btn" style={{ flex: 1, padding: "10px 0", borderRadius: 999, cursor: "pointer", background: a ? c : "#F2F4F6", border: "2px solid #000", color: a ? "#000" : "#717783", fontWeight: 900, fontSize: 11, fontFamily: F, textTransform: "uppercase", boxShadow: a ? SH : "none" }}>{p}</button>
                  );})}
                </div>
              {priority && <div style={{ fontSize: 10, color: PRIORITY_COLORS[priority], fontWeight: 700, fontFamily: F, marginTop: 6, paddingLeft: 4 }}>{PRIORITY_HINTS[priority]}</div>}
              </Field>
              <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between" }}>
                <label style={{ display: "flex", alignItems: "center", gap: 8, cursor: "pointer" }} onClick={() => setBatchMode(!batchMode)}>
                  <div style={{ width: 36, height: 20, borderRadius: 10, background: batchMode ? "#0060AC" : "#C1C7D3", border: "2px solid #000", position: "relative", transition: "background .2s" }}><div style={{ width: 14, height: 14, borderRadius: "50%", background: "#fff", border: "1.5px solid #000", position: "absolute", top: 1, left: batchMode ? 18 : 2, transition: "left .2s" }} /></div>
                  <span style={{ fontFamily: F, fontSize: 11, fontWeight: 800, color: batchMode ? "#0060AC" : "#717783", textTransform: "uppercase" }}>Batch Mode</span>
                </label>
                <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  {sessionCount > 0 && <span style={{ fontFamily: F, fontSize: 10, fontWeight: 900, color: "#4953BC", background: "rgba(73,83,188,.08)", padding: "3px 10px", borderRadius: 999, border: "1.5px solid #4953BC" }}>{sessionCount} submitted</span>}
                  {rawActiveQueue.length > 0 && <span style={{ fontFamily: F, fontSize: 10, fontWeight: 900, color: "#717783", background: "#F2F4F6", padding: "3px 10px", borderRadius: 999, border: "1.5px solid #C1C7D3" }}>Queue: #{rawActiveQueue.length + 1}</span>}
                </div>
              </div>
              {batchMode && <div style={{ fontSize: 11, color: "#717783", fontStyle: "italic", marginTop: 2 }}>Game, priority & deadline stay after submit</div>}
              {editingOrderId && <button onClick={cancelEditOrder} className="p-btn" style={{ padding: "10px 0", borderRadius: 999, border: "2px solid #000", background: "#FEE2E2", color: "#B91C1C", fontWeight: 900, fontSize: 12, fontFamily: F, textTransform: "uppercase", cursor: "pointer", boxShadow: SH_S, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>✕ CANCEL EDIT</button>}
              {hasDraft && !editingOrderId && <button onClick={saveDraft} className="p-btn" style={{ padding: "10px 0", borderRadius: 999, border: "2px solid #000", background: "#F2F4F6", color: "#414751", fontWeight: 900, fontSize: 12, fontFamily: F, textTransform: "uppercase", cursor: "pointer", boxShadow: SH_S, display: "flex", alignItems: "center", justifyContent: "center", gap: 6 }}>📝 {editingDraftId ? "UPDATE DRAFT" : "SAVE AS DRAFT"}</button>}
              <button onClick={submit} disabled={uploading || !gameId || !title.trim() || !dueDate} className="p-btn-pill" style={{ padding: "14px 0", borderRadius: 999, cursor: !uploading && gameId && title.trim() && dueDate ? "pointer" : "not-allowed", background: !uploading && gameId && title.trim() && dueDate ? "linear-gradient(90deg,#4953BC,#0060AC)" : "#C1C7D3", border: BD, color: "#fff", fontWeight: 900, fontSize: 14, fontFamily: F, textTransform: "uppercase", boxShadow: !uploading && gameId && title.trim() && dueDate ? SH : "none", display: "flex", alignItems: "center", justifyContent: "center", gap: 8 }}>
                <span>{uploading ? "UPLOADING FILES..." : !gameId ? "SELECT A GAME →" : !title.trim() ? "ADD A TITLE →" : !dueDate ? "PICK A DEADLINE →" : editingOrderId ? "UPDATE REQUEST" : "SUBMIT REQUEST"}</span>
                {gameId && title.trim() && dueDate && <span style={{ fontSize: 9, opacity: .6, background: "rgba(255,255,255,.2)", padding: "2px 8px", borderRadius: 4 }}>⌘↵</span>}
              </button>
            </div>
            <div style={{ width: 300, flexShrink: 0 }} className="bh-calendar">
              <Field label="Deadline">
                <div style={{ display: "flex", gap: 6, marginBottom: 10, flexWrap: "wrap" }}>
                  {[["Today EOD",()=>{const d=new Date();d.setHours(23,59,0,0);return d.toISOString();}],["Tomorrow",()=>{const d=new Date();d.setDate(d.getDate()+1);d.setHours(17,0,0,0);return d.toISOString();}],["Tue EOD",()=>{const d=new Date();const day=d.getDay();const diff=(day<=2?2-day:2+7-day)||7;d.setDate(d.getDate()+diff);d.setHours(23,59,0,0);return d.toISOString();}],["Wed EOD",()=>{const d=new Date();const day=d.getDay();const diff=(day<=3?3-day:3+7-day)||7;d.setDate(d.getDate()+diff);d.setHours(23,59,0,0);return d.toISOString();}],["Thu EOD",()=>{const d=new Date();const day=d.getDay();const diff=(day<=4?4-day:4+7-day)||7;d.setDate(d.getDate()+diff);d.setHours(23,59,0,0);return d.toISOString();}],["This Fri",()=>{const d=new Date();const day=d.getDay();const diff=(day<=5?5-day:5+7-day)||7;d.setDate(d.getDate()+diff);d.setHours(17,0,0,0);return d.toISOString();}],["Next Mon",()=>{const d=new Date();const day=d.getDay();const diff=day===0?1:8-day;d.setDate(d.getDate()+diff);d.setHours(9,0,0,0);return d.toISOString();}]].map(([label,fn])=>(
                    <button key={label} onClick={() => setDueDate(fn())} className="p-btn" style={{ padding: "5px 12px", borderRadius: 999, fontSize: 10, fontWeight: 800, fontFamily: F, textTransform: "uppercase", background: "#fff", border: "2px solid #000", color: "#414751", boxShadow: SH_S, cursor: "pointer" }}>{label}</button>
                  ))}
                </div>
                <DateTimePicker value={dueDate} onChange={setDueDate} />
              </Field>
            </div>
          </div>
        </div>}

        {/* ── DRAFTS ── */}
        {tab === "drafts" && <div className="p-spring">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 20 }}>
            <h2 style={{ fontFamily: F, fontSize: 22, fontWeight: 900, color: "#fff", textTransform: "uppercase", margin: 0 }} className="bh-section-title">📝 My Drafts</h2>
            {drafts.length > 0 && <span style={{ fontFamily: F, fontSize: 12, fontWeight: 700, color: "rgba(255,255,255,.6)" }}>{drafts.length} saved</span>}
          </div>
          {drafts.length === 0 ? (
            <div className="p-pop" style={{ background: "#fff", border: BD, borderRadius: 16, boxShadow: SH_L, padding: 48, textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📝</div>
              <div style={{ fontFamily: F, fontSize: 16, fontWeight: 700, color: "#191C1E", marginBottom: 6 }}>No drafts yet</div>
              <div style={{ fontSize: 13, color: "#717783", marginBottom: 20 }}>Start a request and save it as a draft to finish later</div>
              <button onClick={() => switchTab("submit")} className="p-btn-pill" style={{ background: "linear-gradient(90deg,#4953BC,#0060AC)", color: "#fff", fontFamily: F, fontWeight: 900, fontSize: 13, padding: "12px 28px", borderRadius: 999, border: BD, boxShadow: SH, cursor: "pointer", textTransform: "uppercase" }}>New Request →</button>
            </div>
          ) : (
            <div className="p-stagger" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
              {drafts.map(d => { const g = gm[d.gameId]; const isReady = d.gameId && d.title?.trim() && d.dueDate; return (
                <div key={d.id} className="p-card p-slide-up" style={{ background: "#fff", border: BD, borderRadius: 14, boxShadow: SH, padding: "18px 20px", borderLeft: isReady ? "6px solid #4ADE80" : "6px solid #FACC15" }}>
                  <div style={{ display: "flex", alignItems: "flex-start", gap: 14 }}>
                    {g ? <div className="p-wiggle" style={{ width: 44, height: 44, background: g.color, borderRadius: 12, border: BD, boxShadow: SH_S, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>{g.icon}</div>
                       : <div style={{ width: 44, height: 44, background: "#F2F4F6", borderRadius: 12, border: BD, boxShadow: SH_S, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 22, flexShrink: 0 }}>📝</div>}
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div style={{ fontFamily: F, fontWeight: 900, fontSize: 15, color: "#191C1E", marginBottom: 3 }}>{d.title || <span style={{ color: "#C1C7D3", fontStyle: "italic" }}>Untitled draft</span>}</div>
                      <div style={{ fontSize: 12, color: "#717783", display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                        {g && <span>{g.name}</span>}{d.priority && <PriorityDot priority={d.priority} />}<span>{timeAgo(d.updatedAt)}</span>
                        {d.dueDate && dueDateLabel(d.dueDate) && <span style={{ color: dueDateLabel(d.dueDate).color }}>{dueDateLabel(d.dueDate).text}</span>}
                      </div>
                      {d.desc && <div style={{ color: "#414751", fontSize: 12, marginTop: 6 }}>{d.desc.length > 120 ? d.desc.slice(0,120)+"..." : d.desc}</div>}
                      {(d.pendingMeta?.length > 0 || d.images?.length > 0 || d.imageCount > 0) && <div style={{ marginTop: 6, fontSize: 11, color: "#717783" }}>📎 {d.pendingMeta?.length || d.images?.length || d.imageCount} file{(d.pendingMeta?.length || d.images?.length || d.imageCount) !== 1 ? "s" : ""}</div>}
                    </div>
                    <span style={{ padding: "4px 10px", borderRadius: 999, fontSize: 9, fontWeight: 900, fontFamily: F, textTransform: "uppercase", background: isReady ? "#4ADE80" : "#FACC15", border: "2px solid #000", color: "#000" }}>{isReady ? "Ready" : "Incomplete"}</span>
                  </div>
                  <div style={{ display: "flex", gap: 8, marginTop: 14 }}>
                    {isReady && <button onClick={() => submitDraft(d)} className="p-btn-pill" style={{ padding: "8px 22px", borderRadius: 999, background: "linear-gradient(90deg,#4953BC,#0060AC)", border: "2px solid #000", color: "#fff", fontWeight: 900, fontSize: 11, fontFamily: F, cursor: "pointer", textTransform: "uppercase", boxShadow: SH_S }}>🚀 Submit</button>}
                    <button onClick={() => editDraft(d)} className="p-btn" style={{ padding: "8px 22px", borderRadius: 999, background: "#E0E0FF", border: "2px solid #000", color: "#4953BC", fontWeight: 900, fontSize: 11, fontFamily: F, cursor: "pointer", textTransform: "uppercase", boxShadow: SH_S }}>✏️ Edit</button>
                    <button onClick={() => { if (window.confirm("Delete this draft?")) deleteDraft(d.id); }} className="p-btn" style={{ padding: "8px 18px", borderRadius: 999, background: "#FEE2E2", border: "2px solid #000", color: "#B91C1C", fontWeight: 900, fontSize: 11, fontFamily: F, cursor: "pointer", textTransform: "uppercase", boxShadow: SH_S }}>🗑</button>
                  </div>
                </div>
              );})}
            </div>
          )}
        </div>}

        {/* ── HISTORY ── */}
        {tab === "history" && <div className="p-spring">
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", marginBottom: 16 }}>
            <h2 style={{ fontFamily: F, fontSize: 22, fontWeight: 900, color: "#fff", textTransform: "uppercase", margin: 0 }} className="bh-section-title">My Request History</h2>
            {myOrders.length > 0 && <div style={{ display: "flex", gap: 12, alignItems: "center" }}>
              <span style={{ fontFamily: F, fontSize: 11, fontWeight: 800, color: "rgba(255,255,255,.6)" }}>{myOrders.length} total</span>
              {historyCounts.done > 0 && <span style={{ fontFamily: F, fontSize: 11, fontWeight: 800, color: "#4ADE80" }}>{Math.round((historyCounts.done / myOrders.length) * 100)}% done</span>}
            </div>}
          </div>
          <div style={{ display: "flex", gap: 6, marginBottom: 12, flexWrap: "wrap" }} className="bh-filters">
            {[["all","All",historyCounts.all],["active","Active",historyCounts.active],["completed","Done",historyCounts.done],["cancelled","Cancelled",historyCounts.cancelled]].map(([k,l,c]) => (
              <button key={k} onClick={() => setHistoryFilter(k)} className="p-btn" style={{ padding: "5px 14px", borderRadius: 999, cursor: "pointer", fontFamily: F, fontWeight: 800, fontSize: 11, background: historyFilter===k?"#fff":"rgba(255,255,255,.15)", border: historyFilter===k?"2px solid #000":"2px solid transparent", color: historyFilter===k?"#191C1E":"rgba(255,255,255,.7)", boxShadow: historyFilter===k?SH_S:"none", textTransform: "uppercase", display: "flex", alignItems: "center", gap: 5 }}>
                {l}{c>0 && <span style={{ fontSize: 9, fontWeight: 900, background: historyFilter===k?"#0060AC":"rgba(255,255,255,.2)", color: historyFilter===k?"#fff":"rgba(255,255,255,.8)", borderRadius: 99, padding: "1px 6px" }}>{c}</span>}
              </button>
            ))}
          </div>
          {myOrders.length > 3 && <input placeholder="Search by title, game, or ref..." value={historySearch} onChange={e => setHistorySearch(e.target.value)} onKeyDown={e => { if (e.key === "Escape") setHistorySearch(""); }} className="p-input" style={{ width: "100%", padding: "10px 14px", background: "#fff", border: BD, borderRadius: 12, color: "#191C1E", fontSize: 13, outline: "none", fontFamily: "inherit", marginBottom: 14, boxShadow: SH }} />}
          {myOrders.length === 0 ? (
            <div style={{ background: "#fff", border: BD, borderRadius: 16, boxShadow: SH_L, padding: 48, textAlign: "center" }}>
              <div style={{ fontSize: 48, marginBottom: 12 }}>📭</div><div style={{ fontFamily: F, fontSize: 16, fontWeight: 700, color: "#191C1E", marginBottom: 16 }}>No requests yet</div>
              <button onClick={() => switchTab("submit")} className="p-btn-pill" style={{ background: "linear-gradient(90deg,#4953BC,#0060AC)", color: "#fff", fontFamily: F, fontWeight: 900, fontSize: 13, padding: "12px 28px", borderRadius: 999, border: BD, boxShadow: SH, cursor: "pointer", textTransform: "uppercase" }}>Create your first request →</button>
            </div>
          ) : (
            <div className="p-stagger" style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              {weekGroups.map(([wk, wOrders]) => (
                <div key={wk}>
                  <div style={{ display: "flex", alignItems: "center", gap: 10, margin: "16px 0 8px", padding: "0 4px" }}>
                    <span style={{ fontFamily: F, fontSize: 11, fontWeight: 900, color: "rgba(255,255,255,.9)", textTransform: "uppercase", letterSpacing: ".08em" }}>{getWeekLabel(wk)}</span>
                    <div style={{ flex: 1, height: 2, background: "rgba(255,255,255,.15)", borderRadius: 1 }} />
                    <span style={{ fontSize: 10, fontWeight: 700, color: "rgba(255,255,255,.5)" }}>{wOrders.length} task{wOrders.length !== 1 ? "s" : ""}</span>
                  </div>
                  {wOrders.map(o => { const g = gm[o.gameId]; return (
                    <div key={o.id} className="p-card p-slide-up" style={{ padding: "16px 18px", background: "#fff", border: BD, borderRadius: 12, boxShadow: SH, marginBottom: 8 }}>
                      <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 6, flexWrap: "wrap" }}>
                        <span style={{ fontFamily: F, color: "#191C1E", fontSize: 14, fontWeight: 900 }}>{o.title}{o.ref && <span style={{ fontSize: 9, fontWeight: 700, color: "#AD91FF", marginLeft: 6 }}>{o.ref}</span>}</span>
                        {g && <GameTag game={g} />}
                        <span style={{ marginLeft: "auto" }}><StatusBadge status={o.status} /></span>
                      </div>
                      {o.desc && <div style={{ color: "#414751", fontSize: 12, marginTop: 4 }}>{o.desc}</div>}
                      {(o.files?.length > 0 || o.images?.length > 0 || o.imageCount > 0) && <Attachments files={o.files} images={o.images} imageCount={o.imageCount} onView={setLightboxSrc} />}
                    {o.deliverables?.length > 0 && <div style={{ marginTop: 8, padding: "10px 14px", background: "rgba(74,222,128,.08)", borderRadius: 10, borderLeft: "4px solid #4ADE80" }}><div style={{ fontFamily: F, fontWeight: 900, color: "#4ADE80", fontSize: 10, textTransform: "uppercase", marginBottom: 6 }}>✅ Finished Files</div><Attachments files={o.deliverables} onView={setLightboxSrc} /></div>}
                      <div style={{ display: "flex", alignItems: "center", gap: 10, marginTop: 8, color: "#717783", fontSize: 11, flexWrap: "wrap" }}>
                        <PriorityDot priority={o.priority} /><span>{timeAgo(o.createdAt)}</span>
                      </div>
                      <DeadlineBar createdAt={o.createdAt} dueDate={o.dueDate} />
                      {o.adminNote && <div style={{ marginTop: 8, padding: "8px 12px", background: "#F2F4F6", borderRadius: 8, borderLeft: "3px solid #0060AC" }}><span style={{ fontFamily: F, fontWeight: 800, color: "#0060AC", fontSize: 10, textTransform: "uppercase" }}>BITOHI</span> <span style={{ color: "#414751", fontSize: 12 }}>{o.adminNote}</span></div>}
                      <div style={{ display: "flex", gap: 8, marginTop: 10 }}>
                        <button onClick={() => cloneOrder(o)} className="p-btn" style={{ padding: "6px 16px", borderRadius: 999, cursor: "pointer", background: "#E0E0FF", border: "2px solid #000", color: "#4953BC", fontWeight: 700, fontSize: 11, fontFamily: F, textTransform: "uppercase" }}>↻ Clone</button>
                        {o.status === "pending" && <button onClick={() => doCancel(o.id)} className="p-btn" style={{ padding: "6px 16px", borderRadius: 999, cursor: "pointer", background: cancelConfirm===o.id?"#EF4444":"#FEE2E2", border: "2px solid #000", color: cancelConfirm===o.id?"#fff":"#B91C1C", fontWeight: 700, fontSize: 11, fontFamily: F, textTransform: "uppercase" }}>{cancelConfirm===o.id?"Confirm?":"Cancel"}</button>}
                      </div>
                    </div>
                  );})}
                </div>
              ))}
              {historyLimit < filteredHistory.length && <button onClick={() => setHistoryLimit(l=>l+20)} className="p-btn-pill" style={{ width: "100%", padding: "14px 0", marginTop: 8, borderRadius: 999, background: "#fff", border: BD, boxShadow: SH, cursor: "pointer", fontFamily: F, fontWeight: 900, fontSize: 12, color: "#414751", textTransform: "uppercase" }}>Load More ({filteredHistory.length - historyLimit} remaining)</button>}
            </div>
          )}
        </div>}
      </main>

      {tab !== "submit" && <button onClick={() => switchTab("submit")} className="p-fab" style={{ position: "fixed", bottom: 28, right: 28, width: 56, height: 56, background: "#AD91FF", borderRadius: "50%", border: BD, boxShadow: SH_L, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 28, color: "#fff", cursor: "pointer", zIndex: 60 }}>+</button>}
      <Lightbox src={lightboxSrc} onClose={closeLightbox} />
      {successInfo && <SuccessOverlay title={successInfo.title} gameName={successInfo.gameName} batchMode={successInfo.batchMode} onDone={() => { setSuccessInfo(null); switchTab("board"); }} onSubmitAnother={() => { setSuccessInfo(null); switchTab("submit"); }} />}
      {deleteConfirm && <DeleteModal id={deleteConfirm} order={orders.find(x => x.id === deleteConfirm)} onClose={() => setDeleteConfirm(null)} editingOrderId={editingOrderId} cancelEditOrder={cancelEditOrder} onDelete={onDelete} toast={toast} />}
    </div>
  );
}

function AdminView({ orders, games, onUpdateOrder, onForceUpdate, onUpdateGames, onLogout, toast }) {
  const [filter, setFilter] = useState("active");
  const [noteId, setNoteId] = useState(null);
  const [noteText, setNoteText] = useState("");
  const [showGM, setShowGM] = useState(false);
  const [showCal, setShowCal] = useState(false);
  const [ngName, setNgName] = useState(""); const [ngIcon, setNgIcon] = useState("🎮"); const [ngColor, setNgColor] = useState("#3B82F6");
  const [lightboxSrc, setLightboxSrc] = useState(null);
  const [adminSearch, setAdminSearch] = useState("");
  const [adminLimit, setAdminLimit] = useState(20);
  const [adminUploading, setAdminUploading] = useState(null);
  const adminFileRef = useRef(null);
  const adminFileTargetRef = useRef(null);
  const closeLightbox = useCallback(() => setLightboxSrc(null), []);
  useTimeTick();

  const gm = useMemo(() => gMap(games), [games]);
  const preFiltered = useMemo(() => filter === "active" ? orders.filter(o => !TERMINAL.has(o.status)) : filter === "all" ? orders : orders.filter(o => o.status === filter), [orders, filter]);
  const filtered = useMemo(() => { if (!adminSearch.trim()) return preFiltered; const q = adminSearch.toLowerCase(); return preFiltered.filter(o => o.title.toLowerCase().includes(q) || gm[o.gameId]?.name.toLowerCase().includes(q) || PRODUCERS[o.producerCode]?.name.toLowerCase().includes(q) || (o.ref && o.ref.toLowerCase().includes(q))); }, [preFiltered, adminSearch, gm]);
  const paginated = useMemo(() => filtered.slice(0, adminLimit), [filtered, adminLimit]);
  const stats = useMemo(() => { const s = { total: orders.length, pending: 0, active: 0, done: 0, inProgress: 0, review: 0 }; for (const o of orders) { if (o.status === "pending") s.pending++; else if (o.status === "completed") s.done++; else if (o.status === "in-progress") { s.active++; s.inProgress++; } else if (o.status === "review") { s.active++; s.review++; } else if (o.status === "accepted") s.active++; } return s; }, [orders]);
  useEffect(() => { setAdminLimit(20); setNoteId(null); }, [filter, adminSearch]);
  const addGame = () => { if (!ngName.trim()) return; let id = ngName.trim().toLowerCase().replace(/[^a-z0-9]+/g,"-"); if (games.some(g => g.id === id)) id += "-" + Date.now().toString(36).slice(-4); onUpdateGames([...games, { id, name: ngName.trim(), icon: ngIcon, color: ngColor }]); setNgName(""); setNgIcon("🎮"); setNgColor("#3B82F6"); toast.push("Game added", "success"); };
  const statusAction = (id, status) => {
    toast.push("Moved to " + (STATUS_META[status]?.label || status), "success");
    onForceUpdate(id, { status });
  };
  const triggerAttach = (id, andComplete) => { adminFileTargetRef.current = { id, complete: andComplete }; adminFileRef.current?.click(); };
  const handleAdminFile = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = "";
    if (!file || !adminFileTargetRef.current) return;
    const { id, complete } = adminFileTargetRef.current;
    adminFileTargetRef.current = null;
    if (file.size > MAX_FILE_SIZE) { toast.push("File too large (max 10MB)", "error"); return; }
    setAdminUploading(id);
    const uploaded = await uploadFile(file);
    setAdminUploading(null);
    if (!uploaded) { toast.push("Upload failed", "error"); return; }
    const order = orders.find(o => o.id === id);
    const existing = order?.deliverables || [];
    const upd = { deliverables: [...existing, uploaded] };
    if (complete) upd.status = "completed";
    const ok = await onForceUpdate(id, upd);
    if (ok) toast.push(complete ? "✅ Delivered — file saved globally" : "📎 File attached + saved", "success");
    else toast.push("File uploaded but save failed — try again", "error");
  };

  return (
    <div style={{ minHeight: "100vh", background: "linear-gradient(160deg, #1E293B 0%, #0F172A 50%, #1a1040 100%)", fontFamily: "'Be Vietnam Pro', sans-serif" }}>
      <nav style={{ display: "flex", justifyContent: "space-between", alignItems: "center", padding: "12px 24px", background: "#0F172A", borderBottom: BD, boxShadow: SH, position: "sticky", top: 0, zIndex: 50 }} className="bh-nav">
        <div style={{ display: "flex", alignItems: "center", gap: 16 }}>
          <div className="p-wiggle" style={{ width: 40, height: 40, borderRadius: 12, background: "linear-gradient(135deg,#60A5FA,#0060AC)", border: BD, boxShadow: SH_S, display: "flex", alignItems: "center", justifyContent: "center", fontFamily: F, fontSize: 18, fontWeight: 900, color: "#fff", fontStyle: "italic" }}>B</div>
          <div><span style={{ fontFamily: F, fontSize: 18, fontWeight: 900, color: "#fff" }}>Bitohi Admin</span><div style={{ fontSize: 11, color: "#64748B" }}>Misfits Gaming Studio</div></div>
        </div>
        <div style={{ display: "flex", gap: 8 }}>
          <button onClick={() => setShowCal(!showCal)} className="p-btn" style={{ padding: "8px 16px", borderRadius: 999, background: showCal ? "#60A5FA" : "#1E293B", border: BD, boxShadow: SH_S, color: "#fff", fontFamily: F, fontWeight: 800, fontSize: 11, cursor: "pointer", textTransform: "uppercase" }}>📅 Sprint</button>
          <button onClick={() => setShowGM(!showGM)} className="p-btn" style={{ padding: "8px 16px", borderRadius: 999, background: showGM ? "#AD91FF" : "#1E293B", border: BD, boxShadow: SH_S, color: "#fff", fontFamily: F, fontWeight: 800, fontSize: 11, cursor: "pointer", textTransform: "uppercase" }}>🎮 Games</button>
          <button onClick={onLogout} className="p-btn" style={{ padding: "8px 16px", borderRadius: 999, background: "#1E293B", border: BD, boxShadow: SH_S, color: "#94A3B8", fontFamily: F, fontWeight: 800, fontSize: 11, cursor: "pointer", textTransform: "uppercase" }}>Sign Out</button>
        </div>
      </nav>
      <main style={{ maxWidth: 920, margin: "0 auto", padding: "28px 24px" }} className="p-spring">
        <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 24 }}>
          {[{l:"Total",v:stats.total,bg:"#fff",c:"#191C1E"},{l:"Pending",v:stats.pending,bg:"#FACC15",c:"#000"},{l:"Active",v:stats.active,bg:"#60A5FA",c:"#000"},{l:"Done",v:stats.done,bg:"#4ADE80",c:"#000"}].map(s=>(
            <div key={s.l} className="p-card" style={{ padding: "18px 16px", background: s.bg, border: BD, borderRadius: 14, textAlign: "center", boxShadow: SH }}><div style={{ fontSize: 32, fontWeight: 900, color: s.c, fontFamily: F }}>{s.v}</div><div style={{ fontSize: 10, color: s.c, fontWeight: 800, textTransform: "uppercase", fontFamily: F, opacity: .6 }}>{s.l}</div></div>
          ))}
        </div>
        {showCal && <div className="p-pop" style={{ marginBottom: 24, padding: "20px 16px" }}><SprintCalendar orders={orders} gm={gm} producerCode={null} dark={true} /></div>}
        {showGM && <div className="p-pop" style={{ marginBottom: 24, padding: 20, background: "#fff", border: BD, borderRadius: 14, boxShadow: SH_L }}>
          <h3 style={{ fontFamily: F, color: "#191C1E", fontSize: 14, fontWeight: 900, margin: "0 0 14px", textTransform: "uppercase" }}>🎮 Manage Games</h3>
          <div style={{ display: "flex", flexWrap: "wrap", gap: 8, marginBottom: 16 }}>{games.filter(Boolean).map(g=><div key={g.id} className="p-chip" style={{ display: "flex", alignItems: "center", gap: 8, padding: "6px 12px", background: "#F2F4F6", border: "2px solid #000", borderRadius: 999 }}><GameIcon game={g} size={20} /><span style={{ color: "#191C1E", fontSize: 12, fontWeight: 700, fontFamily: F }}>{g.name}</span><button onClick={()=>onUpdateGames(games.filter(x=>x.id!==g.id))} className="p-btn-icon" style={{ background: "none", border: "none", color: "#BA1A1A", cursor: "pointer", fontSize: 14, fontWeight: 900, padding: "0 2px" }}>×</button></div>)}</div>
          <div style={{ display: "flex", gap: 8, alignItems: "center" }}>
            <input value={ngIcon} onChange={e=>setNgIcon(e.target.value)} style={{ width: 44, padding: "8px 0", textAlign: "center", background: "#F2F4F6", border: BD, borderRadius: 10, color: "#191C1E", fontSize: 18, outline: "none" }} />
            <input value={ngColor} onChange={e=>setNgColor(e.target.value)} type="color" style={{ width: 36, height: 36, border: BD, borderRadius: 8, cursor: "pointer", background: "none" }} />
            <input placeholder="Game name" value={ngName} onChange={e=>setNgName(e.target.value)} onKeyDown={e=>e.key==="Enter"&&addGame()} className="p-input" style={{ flex: 1, padding: "8px 12px", background: "#F2F4F6", border: BD, borderRadius: 10, color: "#191C1E", fontSize: 13, outline: "none", fontFamily: "inherit" }} />
            <button onClick={addGame} className="p-btn-pill" style={{ padding: "8px 20px", borderRadius: 999, background: "linear-gradient(90deg,#4953BC,#0060AC)", border: BD, boxShadow: SH_S, color: "#fff", fontWeight: 900, fontSize: 12, fontFamily: F, cursor: "pointer", textTransform: "uppercase" }}>Add</button>
          </div>
        </div>}
        <div style={{ position: "relative" }}><input placeholder="Search by title, game, producer, or ref..." value={adminSearch} onChange={e=>setAdminSearch(e.target.value)} onKeyDown={e=>{if(e.key==="Escape")setAdminSearch("");}} className="p-input" style={{ width: "100%", padding: "12px 40px 12px 16px", background: "#1E293B", border: BD, borderRadius: 12, color: "#E2E8F0", fontSize: 13, outline: "none", fontFamily: "inherit", marginBottom: 14, boxShadow: SH }} />{adminSearch && <button onClick={()=>setAdminSearch("")} style={{ position: "absolute", right: 12, top: "50%", transform: "translateY(-50%)", background: "none", border: "none", color: "#64748B", cursor: "pointer", fontSize: 16, fontWeight: 900, padding: 4 }}>✕</button>}</div>
        <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }} className="bh-filters">
          {[["active","Active",stats.pending+stats.active],["pending","Pending",stats.pending],["in-progress","Working",stats.inProgress],["review","Review",stats.review],["completed","Done",stats.done],["all","All",stats.total]].map(([k,l,cnt])=>(
            <button key={k} onClick={()=>setFilter(k)} className="p-btn" style={{ padding: "6px 16px", borderRadius: 999, cursor: "pointer", background: filter===k?"#fff":"#1E293B", border: filter===k?BD:"2px solid #334155", color: filter===k?"#191C1E":"#94A3B8", fontWeight: 900, fontSize: 11, fontFamily: F, textTransform: "uppercase", boxShadow: filter===k?SH_S:"none", display: "flex", alignItems: "center", gap: 5 }}>{l}{cnt>0&&<span style={{ fontSize: 9, fontWeight: 900, color: filter===k?"#fff":"#64748B", background: filter===k?"#0060AC":"#334155", borderRadius: 99, padding: "1px 7px" }}>{cnt}</span>}</button>
          ))}
        </div>
        <div className="p-stagger" style={{ display: "flex", flexDirection: "column", gap: 12 }}>
          {filtered.length===0&&<div style={{ background: "#1E293B", border: BD, borderRadius: 16, boxShadow: SH_L, padding: 48, textAlign: "center" }}><div style={{ fontSize: 40, marginBottom: 12 }}>{adminSearch?"🔍":"✅"}</div><div style={{ fontFamily: F, fontSize: 15, fontWeight: 700, color: "#94A3B8" }}>{adminSearch?"No results":"No orders here"}</div></div>}
          {paginated.map(o=>{const g=gm[o.gameId];const p=PRODUCERS[o.producerCode];const pTZ=o.tz;const dTZ=pTZ&&pTZ!==LOCAL_TZ;return(
            <div key={o.id} className="p-card p-slide-up" style={{ padding: "18px 20px", background: "#1E293B", border: BD, borderRadius: 14, boxShadow: SH }}>
              <div style={{ display: "flex", alignItems: "flex-start", gap: 14, marginBottom: 10 }}>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 5, flexWrap: "wrap" }}><span style={{ fontFamily: F, color: "#E2E8F0", fontSize: 15, fontWeight: 900 }}>{o.title}{o.ref&&<span style={{ fontSize: 9, fontWeight: 700, color: "#AD91FF", marginLeft: 8 }}>{o.ref}</span>}</span>{g&&<GameTag game={g} />}<PriorityDot priority={o.priority} /></div>
                  <div style={{ color: "#64748B", fontSize: 12, display: "flex", alignItems: "center", gap: 5, flexWrap: "wrap" }}>
                    <span style={{ fontWeight: 700, color: "#60A5FA" }}>{p?.emoji} {p?.name||"?"}</span><span style={{ color: "#475569" }}>({p?.role})</span>
                    {dTZ&&<span style={{ fontSize: 9, fontWeight: 800, color: "#AD91FF", background: "rgba(173,145,255,.15)", padding: "1px 7px", borderRadius: 999, border: "1px solid #AD91FF" }}>{shortTZ(pTZ)}</span>}
                    <span style={{ color: "#475569" }}>• {timeAgo(o.createdAt)}</span>
                  </div>
                  {o.dueDate&&<DeadlineBar createdAt={o.createdAt} dueDate={o.dueDate} />}
                  {o.dueDate&&dTZ&&<div style={{ fontSize: 10, color: "#64748B", marginTop: 4 }}>📅 {fmtInTZ(o.dueDate, LOCAL_TZ)} → {fmtInTZ(o.dueDate, pTZ)} ({shortTZ(pTZ)})</div>}
                  {o.desc&&<div style={{ color: "#94A3B8", fontSize: 12, marginTop: 6 }}>{o.desc}</div>}
                  {(o.files?.length>0||o.images?.length>0||o.imageCount>0)&&<Attachments files={o.files} images={o.images} imageCount={o.imageCount} onView={setLightboxSrc} />}
                  {o.deliverables?.length>0&&<div style={{ marginTop: 8 }}><div style={{ fontSize: 9, fontWeight: 900, color: "#4ADE80", fontFamily: F, textTransform: "uppercase", marginBottom: 4 }}>✅ Deliverables</div><Attachments files={o.deliverables} onView={setLightboxSrc} /></div>}
                </div>
                <StatusBadge status={o.status} />
              </div>
              <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
                {o.status==="pending"&&<><button onClick={()=>statusAction(o.id,"accepted")} className="p-btn" style={{ padding: "6px 18px", borderRadius: 999, background: "#60A5FA", border: "2px solid #000", color: "#000", fontWeight: 900, fontSize: 11, fontFamily: F, cursor: "pointer", textTransform: "uppercase", boxShadow: SH_S }}>Accept</button><button onClick={()=>statusAction(o.id,"rejected")} className="p-btn" style={{ padding: "6px 18px", borderRadius: 999, background: "#F87171", border: "2px solid #000", color: "#000", fontWeight: 900, fontSize: 11, fontFamily: F, cursor: "pointer", textTransform: "uppercase", boxShadow: SH_S }}>Reject</button></>}
                {o.status==="accepted"&&<button onClick={()=>statusAction(o.id,"in-progress")} className="p-btn" style={{ padding: "6px 18px", borderRadius: 999, background: "#FACC15", border: "2px solid #000", color: "#000", fontWeight: 900, fontSize: 11, fontFamily: F, cursor: "pointer", textTransform: "uppercase", boxShadow: SH_S }}>▶ Start</button>}
                {o.status==="in-progress"&&<button onClick={()=>statusAction(o.id,"review")} className="p-btn" style={{ padding: "6px 18px", borderRadius: 999, background: "#AD91FF", border: "2px solid #000", color: "#000", fontWeight: 900, fontSize: 11, fontFamily: F, cursor: "pointer", textTransform: "uppercase", boxShadow: SH_S }}>To Review</button>}
                {o.status==="review"&&<><button onClick={()=>statusAction(o.id,"completed")} className="p-btn" style={{ padding: "6px 18px", borderRadius: 999, background: "#4ADE80", border: "2px solid #000", color: "#000", fontWeight: 900, fontSize: 11, fontFamily: F, cursor: "pointer", textTransform: "uppercase", boxShadow: SH_S }}>✓ Done</button><button onClick={()=>triggerAttach(o.id, true)} disabled={adminUploading===o.id} className="p-btn" style={{ padding: "6px 18px", borderRadius: 999, background: "#10B981", border: "2px solid #000", color: "#fff", fontWeight: 900, fontSize: 11, fontFamily: F, cursor: "pointer", textTransform: "uppercase", boxShadow: SH_S }}>{adminUploading===o.id ? "Uploading..." : "✓ Done + 📎 File"}</button></>}
                {o.status==="completed"&&<button onClick={()=>statusAction(o.id,"review")} className="p-btn" style={{ padding: "6px 18px", borderRadius: 999, background: "#AD91FF", border: "2px solid #000", color: "#000", fontWeight: 900, fontSize: 11, fontFamily: F, cursor: "pointer", textTransform: "uppercase", boxShadow: SH_S }}>↩ Reopen</button>}
                {!TERMINAL.has(o.status)&&<><button onClick={()=>triggerAttach(o.id, false)} disabled={adminUploading===o.id} className="p-btn" style={{ padding: "6px 18px", borderRadius: 999, background: "#1E40AF", border: "2px solid #000", color: "#fff", fontWeight: 900, fontSize: 11, fontFamily: F, cursor: "pointer", textTransform: "uppercase", boxShadow: SH_S }}>{adminUploading===o.id ? "Uploading..." : "📎 Attach"}</button><button onClick={()=>{setNoteId(noteId===o.id?null:o.id);setNoteText(o.adminNote||"");}} className="p-btn" style={{ padding: "6px 18px", borderRadius: 999, background: "#334155", border: "2px solid #000", color: "#E2E8F0", fontWeight: 900, fontSize: 11, fontFamily: F, cursor: "pointer", textTransform: "uppercase", boxShadow: SH_S }}>💬 Note</button></>}
              </div>
              {noteId===o.id&&<div style={{ display: "flex", gap: 8, marginTop: 12 }}>
                <input value={noteText} onChange={e=>setNoteText(e.target.value)} onKeyDown={e=>{if(e.key==="Enter"){onUpdateOrder(o.id,{adminNote:noteText.trim()});setNoteId(null);toast.push(noteText.trim()?"Note saved":"Note cleared","success");}}} placeholder="Note for producer..." className="p-input" style={{ flex: 1, padding: "10px 14px", background: "#0F172A", border: BD, borderRadius: 10, color: "#E2E8F0", fontSize: 12, outline: "none", fontFamily: "inherit" }} />
                <button onClick={()=>{onUpdateOrder(o.id,{adminNote:noteText.trim()});setNoteId(null);toast.push(noteText.trim()?"Saved":"Cleared","success");}} className="p-btn" style={{ padding: "8px 20px", borderRadius: 999, background: "#60A5FA", border: "2px solid #000", color: "#000", fontWeight: 900, fontSize: 11, fontFamily: F, cursor: "pointer", boxShadow: SH_S }}>Save</button>
              </div>}
              {o.producerNote&&<div style={{ marginTop: 10, padding: "10px 14px", background: "rgba(173,145,255,.08)", borderRadius: 10, borderLeft: "4px solid #AD91FF" }}><span style={{ fontFamily: F, fontWeight: 900, color: "#AD91FF", fontSize: 10, textTransform: "uppercase" }}>Producer Note: </span><span style={{ color: "#CBD5E1", fontSize: 12 }}>{o.producerNote}</span></div>}
              {o.adminNote&&noteId!==o.id&&<div style={{ marginTop: 10, padding: "10px 14px", background: "rgba(96,165,250,.08)", borderRadius: 10, borderLeft: "4px solid #60A5FA" }}><span style={{ fontFamily: F, fontWeight: 900, color: "#60A5FA", fontSize: 10, textTransform: "uppercase" }}>Your Note: </span><span style={{ color: "#CBD5E1", fontSize: 12 }}>{o.adminNote}</span></div>}
            </div>
          );})}
          {adminLimit<filtered.length&&<button onClick={()=>setAdminLimit(l=>l+20)} className="p-btn-pill" style={{ width: "100%", padding: "14px 0", borderRadius: 999, marginTop: 8, background: "#1E293B", border: BD, boxShadow: SH, cursor: "pointer", fontFamily: F, fontWeight: 900, fontSize: 12, color: "#94A3B8", textTransform: "uppercase" }}>Load More ({filtered.length-adminLimit} remaining)</button>}
        </div>
      </main>
      <Lightbox src={lightboxSrc} onClose={closeLightbox} />
      <input ref={adminFileRef} type="file" hidden onChange={handleAdminFile} />
    </div>
  );
}

function LoginScreen({ onLogin }) {
  const [code, setCode] = useState(""); const [error, setError] = useState(""); const [focused, setFocused] = useState(false); const [shakeKey, setShakeKey] = useState(0);

  const preview = useMemo(() => { const c = code.trim(); if (PRODUCERS[c]) return PRODUCERS[c]; if (c.toLowerCase() === ADMIN_CODE) return { name: "Bitohi", emoji: "🎨", role: "Admin" }; return null; }, [code]);
  const login = () => { const c = code.trim(); if (c.toLowerCase() === ADMIN_CODE) { onLogin("admin", c.toLowerCase()); return; } if (PRODUCERS[c]) { onLogin("producer", c); return; } setError("Invalid code."); setShakeKey(k => k + 1); };

  return (
    <div style={{ minHeight: "100vh", background: "#64A8FE", display: "flex", alignItems: "center", justifyContent: "center", padding: 24, position: "relative", overflow: "hidden" }}>
      <div style={{ position: "absolute", inset: 0, pointerEvents: "none" }}>
        <span style={{ position: "absolute", top: "8%", left: "10%", fontSize: 28, opacity: .5, animation: "bh-sparkle 2.5s ease-in-out infinite" }}>✦</span>
        <span style={{ position: "absolute", top: "22%", right: "14%", fontSize: 18, opacity: .4, animation: "bh-sparkle 3s ease-in-out infinite .6s" }}>⭐</span>
        <span style={{ position: "absolute", bottom: "18%", left: "22%", fontSize: 32, opacity: .5, animation: "bh-sparkle 2.8s ease-in-out infinite 1.2s" }}>✨</span>
      </div>
      <main style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 400 }} className="p-spring">
        <div className="p-pop" style={{ background: "#fff", border: BD, borderRadius: 16, padding: "40px 40px 36px", display: "flex", flexDirection: "column", alignItems: "center", boxShadow: SH_LG }}>
          <div style={{ width: 64, height: 64, borderRadius: 16, border: BD, background: "linear-gradient(135deg, #64A8FE, #0066B6)", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: SH, marginBottom: 24 }}><span style={{ color: "#fff", fontFamily: F, fontSize: 36, fontWeight: 900, fontStyle: "italic" }}>B</span></div>
          <h1 style={{ fontFamily: F, fontWeight: 900, fontSize: 24, color: "#373830", textTransform: "uppercase", margin: "0 0 2px" }}>BITOHI HUB</h1>
          <p style={{ fontFamily: F, fontWeight: 600, fontSize: 11, letterSpacing: ".2em", color: "#64655C", textTransform: "uppercase", margin: "0 0 32px" }}>MISFITS GAMING STUDIO</p>
          <div style={{ width: "100%" }}>
            <label style={{ fontFamily: F, fontWeight: 700, fontSize: 12, color: "#373830", textTransform: "uppercase", display: "block", marginBottom: 8, paddingLeft: 4 }}>PRODUCER CODE</label>
            <div key={shakeKey} style={{ animation: error ? "login-shake .4s ease" : "none" }}>
              <input type="password" placeholder="ENTER ACCESS KEY" value={code} onChange={e => { setCode(e.target.value); setError(""); }} onKeyDown={e => e.key === "Enter" && login()} onFocus={() => setFocused(true)} onBlur={() => setFocused(false)} autoComplete="off"
                style={{ width: "100%", height: 56, background: focused ? "#fff" : "#F5F4E7", border: BD, borderRadius: 12, padding: "0 16px", fontFamily: F, fontWeight: 700, fontSize: 15, letterSpacing: ".15em", textAlign: "center", color: "#373830", outline: "none", boxShadow: focused ? SH : "none" }} />
            </div>
            {error && <div style={{ color: "#C0262D", fontSize: 12, fontWeight: 700, marginTop: 8, textAlign: "center", fontFamily: F }}>{error}</div>}
            {preview && !error && (
              <div style={{ marginTop: 16, background: "rgba(199,207,255,.3)", border: BD, borderRadius: 12, padding: "14px 16px", display: "flex", alignItems: "center", gap: 14, animation: "login-match-pop .25s cubic-bezier(.16,1,.3,1) forwards" }}>
                <div style={{ width: 48, height: 48, background: "#fff", border: BD, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", fontSize: 24, boxShadow: "2px 2px 0px 0px rgba(0,0,0,1)", flexShrink: 0 }}>{preview.emoji}</div>
                <div style={{ flex: 1 }}><div style={{ fontFamily: F, fontWeight: 700, fontSize: 15, color: "#344383" }}>{preview.name}</div><div style={{ fontSize: 10, fontWeight: 700, color: "#5160A2", textTransform: "uppercase" }}>{preview.role}</div></div>
                <span style={{ fontSize: 20 }}>✅</span>
              </div>
            )}
            <button onClick={login} className="p-btn-pill" style={{ width: "100%", height: 56, marginTop: 20, background: preview ? "linear-gradient(90deg, #5160A2, #0066B6)" : "#BABAB0", border: BD, borderRadius: 999, display: "flex", alignItems: "center", justifyContent: "center", gap: 10, boxShadow: SH, cursor: "pointer" }}>
              <span style={{ fontFamily: F, fontWeight: 900, fontSize: 16, color: "#fff", textTransform: "uppercase" }}>{preview ? "ENTER SYSTEM" : "ENTER CODE"}</span><span style={{ fontSize: 18, color: "#fff" }}>→</span>
            </button>
          </div>
          <div style={{ marginTop: 32, display: "flex", flexDirection: "column", alignItems: "center", gap: 12 }}>
            <span style={{ fontSize: 11, fontFamily: F, fontWeight: 700, color: "#818177", textTransform: "uppercase", letterSpacing: ".12em" }}>Producers: 4-digit code</span>
            <div style={{ display: "flex", alignItems: "center", gap: 6 }}>
              <div style={{ width: 7, height: 7, borderRadius: "50%", background: "#10B981", animation: "bh-sparkle 1.5s ease-in-out infinite" }} />
              <span style={{ fontSize: 9, fontFamily: F, fontWeight: 900, color: "#64655C", textTransform: "uppercase", letterSpacing: ".12em" }}>SYSTEM ONLINE: V2.0</span>
            </div>
          </div>
        </div>
        <div className="p-bob" style={{ position: "absolute", top: -20, right: -20, width: 44, height: 44, background: "#CD9BFF", border: BD, borderRadius: "50%", display: "flex", alignItems: "center", justifyContent: "center", boxShadow: SH, fontSize: 20 }}>⚡</div>
        <div className="p-breathe" style={{ position: "absolute", bottom: -14, left: -14, width: 38, height: 38, background: "#EFEFE0", border: BD, borderRadius: 10, display: "flex", alignItems: "center", justifyContent: "center", boxShadow: SH, fontSize: 16 }}>🔒</div>
      </main>
    </div>
  );
}

function SplashScreen({ phase, onSkip }) {
  const out = phase === "transitioning";
  return (
    <div onClick={onSkip} style={{ position: "fixed", inset: 0, zIndex: 99999, cursor: "pointer", background: "linear-gradient(180deg, #64A8FE 0%, #C7CFFF 45%, #8147BB 100%)", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", transform: out ? "translateY(-100%)" : "translateY(0)", opacity: out ? 0.6 : 1, transition: "transform .8s cubic-bezier(.65,0,.35,1), opacity .6s ease .2s", pointerEvents: out ? "none" : "auto", overflow: "hidden", fontFamily: "'Montserrat', sans-serif" }}>
      <div style={{ position: "absolute", top: "12%", left: "8%", opacity: .35, fontSize: 64, animation: "bh-float 4s ease-in-out infinite .2s" }}>☁️</div>
      <div style={{ position: "absolute", bottom: "25%", right: "5%", opacity: .25, fontSize: 80, animation: "bh-float 5s ease-in-out infinite 1.5s" }}>☁️</div>
      <div style={{ position: "relative", zIndex: 10, display: "flex", flexDirection: "column", alignItems: "center" }}>
        <svg viewBox="0 0 400 160" style={{ position: "absolute", width: "130%", height: "200%", top: "50%", left: "50%", transform: "translate(-50%, -50%)", pointerEvents: "none", animation: "bh-glow 3s ease-in-out infinite" }}><ellipse cx="200" cy="80" rx="185" ry="65" fill="none" stroke="rgba(255,255,255,.6)" strokeWidth="3" strokeLinecap="round" strokeDasharray="1200" strokeDashoffset="1200" style={{ animation: "bh-draw 2.5s cubic-bezier(.43,.13,.23,.96) .2s forwards" }} /></svg>
        <h1 style={{ fontSize: "clamp(48px, 12vw, 96px)", fontWeight: 900, color: "#fff", lineHeight: 1, textTransform: "uppercase", opacity: 0, animation: "bh-title-in .8s cubic-bezier(.16,1,.3,1) forwards .5s", userSelect: "none", margin: 0 }}>BITOHI</h1>
        <p style={{ fontSize: "clamp(10px, 2vw, 14px)", fontWeight: 900, color: "#373830", textTransform: "uppercase", marginTop: 16, opacity: 0, animation: "bh-sub-in .8s ease forwards 1.3s" }}>MISFITS GAMING STUDIO</p>
      </div>
      <div style={{ position: "absolute", bottom: "8%", width: "100%", maxWidth: 380, display: "flex", flexDirection: "column", alignItems: "center", gap: 12, padding: "0 24px" }}>
        <div style={{ width: "100%", height: 32, background: "#F5F4E7", border: "3px solid #000", borderRadius: 999, overflow: "hidden", padding: 4, boxShadow: "4px 4px 0px 0px rgba(0,0,0,1)" }}>
          <div style={{ height: "100%", borderRadius: 999, background: "linear-gradient(90deg, #5160A2, #0066B6)", borderRight: "3px solid #000", animation: "bh-progress 3s cubic-bezier(.4,0,.2,1) forwards" }} />
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <span style={{ fontSize: 16, animation: "bh-spin 2s linear infinite", display: "inline-block" }}>⚙️</span>
          <span style={{ fontSize: 11, fontWeight: 900, color: "#373830", letterSpacing: ".12em", textTransform: "uppercase" }}>Initializing Engine ...</span>
        </div>
        <span style={{ fontSize: 9, fontWeight: 700, color: "rgba(55,56,48,.35)", marginTop: 8, textTransform: "uppercase", letterSpacing: ".15em" }}>TAP TO SKIP</span>
      </div>
    </div>
  );
}

export default function App() {
  const [role, setRole] = useState(null);
  const [userCode, setUserCode] = useState("");
  const [orders, setOrders] = useState([]);
  const [games, setGames] = useState(DEFAULT_GAMES);
  const [dataReady, setDataReady] = useState(false);
  const [splash, setSplash] = useState("loading");
  const toast = useToast();

  useEffect(() => {
    let dead = false;
    _onSaveFail = () => toast.push("Failed to save — check your connection", "error");
    async function init() {
      try {
        const [o, g] = await Promise.all([loadOrders(), loadGames()]);
        if (!dead) {
          setOrders(o);
          setGames(g);
          _lastHash = ordersHash(o);
          // Seed _syncedIds with initial remote state — anything we just loaded is confirmed synced
          for (const ord of o) { if (ord?.id) _syncedIds.add(ord.id); }
        }
        try { const saved = await local.get("bh-login"); if (saved && !dead) { const sc = saved.value; if (PRODUCERS[sc]) { setRole("producer"); setUserCode(sc); } else if (sc === ADMIN_CODE) { setRole("admin"); setUserCode(sc); } } } catch {}
      } catch {}
      try { const sk = await local.get("bh-skip-splash"); if (sk && !dead) setSplash("done"); } catch {}
      if (!dead) setDataReady(true);
    }
    init();
    const fb = setTimeout(() => { if (!dead) setDataReady(true); }, 3000);
    return () => { dead = true; clearTimeout(fb); };
  }, []);
  useEffect(() => { if (!dataReady || splash === "done") return; setSplash("playing"); const t = setTimeout(() => setSplash("transitioning"), 3200); return () => clearTimeout(t); }, [dataReady]);
  useEffect(() => { if (splash !== "transitioning") return; const t = setTimeout(() => setSplash("done"), 900); return () => clearTimeout(t); }, [splash]);

  const ordersRef = useRef(orders); const gamesRef = useRef(games); ordersRef.current = orders; gamesRef.current = games;
  useEffect(() => { if (!role || splash !== "done") return; const t = setInterval(() => pollData(gamesRef.current, setOrders, setGames), POLL_MS); return () => clearInterval(t); }, [role, splash]);

  // PATCH 2: Block stale-tab edits until fresh resync after focus/resume/online
  const [resyncing, setResyncing] = useState(false);
  const resyncingRef = useRef(false);
  useEffect(() => {
    if (!role || splash !== "done") return;
    let resyncTimer = null, hiddenAt = 0;
    const RESYNC_THRESHOLD = 2000; // Only resync if hidden > 2s (skip file picker focus cycles)
    const unlock = () => { clearTimeout(resyncTimer); resyncingRef.current = false; setResyncing(false); };
    const doResync = async () => {
      if (resyncingRef.current) return;
      resyncingRef.current = true;
      setResyncing(true);
      resyncTimer = setTimeout(unlock, 5000);
      try {
        await pollData(gamesRef.current, setOrders, setGames);
      } catch {}
      unlock();
    };
    const onHide = () => { if (document.visibilityState === "hidden") hiddenAt = Date.now(); };
    const onVisible = () => { if (document.visibilityState === "visible" && hiddenAt && (Date.now() - hiddenAt) > RESYNC_THRESHOLD) doResync(); hiddenAt = 0; };
    const onFocus = () => { if (hiddenAt && (Date.now() - hiddenAt) > RESYNC_THRESHOLD) doResync(); };
    const onOnline = () => doResync();
    document.addEventListener("visibilitychange", onHide);
    document.addEventListener("visibilitychange", onVisible);
    window.addEventListener("focus", onFocus);
    window.addEventListener("online", onOnline);
    return () => {
      document.removeEventListener("visibilitychange", onHide);
      document.removeEventListener("visibilitychange", onVisible);
      window.removeEventListener("focus", onFocus);
      window.removeEventListener("online", onOnline);
      clearTimeout(resyncTimer);
      resyncingRef.current = false;
    };
  }, [role, splash]);

  const submitOrder = useCallback(async (data) => {
    if (!userCode || (!PRODUCERS[userCode] && userCode !== ADMIN_CODE)) return;
    let result;
    setOrders(prev => { const { files: orderFiles, ...rest } = data; result = [...prev, { id: uid(), ref: refId(), ...rest, files: orderFiles || [], producerCode: userCode, status: "pending", createdAt: Date.now(), adminNote: "", tz: LOCAL_TZ }]; return result; });
    if (!result) return;
    if (data.files?.length) { await saveOrdersNow(result); }
    else saveOrders(result);
  }, [userCode]);
  const updateOrder = useCallback((id, upd) => {
    let result;
    setOrders(prev => { result = prev.map(o => o.id === id ? { ...o, ...upd } : o); return result; });
    if (result) saveOrders(result);
  }, []);
  const deleteOrder = useCallback(async (id) => {
    // Returns: 'ok' on success, 'permission' if not allowed, 'failed' on save error
    // Defense-in-depth: verify ownership and non-terminal status
    let target;
    setOrders(prev => { target = prev.find(o => o.id === id); return prev; });
    if (!target) return 'permission';
    const isAdmin = userCode === ADMIN_CODE;
    const isOwner = target.producerCode === userCode;
    if (!isAdmin && !isOwner) return 'permission';
    if (!isAdmin && TERMINAL.has(target.status)) return 'permission';
    _deletedIds.add(id);
    let result;
    setOrders(prev => { result = prev.filter(o => o.id !== id); return result; });
    if (result) {
      const ok = await saveOrdersNow(result);
      if (!ok) {
        _deletedIds.delete(id);
        try {
          const fresh = await loadOrdersStrict();
          _lastHash = ordersHash(fresh);
          setOrders(fresh);
        } catch {
          // Read also failed — keep local state. User will see save-error toast.
        }
        return 'failed';
      }
      return 'ok';
    }
    return 'failed';
  }, [userCode]);
  const forceUpdateOrder = useCallback(async (id, upd) => {
    let result;
    setOrders(prev => { result = prev.map(o => o.id === id ? { ...o, ...upd } : o); return result; });
    if (!result) return false;
    const ok = await saveOrdersNow(result);
    if (!ok) {
      // Save failed after retry — try strict re-read to restore truth.
      // If read also fails, leave local state alone (don't wipe UI to empty).
      try {
        const fresh = await loadOrdersStrict();
        _lastHash = ordersHash(fresh);
        setOrders(fresh);
      } catch {
        // Read failed too — keep current local state, user sees error toast from save
      }
    }
    return ok;
  }, []);
  const cancelOrder = useCallback(async (id) => {
    let result;
    setOrders(prev => { result = prev.map(o => o.id === id ? { ...o, status: "cancelled" } : o); return result; });
    if (result) await saveOrdersNow(result);
  }, []);
  const updateGames = useCallback((g) => { setGames(g); saveGames(g); }, []);

  const trans = splash === "transitioning";
  const doLogin = useCallback((r, cd) => { setRole(r); setUserCode(cd); try { local.set("bh-login", cd); } catch {} }, []);
  if (!dataReady && splash === "done") return <div style={{ minHeight: '100vh', background: '#0B1120', display: 'flex', alignItems: 'center', justifyContent: 'center', color: '#64748B', fontFamily: F, fontSize: 14 }}>Loading...</div>;
  let view = <LoginScreen onLogin={doLogin} />;
  if (role === "admin") view = <AdminView orders={orders} games={games} onUpdateOrder={updateOrder} onForceUpdate={forceUpdateOrder} onUpdateGames={updateGames} onLogout={() => { setRole(null); setUserCode(""); try { local.delete("bh-login"); } catch {} }} toast={toast} />;
  else if (role) view = <ProducerView producer={PRODUCERS[userCode]} producerCode={userCode} orders={orders} games={games} onSubmit={submitOrder} onUpdateOrder={updateOrder} onForceUpdate={forceUpdateOrder} onDelete={deleteOrder} onAddGame={(g) => updateGames([...games, g])} onCancel={cancelOrder} onLogout={() => { setRole(null); setUserCode(""); try { local.delete("bh-login"); } catch {} }} toast={toast} />;

  return (
    <div style={{ position: "relative", minHeight: "100vh", background: "#0B1120", overflow: "hidden" }}>
      <GlobalStyles />
      {splash !== "playing" && <div style={{ position: "relative", zIndex: 1, minHeight: "100vh", animation: trans ? "app-rise .8s cubic-bezier(.33,1,.68,1) forwards" : "none", opacity: trans ? 0 : 1 }}>{view}</div>}
      {splash !== "done" && splash !== "loading" && <SplashScreen phase={splash} onSkip={() => { setSplash("transitioning"); try { local.set("bh-skip-splash", "1"); } catch {} }} />}
      <ToastContainer toasts={toast.toasts} />
      {resyncing && <div style={{ position: "fixed", top: 0, left: 0, right: 0, zIndex: 99997, background: "#0060AC", padding: "6px 0", textAlign: "center", fontFamily: F, fontSize: 11, fontWeight: 800, color: "#fff", letterSpacing: ".06em", textTransform: "uppercase", animation: "p-slide-up .2s ease" }}>
        <span style={{ display: "inline-flex", alignItems: "center", gap: 8 }}><span style={{ display: "inline-block", animation: "bh-spin 1s linear infinite", fontSize: 12 }}>⚙️</span> Refreshing latest data…</span>
      </div>}
    </div>
  );
}
