const DB_KEY = "gartenbande:v2:state";
const USER_KEY = "gartenbande:v2:user";
const SUPABASE_URL = "https://kyjcbmwzcxbymbcuwtfw.supabase.co";
const SUPABASE_PUBLISHABLE_KEY = "sb_publishable__hA3dloiAmPSDNqknW4GlA_NFXxTF11";

let supabaseClient = null;
let supabaseUser = null;
let remoteReady = false;
let remoteIssueShown = false;

window.addEventListener("error", (event) => {
  const target = document.querySelector("#alertStrip");
  if (target) {
    target.classList.add("has-alert");
    target.innerHTML = `<p>App-Hinweis</p><strong>${event.message}</strong>`;
  }
});

function createId() {
  if (globalThis.crypto?.randomUUID) return globalThis.crypto.randomUUID();
  return `id-${Date.now()}-${Math.random().toString(16).slice(2)}`;
}

const districts = [
  "Hemmingen-Westerfeld",
  "Hiddestorf",
  "Arnum",
  "Devese",
  "Wilkenburg",
  "Harkenbleck",
  "Ohlendorf"
];

const modules = [
  {
    kind: "moment",
    code: "MO",
    title: "Der Moment",
    short: "Foto, ein Satz, fertig.",
    color: "#ffd34d",
    visibleAtStart: true,
    types: ["Gartenmoment", "Tier gesichtet", "Bluete", "Ernte", "Sonnenuntergang"]
  },
  {
    kind: "plants",
    code: "PT",
    title: "Pflanzentausch",
    short: "Biete oder suche Pflanzen.",
    color: "#7fc66f",
    visibleAtStart: true,
    types: ["Biete", "Suche"]
  },
  {
    kind: "lend",
    code: "LH",
    title: "Leihen & Helfen",
    short: "Werkzeug, Ger\u00e4te, kleine Hilfe.",
    color: "#9bd9f4",
    visibleAtStart: false,
    types: ["Suche", "Biete"]
  },
  {
    kind: "help",
    code: "NH",
    title: "Nachbarschaftshilfe",
    short: "Blumen giessen, Baumarkt, Tragen.",
    color: "#ffb47b",
    visibleAtStart: true,
    types: ["Ich brauche Hilfe", "Ich kann helfen"]
  },
  {
    kind: "info",
    code: "IN",
    title: "Info & Vermisst",
    short: "Wichtiges schnell teilen.",
    color: "#b92722",
    visibleAtStart: true,
    alert: true,
    types: ["Vermisst", "Achtung", "Strassensperrung", "Fundtier", "Offenes Gartentor"]
  },
  {
    kind: "events",
    code: "DP",
    title: "Dorfplatz",
    short: "Lokale Termine und Treffen.",
    color: "#f3c467",
    visibleAtStart: false,
    types: ["Grillabend", "Strassenfest", "Pflanzentausch", "Markt", "Sonstiger Termin"]
  },
  {
    kind: "challenge",
    code: "CH",
    title: "Challenge des Monats",
    short: "Eine ruhige Monatsidee.",
    color: "#ff8daf",
    visibleAtStart: false,
    types: ["Monatschallenge"]
  }
];

const gardenPlaces = [
  {
    kind: "moment",
    icon: "place-icons/blumenbeet.jpg",
    place: "Blumenbeet",
    hint: "Kleine Augenblicke aus Hemmingen",
    size: "large"
  },
  {
    kind: "plants",
    icon: "place-icons/tauschbeet.jpg",
    place: "Tauschbeet",
    hint: "Ableger, Samen und Pflanzen",
    size: "large"
  },
  {
    kind: "info",
    icon: "place-icons/aushang-tor.jpg",
    place: "Aushang am Tor",
    hint: "Wichtiges und Vermisstes",
    size: "large",
    alert: true
  },
  {
    kind: "help",
    icon: "place-icons/helferbank.jpg",
    place: "Helferbank",
    hint: "Eine kurze Bitte reicht",
    size: "medium"
  },
  {
    kind: "lend",
    icon: "place-icons/geraeteschuppen.jpg",
    place: "Ger\u00e4teschuppen",
    hint: "Werkzeug suchen oder anbieten",
    size: "medium"
  },
  {
    kind: "events",
    icon: "place-icons/pergola.jpg",
    place: "Pergola",
    hint: "Termine und kleine Treffen",
    size: "medium"
  },
  {
    view: "moreView",
    icon: "place-icons/vogelhaus.jpg",
    place: "Vogelhaus",
    hint: "Dorffunk und Ortsteile",
    size: "medium",
    locked: true
  },
  {
    view: "albumView",
    icon: "place-icons/gartenbuch.jpg",
    place: "Gartenbuch",
    hint: "Sammelalbum und Abzeichen",
    size: "medium",
    locked: true
  }
];

const seasons = [
  { key: "spring", name: "Fruehling", icon: "Fr", months: [2, 3, 4] },
  { key: "summer", name: "Sommer", icon: "So", months: [5, 6, 7] },
  { key: "autumn", name: "Herbst", icon: "He", months: [8, 9, 10] },
  { key: "winter", name: "Winter", icon: "Wi", months: [11, 0, 1] }
];

const weatherCopy = {
  sunny: {
    icon: "☀️",
    label: "Sonnig",
    lines: [
      "Heute lockt die Sonne ins Blumenbeet.",
      "Perfektes Wetter f\u00fcr eine Runde durch den Garten.",
      "Die Pflanzen freuen sich heute mit euch.",
      "Ein Tag f\u00fcr die Pergola.",
      "Heute blueht nicht nur der Garten."
    ]
  },
  mixed: {
    icon: "🌤️",
    label: "Wechselhaft",
    lines: [
      "Mal Sonne, mal Wolken - wie ein echter Gartentag.",
      "Die Natur kann sich heute nicht entscheiden.",
      "Ein Blick zum Himmel lohnt sich heute \u00f6fter.",
      "Zwischen Sonne und Wolken w\u00e4chst es trotzdem."
    ]
  },
  rain: {
    icon: "🌧️",
    label: "Regen",
    lines: [
      "Heute trinkt der Garten zuerst.",
      "Die Regentonnen freuen sich.",
      "Bestes Wetter f\u00fcr Wurzeln.",
      "Der Garten bekommt Wellness.",
      "Heute haben die Schnecken Vorfahrt."
    ]
  },
  thunder: {
    icon: "🌩️",
    label: "Gewitter",
    lines: [
      "Heute lieber vom Beet auf die Veranda.",
      "Die Natur macht heute gro\u00dfe Ger\u00e4usche.",
      "Schaut lieber durchs Fenster in den Garten.",
      "Die B\u00e4ume tanzen heute etwas wilder."
    ]
  },
  winter: {
    icon: "❄️",
    label: "Winter",
    lines: [
      "Der Garten macht heute Pause.",
      "Unter der Erde wird schon der Fruehling geplant.",
      "Heute ruhen die Beete.",
      "Wetter f\u00fcr Tee und Gartenideen."
    ]
  },
  spring: {
    icon: "🌸",
    label: "Fruehling",
    lines: [
      "Heute riecht es nach Fruehling.",
      "Die ersten Besucher sind unterwegs.",
      "Es w\u00e4chst wieder \u00fcberall.",
      "Der Garten wacht langsam auf."
    ]
  }
};

let currentWeather = null;

const monthlyChallenges = {
  2: ["Erste Bluete", "Zeig die erste Bluete, die dir in Hemmingen auffaellt."],
  3: ["Insektenfoto", "Ein kleines Insekt, gross gesehen."],
  4: ["Schoenste Rose", "Rosenmonat ohne Wettbewerbskrach."],
  5: ["Erste Ernte", "Erdbeere, Salat, Apfel: was ist zuerst da?"],
  6: ["Sonnenblume", "Finde oder pflanze die freundlichste Sonnenblume."],
  7: ["Groesste Tomate", "Gross, krumm, schoen: Tomaten duerfen Charakter haben."],
  8: ["Herbsternte", "Apfel, Birne, Kuerbis oder ein voller Korb."],
  9: ["Kuerbis", "Der Oktober gehoert den Kuerbissen."],
  11: ["Schoenster Vorgarten", "Ein winterlicher Blick vor die Haustuer."]
};

const avatarLevels = [
  {
    key: "new",
    avatar: "🌱",
    title: "Keimling",
    unlock: "Anmeldung"
  },
  {
    key: "active",
    avatar: "🌿",
    title: "Gartenfreund",
    unlock: "erster Beitrag"
  },
  {
    key: "helper",
    avatar: "🤝",
    title: "Gute Seele",
    unlock: "erste Hilfe"
  },
  {
    key: "trader",
    avatar: "🌻",
    title: "Ablegerpate",
    unlock: "erster Tausch"
  },
  {
    key: "watcher",
    avatar: "🐦",
    title: "Naturfreund",
    unlock: "erste Sichtung"
  },
  {
    key: "activist",
    avatar: "🌳",
    title: "Gartenpate",
    unlock: "10 Aktionen"
  },
  {
    key: "legend",
    avatar: "🌳🏡",
    title: "H\u00fcter der Gartenbande",
    unlock: "langfristig aktiv"
  }
];

const seasonalPlants = {
  spring: ["🌱", "🌷", "🌼", "🐝"],
  summer: ["🌿", "🌻", "🍅", "🦋"],
  autumn: ["🍂", "🍎", "🎃", "🌾"],
  winter: ["❄️", "🌲", "☕", "🌱"]
};

const defaultProfile = {
  id: createId(),
  name: "",
  email: "",
  nickname: "",
  district: "Hemmingen-Westerfeld",
  rulesAccepted: false,
  isAdmin: false
};

const defaultState = {
  activeKind: "moment",
  unlocked: false,
  introHidden: false,
  members: {},
  users: [],
  customChallenge: null,
  reactions: [],
  comments: [],
  entries: [
    {
      id: "seed-moment",
      kind: "moment",
      type: "Tier gesichtet",
      text: "Igelbesuch am Abend unter der alten Hecke.",
      district: "Hiddestorf",
      contact: "",
      imageData: "",
      userId: "seed",
      userName: "Mira",
      createdAt: "2026-06-14T19:20:00.000Z"
    },
    {
      id: "seed-plant",
      kind: "plants",
      type: "Biete",
      text: "Drei Tomatenpflanzen abzugeben, robust und schon gut angewachsen.",
      district: "Arnum",
      contact: "Abholung heute Abend moeglich",
      imageData: "",
      userId: "seed",
      userName: "Jens",
      createdAt: "2026-06-13T08:10:00.000Z"
    },
    {
      id: "seed-info",
      kind: "info",
      type: "Vermisst",
      text: "Graue Katze seit gestern Abend in der Naehe vom Feldweg vermisst.",
      district: "Wilkenburg",
      contact: "Bitte Sichtung melden",
      imageData: "",
      userId: "seed",
      userName: "Nele",
      createdAt: "2026-06-12T15:15:00.000Z"
    },
    {
      id: "seed-lend",
      kind: "lend",
      type: "Suche",
      text: "Brauche Samstag einen Haecksler fuer zwei Stunden.",
      district: "Devese",
      contact: "Ich hole ihn ab",
      imageData: "",
      userId: "seed",
      userName: "Olli",
      createdAt: "2026-06-15T09:35:00.000Z"
    },
    {
      id: "seed-help",
      kind: "help",
      type: "Ich brauche Hilfe",
      text: "Kann jemand am Wochenende Blumen giessen?",
      district: "Harkenbleck",
      contact: "Freitag bis Sonntag",
      imageData: "",
      userId: "seed",
      userName: "Karin",
      createdAt: "2026-06-15T11:00:00.000Z"
    }
  ]
};

const els = {
  avatarInitials: document.querySelector("#avatarInitials"),
  weatherBadge: document.querySelector("#weatherBadge"),
  weatherIcon: document.querySelector("#weatherIcon"),
  weatherLabel: document.querySelector("#weatherLabel"),
  weatherLine: document.querySelector("#weatherLine"),
  alertStrip: document.querySelector("#alertStrip"),
  homeIntro: document.querySelector("#homeIntro"),
  homeIntroStrip: document.querySelector("#homeIntroStrip"),
  hideIntro: document.querySelector("#hideIntro"),
  homeAvatarCard: document.querySelector("#homeAvatarCard"),
  momentCard: document.querySelector("#momentCard"),
  wantedCard: document.querySelector("#wantedCard"),
  introStrip: document.querySelector("#introStrip"),
  miniFeed: document.querySelector("#miniFeed"),
  districtList: document.querySelector("#districtList"),
  moduleTiles: document.querySelector("#moduleTiles"),
  monthlyTitle: document.querySelector("#monthlyTitle"),
  monthlyText: document.querySelector("#monthlyText"),
  pwaStatus: document.querySelector("#pwaStatus"),
  installHint: document.querySelector("#installHint"),
  installButton: document.querySelector("#installButton"),
  authForm: document.querySelector("#authForm"),
  authStatus: document.querySelector("#authStatus"),
  signOutButton: document.querySelector("#signOutButton"),
  moduleEyebrow: document.querySelector("#moduleEyebrow"),
  moduleTitle: document.querySelector("#moduleTitle"),
  moduleCreate: document.querySelector("#moduleCreate"),
  entryList: document.querySelector("#entryList"),
  albumHero: document.querySelector("#albumHero"),
  badgeRow: document.querySelector("#badgeRow"),
  myEntries: document.querySelector("#myEntries"),
  avatarCard: document.querySelector("#avatarCard"),
  profileForm: document.querySelector("#profileForm"),
  adminDashboard: document.querySelector("#adminDashboard"),
  moderationList: document.querySelector("#moderationList"),
  challengeForm: document.querySelector("#challengeForm"),
  adminUsers: document.querySelector("#adminUsers"),
  adminButton: document.querySelector("#adminButton"),
  resetDemo: document.querySelector("#resetDemo"),
  quickHelp: document.querySelector("#quickHelp"),
  quickMoment: document.querySelector("#quickMoment"),
  helpDialog: document.querySelector("#helpDialog"),
  helpForm: document.querySelector("#helpForm"),
  helpDistrict: document.querySelector("#helpDistrict"),
  entryDialog: document.querySelector("#entryDialog"),
  entryForm: document.querySelector("#entryForm"),
  dialogEyebrow: document.querySelector("#dialogEyebrow"),
  dialogTitle: document.querySelector("#dialogTitle"),
  entryKind: document.querySelector("#entryKind"),
  entryType: document.querySelector("#entryType"),
  entryDistrict: document.querySelector("#entryDistrict"),
  contactLabel: document.querySelector("#contactLabel"),
  photoInput: document.querySelector("#photoInput"),
  photoDrop: document.querySelector("#photoDrop"),
  photoPreview: document.querySelector("#photoPreview"),
  photoDropText: document.querySelector("#photoDropText")
};

let state = loadState();
let profile = loadProfile();
let pendingImageData = "";
let deferredInstallPrompt = null;

function loadState() {
  try {
    const stored = JSON.parse(localStorage.getItem(DB_KEY));
    if (stored?.entries) return normalizeState(stored);
  } catch (error) {
    console.warn("Could not read state", error);
  }
  return structuredClone(defaultState);
}

function normalizeState(stored) {
  return {
    ...structuredClone(defaultState),
    ...stored,
    members: cleanMemberCounts(stored.members),
    users: cleanUsers(stored.users),
    reactions: stored.reactions || [],
    comments: stored.comments || [],
    entries: stored.entries.map((entry) => ({
      approved: entry.kind !== "info",
      ...entry
    }))
  };
}

function cleanUsers(users = []) {
  const demoNames = new Set(["Mira Gartenfreund", "Jens", "Nele"]);
  return (users || []).filter((user) => user?.id || !demoNames.has(user?.name));
}

function cleanMemberCounts(members = {}) {
  const counts = {};
  for (const district of districts) counts[district] = 0;
  return counts;
}

function loadProfile() {
  try {
    const stored = JSON.parse(localStorage.getItem(USER_KEY));
    if (stored?.id) return stored;
  } catch (error) {
    console.warn("Could not read profile", error);
  }
  localStorage.setItem(USER_KEY, JSON.stringify(defaultProfile));
  return structuredClone(defaultProfile);
}

function saveState() {
  localStorage.setItem(DB_KEY, JSON.stringify(state));
}

function saveProfile() {
  localStorage.setItem(USER_KEY, JSON.stringify(profile));
}

function authRedirectUrl() {
  if (location.protocol === "file:") return location.href;
  return `${location.origin}/`;
}

function readableAuthError(error) {
  const message = String(error?.message || error?.error_description || error || "").trim();
  const lower = message.toLowerCase();
  if (lower.includes("redirect") || lower.includes("not allowed")) {
    return "Supabase lehnt die Weiterleitungs-Adresse ab. Bitte in Supabase die Domain als Redirect URL eintragen.";
  }
  if (lower.includes("rate limit") || lower.includes("too many")) {
    return "Zu viele Anmeldeversuche. Bitte kurz warten und dann erneut probieren.";
  }
  if (lower.includes("smtp") || lower.includes("email")) {
    return "Der E-Mail-Versand ist in Supabase noch nicht voll eingerichtet.";
  }
  return message || "Anmeldelink konnte nicht gesendet werden.";
}

function initSupabaseClient() {
  if (!globalThis.supabase?.createClient) return;
  supabaseClient = globalThis.supabase.createClient(SUPABASE_URL, SUPABASE_PUBLISHABLE_KEY, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });
}

async function bootSupabase() {
  initSupabaseClient();
  if (!supabaseClient) {
    renderAuthStatus();
    return;
  }

  try {
    const { data, error } = await supabaseClient.auth.getSession();
    if (error) throw error;
    await applySession(data.session);
    supabaseClient.auth.onAuthStateChange((_event, session) => {
      applySession(session);
    });
  } catch (error) {
    console.warn("Supabase auth not ready", error);
    renderAuthStatus("Supabase ist noch nicht erreichbar. Lokaler Modus bleibt aktiv.");
  }
}

async function applySession(session) {
  supabaseUser = session?.user || null;
  remoteReady = Boolean(supabaseUser);

  if (!supabaseUser) {
    renderAuthStatus();
    render();
    return;
  }

  profile = {
    ...profile,
    id: supabaseUser.id,
    email: supabaseUser.email || profile.email,
    ...(profile.email === "mira@gartenbande.local" ? {
      name: "",
      nickname: "",
      district: "Hemmingen-Westerfeld",
      rulesAccepted: false
    } : {})
  };
  saveProfile();

  await ensureRemoteProfile();
  await loadRemoteEntries();
  await loadRemoteEntryActivity();
  await loadRemoteProfiles();
  render();
}

function renderAuthStatus(message = "") {
  if (!els.authStatus || !els.authForm || !els.signOutButton) return;
  const showLocalProfile = !supabaseClient;
  els.profileForm?.classList.toggle("hidden", !showLocalProfile && !supabaseUser);
  els.resetDemo?.classList.toggle("hidden", Boolean(supabaseClient));
  els.adminButton?.classList.toggle("hidden", !profile.isAdmin);
  if (!supabaseClient) {
    els.authStatus.textContent = message || "Lokaler Beta-Modus. Supabase SDK nicht geladen.";
    els.authForm.classList.remove("hidden");
    els.signOutButton.classList.add("hidden");
    return;
  }
  if (supabaseUser) {
    els.authStatus.textContent = `Angemeldet als ${supabaseUser.email}`;
    els.authForm.classList.add("hidden");
    els.signOutButton.classList.remove("hidden");
    return;
  }
  els.authStatus.textContent = message || "Nicht angemeldet. E-Mail-Link senden.";
  els.authForm.classList.remove("hidden");
  els.signOutButton.classList.add("hidden");
}

function isLoginRequired() {
  return Boolean(supabaseClient && !remoteReady);
}

function requireLogin() {
  if (!isLoginRequired()) return false;
  showToast("Bitte erst per E-Mail anmelden.");
  showView("profileView");
  return true;
}

async function ensureRemoteProfile() {
  if (!remoteReady) return;
  const row = profileToRemote();
  try {
    const { data, error } = await supabaseClient
      .from("profiles")
      .upsert(row, { onConflict: "id" })
      .select()
      .single();
    if (error) throw error;
    applyRemoteProfile(data);
    saveProfile();
  } catch (error) {
    reportRemoteIssue(error);
  }
}

function profileToRemote() {
  return {
    id: supabaseUser.id,
    email: profile.email || supabaseUser.email || "",
    name: profile.name || "",
    nickname: profile.nickname || "",
    district: profile.district || "Hemmingen-Westerfeld",
    rules_accepted: Boolean(profile.rulesAccepted)
  };
}

function applyRemoteProfile(row) {
  if (!row) return;
  profile = {
    ...profile,
    id: row.id || profile.id,
    email: row.email || profile.email,
    name: row.name || profile.name,
    nickname: row.nickname || profile.nickname,
    district: row.district || profile.district,
    rulesAccepted: Boolean(row.rules_accepted),
    isAdmin: Boolean(row.is_admin)
  };
}

async function loadRemoteEntries() {
  if (!remoteReady) return;
  try {
    const { data, error } = await supabaseClient
      .from("entries")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    state.entries = (data || []).map(entryFromRemote);
    saveState();
  } catch (error) {
    reportRemoteIssue(error);
  }
}

async function loadRemoteEntryActivity() {
  if (!remoteReady) return;
  try {
    const [{ data: reactions, error: reactionsError }, { data: comments, error: commentsError }] = await Promise.all([
      supabaseClient.from("entry_reactions").select("*"),
      supabaseClient.from("entry_comments").select("*").order("created_at", { ascending: true })
    ]);
    if (reactionsError) throw reactionsError;
    if (commentsError) throw commentsError;
    state.reactions = (reactions || []).map(reactionFromRemote);
    state.comments = (comments || []).map(commentFromRemote);
    saveState();
  } catch (error) {
    console.warn("Entry activity unavailable", error);
    state.reactions = state.reactions || [];
    state.comments = state.comments || [];
    saveState();
  }
}

async function loadRemoteProfiles() {
  if (!remoteReady || !profile.isAdmin) {
    state.users = cleanUsers(state.users);
    state.members = memberCountsFromUsers(state.users);
    saveState();
    return;
  }

  try {
    const { data, error } = await supabaseClient
      .from("profiles")
      .select("id,email,name,nickname,district,status,is_admin,created_at")
      .order("created_at", { ascending: false });
    if (error) throw error;
    state.users = (data || []).map(profileUserFromRemote);
    state.members = memberCountsFromUsers(state.users);
    saveState();
  } catch (error) {
    reportRemoteIssue(error);
    state.users = cleanUsers(state.users);
    state.members = memberCountsFromUsers(state.users);
    saveState();
  }
}

function profileUserFromRemote(row) {
  return {
    id: row.id,
    email: row.email || "",
    name: row.nickname || row.name || row.email || "Nachbar",
    district: row.district || "Hemmingen-Westerfeld",
    status: row.status || "aktiv",
    isAdmin: Boolean(row.is_admin)
  };
}

function memberCountsFromUsers(users = []) {
  const counts = {};
  for (const district of districts) counts[district] = 0;
  for (const user of cleanUsers(users)) {
    const district = user.district || "Hemmingen-Westerfeld";
    counts[district] = (counts[district] || 0) + 1;
  }
  return counts;
}

function entryToRemote(entry) {
  return {
    id: entry.id,
    kind: entry.kind,
    type: entry.type || "",
    text: entry.text || "",
    district: entry.district || profile.district || "Hemmingen-Westerfeld",
    contact: entry.contact || "",
    image_data: entry.imageData || "",
    approved: Boolean(entry.approved),
    user_id: supabaseUser.id,
    user_name: profile.nickname || profile.name || "Nachbar",
    created_at: entry.createdAt
  };
}

function entryFromRemote(row) {
  return {
    id: row.id,
    kind: row.kind,
    type: row.type || "",
    text: row.text || "",
    district: row.district || "Hemmingen-Westerfeld",
    contact: row.contact || "",
    imageData: row.image_data || "",
    approved: Boolean(row.approved),
    userId: row.user_id,
    userName: row.user_name || "Nachbar",
    createdAt: row.created_at
  };
}

function reactionFromRemote(row) {
  return {
    id: row.id,
    entryId: row.entry_id,
    userId: row.user_id,
    reaction: row.reaction,
    createdAt: row.created_at
  };
}

function commentFromRemote(row) {
  return {
    id: row.id,
    entryId: row.entry_id,
    userId: row.user_id,
    userName: row.user_name || "Nachbar",
    text: row.text || "",
    createdAt: row.created_at
  };
}

async function saveRemoteReaction(entryId, reaction) {
  if (!remoteReady) return null;
  const { data, error } = await supabaseClient
    .from("entry_reactions")
    .upsert({
      entry_id: entryId,
      user_id: supabaseUser.id,
      reaction
    }, { onConflict: "entry_id,user_id,reaction" })
    .select()
    .single();
  if (error) throw error;
  return reactionFromRemote(data);
}

async function saveRemoteComment(entryId, text) {
  if (!remoteReady) return null;
  const { data, error } = await supabaseClient
    .from("entry_comments")
    .insert({
      entry_id: entryId,
      user_id: supabaseUser.id,
      user_name: profile.nickname || profile.name || "Nachbar",
      text
    })
    .select()
    .single();
  if (error) throw error;
  return commentFromRemote(data);
}

async function saveRemoteEntry(entry) {
  if (!remoteReady) return entry;
  const { data, error } = await supabaseClient
    .from("entries")
    .insert(entryToRemote(entry))
    .select()
    .single();
  if (error) throw error;
  return entryFromRemote(data);
}

async function updateRemoteEntry(id, values) {
  if (!remoteReady) return;
  const { error } = await supabaseClient.from("entries").update(values).eq("id", id);
  if (error) throw error;
}

async function updateRemoteProfileStatus(id, status) {
  if (!remoteReady || !profile.isAdmin) return;
  const { error } = await supabaseClient.from("profiles").update({ status }).eq("id", id);
  if (error) throw error;
}

async function deleteRemoteEntry(id) {
  if (!remoteReady) return;
  const { error } = await supabaseClient.from("entries").delete().eq("id", id);
  if (error) throw error;
}

function reportRemoteIssue(error) {
  console.warn("Supabase sync issue", error);
  renderAuthStatus("Supabase-Tabellen fehlen noch oder sind nicht freigegeben.");
  if (!remoteIssueShown) {
    remoteIssueShown = true;
    showToast("Supabase ist verbunden. Bitte SQL-Schema einmal anlegen.");
  }
}

function escapeHtml(value) {
  return String(value ?? "")
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&#039;");
}

function initials(name) {
  return String(name || "GB")
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("");
}

function getModule(kind) {
  return modules.find((item) => item.kind === kind) || modules[0];
}

function visibleModules() {
  return modules.filter((module) => module.visibleAtStart || state.unlocked);
}

function monthlyChallenge() {
  if (state.customChallenge?.title) {
    return [state.customChallenge.title, `${state.customChallenge.startDate || ""} bis ${state.customChallenge.endDate || ""}`.trim()];
  }
  return monthlyChallenges[new Date().getMonth()] || ["Gartenmoment des Monats", "Teile einen kleinen Moment aus Hemmingen."];
}

function currentSeason() {
  const month = new Date().getMonth();
  return seasons.find((season) => season.months.includes(month)) || seasons[0];
}

function pickDailyLine(lines) {
  const dayIndex = Math.floor(Date.now() / 86400000);
  return lines[dayIndex % lines.length];
}

function fallbackWeatherType() {
  const season = currentSeason();
  if (season.key === "winter") return "winter";
  if (season.key === "spring") return "spring";
  return "mixed";
}

function weatherTypeFromCode(code) {
  if ([0, 1].includes(code)) return "sunny";
  if ([2, 3, 45, 48].includes(code)) return "mixed";
  if ((code >= 51 && code <= 67) || (code >= 80 && code <= 82)) return "rain";
  if ((code >= 71 && code <= 77) || code === 85 || code === 86) return "winter";
  if (code >= 95) return "thunder";
  return fallbackWeatherType();
}

function activeWeatherCopy() {
  const type = currentWeather?.type || fallbackWeatherType();
  return weatherCopy[type] || weatherCopy.mixed;
}

async function bootWeather() {
  try {
    const response = await fetch("https://api.open-meteo.com/v1/forecast?latitude=52.3142&longitude=9.723&current=weather_code&timezone=Europe%2FBerlin");
    if (!response.ok) throw new Error("weather request failed");
    const data = await response.json();
    currentWeather = { type: weatherTypeFromCode(Number(data?.current?.weather_code)) };
  } catch (error) {
    console.warn("Weather unavailable", error);
    currentWeather = { type: fallbackWeatherType() };
  }
  renderSeason();
}

function myEntries() {
  return state.entries.filter((entry) => entry.userId === profile.id);
}

function hasSightedNature(entries) {
  return entries.some((entry) => (
    entry.kind === "moment" &&
    /tier|sichtung|vogel|igel|biene|insekt|katze|hund|natur/i.test(`${entry.type} ${entry.text}`)
  ));
}

function avatarStatus() {
  const entries = myEntries();
  const actionCount = entries.length;
  const firstEntry = entries.length > 0;
  const firstHelp = entries.some((entry) => entry.kind === "help" || entry.kind === "lend");
  const firstTrade = entries.some((entry) => entry.kind === "plants");
  const firstSighting = hasSightedNature(entries);
  const firstCreated = entries.length ? Math.min(...entries.map((entry) => new Date(entry.createdAt).getTime())) : Date.now();
  const daysActive = Math.floor((Date.now() - firstCreated) / 86400000);

  let level = avatarLevels[0];
  if (firstEntry) level = avatarLevels[1];
  if (firstHelp) level = avatarLevels[2];
  if (firstTrade) level = avatarLevels[3];
  if (firstSighting) level = avatarLevels[4];
  if (actionCount >= 10) level = avatarLevels[5];
  if (actionCount >= 30 || (actionCount >= 10 && daysActive >= 180)) level = avatarLevels[6];

  const next = avatarLevels.find((item) => !isAvatarUnlocked(item.key, entries, actionCount, daysActive));
  return { level, next, entries, actionCount };
}

function isAvatarUnlocked(key, entries, actionCount, daysActive) {
  if (key === "new") return true;
  if (key === "active") return actionCount >= 1;
  if (key === "helper") return entries.some((entry) => entry.kind === "help" || entry.kind === "lend");
  if (key === "trader") return entries.some((entry) => entry.kind === "plants");
  if (key === "watcher") return hasSightedNature(entries);
  if (key === "activist") return actionCount >= 10;
  if (key === "legend") return actionCount >= 30 || (actionCount >= 10 && daysActive >= 180);
  return false;
}

function render() {
  renderAuthStatus();
  renderProfile();
  renderSeason();
  renderHome();
  renderModule();
  renderAlbum();
  renderAdminClean();
  renderPwaStatus();
}

function renderProfile() {
  els.avatarInitials.textContent = initials(profile.nickname || profile.name);
  els.profileForm.name.value = profile.name || "";
  els.profileForm.nickname.value = profile.nickname || "";
  els.profileForm.district.value = profile.district || "Hemmingen-Westerfeld";
  els.profileForm.rulesAccepted.checked = Boolean(profile.rulesAccepted);
  els.profileForm.classList.toggle("hidden", Boolean(supabaseClient && !supabaseUser));
  renderAvatarCard();
  if (els.adminButton) els.adminButton.classList.toggle("hidden", !profile.isAdmin);
  if (els.resetDemo) els.resetDemo.classList.toggle("hidden", Boolean(supabaseClient));
}

function renderSeason() {
  const season = currentSeason();
  const weather = activeWeatherCopy();
  document.body.classList.remove("summer", "autumn", "winter");
  if (season.key !== "spring") document.body.classList.add(season.key);
  if (els.weatherIcon) els.weatherIcon.textContent = weather.icon;
  if (els.weatherLabel) els.weatherLabel.textContent = weather.label;
  const weatherLine = pickDailyLine(weather.lines);
  if (els.weatherLine) els.weatherLine.textContent = weatherLine;
  if (els.weatherBadge) els.weatherBadge.title = weatherLine;
}

function renderAvatarCard() {
  if (!els.avatarCard) return;
  const visible = !supabaseClient || Boolean(supabaseUser);
  els.avatarCard.classList.toggle("hidden", !visible);
  if (!visible) return;

  const { level, next, actionCount, plantRow, plantCount } = avatarDisplay();
  const nextText = next ? `N\u00e4chste Freischaltung: ${next.avatar} ${next.title} (${next.unlock})` : "Alle aktuellen Gartenstufen freigeschaltet.";

  els.avatarCard.innerHTML = `
    <div class="avatar-top">
      <span class="avatar-emoji">${level.avatar}</span>
      <div>
        <p>Pflanzenstand</p>
        <h3>${escapeHtml(level.title)}</h3>
      </div>
    </div>
    <div class="plant-row" aria-label="${plantCount} Aktionen">${plantRow}</div>
    <strong>${actionCount} ${actionCount === 1 ? "Aktion" : "Aktionen"} im Garten</strong>
    <small>${escapeHtml(nextText)}</small>
  `;
}

function avatarDisplay() {
  const status = avatarStatus();
  const season = currentSeason();
  const plants = seasonalPlants[season.key] || seasonalPlants.spring;
  const plantCount = Math.max(1, Math.min(7, status.actionCount || 1));
  const plantRow = Array.from({ length: plantCount }, (_, index) => plants[index % plants.length]).join("");
  return { ...status, plantRow, plantCount };
}

function renderHomeAvatarCard() {
  if (!els.homeAvatarCard) return;
  els.homeAvatarCard.classList.remove("hidden");

  const { level, next, actionCount, plantRow } = avatarDisplay();
  const nextLabel = next ? `N\u00e4chstes Ziel: ${next.title}` : "Gartenstufen voll";
  els.homeAvatarCard.innerHTML = `
    <span class="home-avatar-emoji">${level.avatar}</span>
    <span class="home-avatar-text">
      <strong>Pflanzenstand: ${escapeHtml(level.title)}</strong>
      <small>${plantRow} ${actionCount} ${actionCount === 1 ? "Aktion" : "Aktionen"} · ${escapeHtml(nextLabel)}</small>
    </span>
    <span class="home-avatar-link">Details</span>
  `;
}

function renderHome() {
  const infoCount = state.entries.filter((entry) => entry.kind === "info").length;
  renderHomeAvatarCard();

  const latestInfo = state.entries.find((entry) => entry.kind === "info");
  if (latestInfo) {
    els.alertStrip.classList.add("has-alert");
    els.alertStrip.innerHTML = `<p>Nachbarschaftsinfo</p><strong>${escapeHtml(latestInfo.type)}: ${escapeHtml(latestInfo.text)}</strong>`;
  } else {
    els.alertStrip.classList.remove("has-alert");
    els.alertStrip.innerHTML = `<p>Nachbarschaftsinfo</p><strong>Keine aktuelle Warnung oder Vermisstmeldung.</strong>`;
  }

  els.moduleTiles.innerHTML = gardenPlaces.map((place) => {
    const module = place.kind ? getModule(place.kind) : null;
    const locked = Boolean(place.locked || (module && !module.visibleAtStart && !state.unlocked));
    const style = `--place-color:${module?.color || "#f3c467"}`;
    const actionAttr = place.kind ? `data-kind="${place.kind}"` : `data-view="${place.view}"`;
    const countText = place.kind === "info" && infoCount ? ` · ${infoCount}` : "";
    return `
      <button class="garden-place ${place.size || "medium"} ${locked ? "locked" : ""} ${place.alert ? "urgent" : ""}" style="${style}" ${actionAttr} data-locked="${locked}" type="button">
        <img src="${escapeHtml(place.icon)}" alt="">
        <strong>${escapeHtml(place.place)}</strong>
        <small>${escapeHtml(place.hint)}${countText}</small>
      </button>
    `;
  }).join("");

  const [title, text] = monthlyChallenge();
  els.monthlyTitle.textContent = title;
  els.monthlyText.textContent = text;
  renderMomentCard();
  renderWanted();
  renderMiniFeed();
  renderDistricts();
  renderIntro();
}

function renderMomentCard() {
  if (!els.momentCard) return;
  const moment = state.entries.find((entry) => entry.kind === "moment");
  els.momentCard.innerHTML = moment ? `
    <p>Moment des Tages</p>
    <h2>${escapeHtml(moment.text)}</h2>
    <span>${escapeHtml(moment.district)} · von ${escapeHtml(moment.userName)}</span>
  ` : `
    <p>Moment des Tages</p>
    <h2>Noch kein Moment geteilt.</h2>
    <span>Vielleicht ist deiner der erste.</span>
  `;
}

function entriesSince(hours) {
  const cutoff = Date.now() - hours * 60 * 60 * 1000;
  return state.entries.filter((entry) => new Date(entry.createdAt).getTime() >= cutoff);
}

function wantedEntries() {
  return state.entries.filter((entry) => (
    (entry.kind === "plants" || entry.kind === "lend" || entry.kind === "help") &&
    /suche|brauche|hilfe|sitter|wer kann|benoetige|benötige/i.test(`${entry.type} ${entry.text}`)
  ));
}

function renderWanted() {
  if (!els.wantedCard) return;
  const wanted = wantedEntries().slice(0, 3);
  els.wantedCard.innerHTML = `
    <p>Aktuell gesucht</p>
    <h2>${wanted.length ? "Wer hat was?" : "Im Moment sind alle versorgt."}</h2>
    <div class="wanted-list">
      ${wanted.length ? wanted.map((entry) => `
        <div class="wanted-item">
          <strong>${escapeHtml(entry.text)}</strong>
          <span>${escapeHtml(entry.district)} · ${escapeHtml(getModule(entry.kind).title)}</span>
        </div>
      `).join("") : "<div class=\"wanted-item\"><strong>Heute sucht niemand etwas.</strong><span>Das ist selten.</span></div>"}
    </div>
  `;
}

function renderIntro() {
  const introHtml = `
    <article class="intro-card"><strong>1</strong><h3>Nur das Brett</h3><p>Wichtiges, Suchen und Momente zuerst.</p></article>
    <article class="intro-card"><strong>2</strong><h3>Werkzeuge spaeter</h3><p>Leihen & Helfen wird nach dem ersten Eintrag sichtbar.</p></article>
    <article class="intro-card"><strong>3</strong><h3>Kein Social Stress</h3><p>Keine Kommentare, keine Punkte, keine Gruppen.</p></article>
  `;
  if (els.introStrip) els.introStrip.innerHTML = introHtml;
  if (els.homeIntroStrip) els.homeIntroStrip.innerHTML = introHtml;
  if (els.homeIntro) els.homeIntro.classList.add("hidden");
}

function renderMiniFeed() {
  els.miniFeed.innerHTML = state.entries
    .slice()
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 5)
    .map((entry) => `
      <div class="feed-item">
        <strong>${escapeHtml(entry.text)}</strong>
        <span>${escapeHtml(entry.district)} · ${escapeHtml(getModule(entry.kind).title)} · ${escapeHtml(entry.userName)}</span>
      </div>
    `).join("");
}

function renderDistricts() {
  els.districtList.innerHTML = districts.map((district) => {
    const entries = state.entries.filter((entry) => entry.district === district);
    const moments = entries.filter((entry) => entry.kind === "moment").length;
    const searches = entries.filter((entry) => wantedEntries().some((wanted) => wanted.id === entry.id)).length;
    const warnings = entries.filter((entry) => entry.kind === "info").length;
    return `
      <div class="district-item">
        <strong>${escapeHtml(district)}</strong>
        <span>${state.members?.[district] || 0} Mitglieder · ${moments} Momente · ${searches} Suchen · ${warnings} Warnungen</span>
      </div>
    `;
  }).join("");
}

function renderModule() {
  const module = getModule(state.activeKind);
  const entries = state.entries
    .filter((entry) => entry.kind === module.kind)
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

  els.moduleEyebrow.textContent = module.alert ? "Wichtig" : "Bereich";
  els.moduleTitle.textContent = module.title;
  els.moduleCreate.textContent = createLabel(module.kind);
  els.entryList.innerHTML = entries.length
    ? entries.map(renderEntry).join("")
    : document.querySelector("#emptyTemplate").innerHTML;
}

function createLabel(kind) {
  return {
    moment: "Moment teilen",
    plants: "Pflanze anbieten oder suchen",
    lend: "Werkzeug eintragen",
    help: "Hilfe eintragen",
    info: "Info melden",
    events: "Termin eintragen",
    challenge: "Zur Monatschallenge beitragen"
  }[kind] || "Eintrag erstellen";
}

const reactionOptions = [
  { key: "schoen", label: "Schön", icon: "♥" },
  { key: "danke", label: "Danke", icon: "🌱" },
  { key: "gesehen", label: "Gesehen", icon: "👀" },
  { key: "helfe", label: "Ich helfe", icon: "🤝" }
];

function reactionsForEntry(entryId) {
  return (state.reactions || []).filter((reaction) => reaction.entryId === entryId);
}

function commentsForEntry(entryId) {
  return (state.comments || []).filter((comment) => comment.entryId === entryId);
}

function renderEntryActivity(entry) {
  const reactions = reactionsForEntry(entry.id);
  const comments = commentsForEntry(entry.id);
  return `
    <div class="entry-actions">
      ${reactionOptions.map((option) => {
        const count = reactions.filter((reaction) => reaction.reaction === option.key).length;
        const active = reactions.some((reaction) => reaction.reaction === option.key && reaction.userId === profile.id);
        return `<button class="reaction-chip ${active ? "active" : ""}" data-react-entry="${entry.id}" data-reaction="${option.key}" type="button">${option.icon} ${option.label}${count ? ` ${count}` : ""}</button>`;
      }).join("")}
    </div>
    <div class="entry-comments">
      ${comments.length ? comments.map((comment) => `
        <div class="entry-comment">
          <strong>${escapeHtml(comment.userName)}</strong>
          <span>${escapeHtml(comment.text)}</span>
        </div>
      `).join("") : ""}
      <form class="comment-form" data-comment-entry="${entry.id}">
        <input name="comment" maxlength="240" placeholder="Kurz antworten">
        <button class="small-action" type="submit">Antwort</button>
      </form>
    </div>
  `;
}

function renderEntry(entry) {
  const module = getModule(entry.kind);
  const mine = entry.userId === profile.id;
  return `
    <article class="entry-item">
      <div class="entry-photo">${entry.imageData ? `<img src="${entry.imageData}" alt="${escapeHtml(entry.text)}">` : `<span>${module.code}</span>`}</div>
      <div class="entry-body">
        <div class="entry-meta">
          <span class="pill">${escapeHtml(entry.type)}</span>
          <span class="pill">${escapeHtml(entry.district)}</span>
          <span class="pill">${new Date(entry.createdAt).toLocaleDateString("de-DE")}</span>
        </div>
        <p>${escapeHtml(entry.text)}</p>
        ${entry.contact ? `<small>${escapeHtml(entry.contact)}</small>` : ""}
        <small>von ${escapeHtml(entry.userName)}</small>
        ${renderEntryActivity(entry)}
        ${mine ? `<button class="danger-action" data-delete-entry="${entry.id}" type="button">Loeschen</button>` : ""}
      </div>
    </article>
  `;
}

function renderAlbum() {
  const mine = state.entries.filter((entry) => entry.userId === profile.id);
  const badges = calculateBadges(mine);
  els.albumHero.innerHTML = `<strong>${badges.length} Jahresabzeichen</strong><p>${mine.length} eigene Eintraege im lokalen Sammelalbum. Keine Punkte, kein Ranking.</p>`;
  els.badgeRow.innerHTML = badges.map((badge) => `<span class="badge"><span>${badge.code}</span>${badge.name}</span>`).join("");
  els.myEntries.innerHTML = mine.length ? mine.map(renderEntry).join("") : document.querySelector("#emptyTemplate").innerHTML;
}

function renderAdmin() {
  const infoOpen = state.entries.filter((entry) => entry.kind === "info" && !entry.approved);
  const users = cleanUsers(state.users);
  els.adminDashboard.innerHTML = `
    <div class="admin-stat"><strong>${users.length}</strong><span>Mitglieder</span></div>
    <div class="admin-stat"><strong>${entriesSince(24).length}</strong><span>neue Beitraege</span></div>
    <div class="admin-stat"><strong>${infoOpen.length}</strong><span>Freigaben</span></div>
    <div class="admin-stat"><strong>${wantedEntries().length}</strong><span>offene Suchen</span></div>
  `;
  els.moderationList.innerHTML = infoOpen.length ? infoOpen.map((entry) => `
    <article class="entry-item">
      <div class="entry-body">
        <div class="entry-meta"><span class="pill">${escapeHtml(entry.type)}</span><span class="pill">${escapeHtml(entry.district)}</span></div>
        <p>${escapeHtml(entry.text)}</p>
        <button class="small-action" data-approve-entry="${entry.id}" type="button">Freigeben</button>
      </div>
    </article>
  `).join("") : document.querySelector("#emptyTemplate").innerHTML;
  els.adminUsers.innerHTML = (state.users || []).map((user, index) => `
    <div class="admin-user">
      <strong>${escapeHtml(user.name)}</strong>
      <span>${escapeHtml(user.district)} · ${escapeHtml(user.status)}</span>
      <button class="small-action" data-toggle-user="${index}" type="button">${user.status === "aktiv" ? "Sperren" : "Aktivieren"}</button>
    </div>
  `).join("");
  if (state.customChallenge?.title) {
    els.challengeForm.title.value = state.customChallenge.title;
    els.challengeForm.startDate.value = state.customChallenge.startDate || "";
    els.challengeForm.endDate.value = state.customChallenge.endDate || "";
    els.challengeForm.image.value = state.customChallenge.image || "";
  }
}

function renderAdminClean() {
  const infoOpen = state.entries.filter((entry) => entry.kind === "info" && !entry.approved);
  const users = cleanUsers(state.users);

  els.adminDashboard.innerHTML = `
    <div class="admin-stat"><strong>${users.length}</strong><span>Mitglieder</span></div>
    <div class="admin-stat"><strong>${entriesSince(24).length}</strong><span>neue Beitraege</span></div>
    <div class="admin-stat"><strong>${infoOpen.length}</strong><span>Freigaben</span></div>
    <div class="admin-stat"><strong>${wantedEntries().length}</strong><span>offene Suchen</span></div>
  `;

  els.moderationList.innerHTML = infoOpen.length ? infoOpen.map((entry) => `
    <article class="entry-item">
      <div class="entry-body">
        <div class="entry-meta"><span class="pill">${escapeHtml(entry.type)}</span><span class="pill">${escapeHtml(entry.district)}</span></div>
        <p>${escapeHtml(entry.text)}</p>
        <button class="small-action" data-approve-entry="${entry.id}" type="button">Freigeben</button>
      </div>
    </article>
  `).join("") : document.querySelector("#emptyTemplate").innerHTML;

  els.adminUsers.innerHTML = users.length ? users.map(renderAdminUser).join("") : document.querySelector("#emptyTemplate").innerHTML;
  /*
  els.adminUsers.innerHTML = users.length ? users.map((user) => `
    <div class="admin-user">
      <strong>${escapeHtml(user.name)}</strong>
      <span>${escapeHtml(user.district)} · ${escapeHtml(user.status)}${user.isAdmin ? " · Admin" : ""}</span>
      <button class="small-action" data-toggle-user="${escapeHtml(user.id)}" type="button">${user.status === "aktiv" ? "Sperren" : "Aktivieren"}</button>
    </div>
  `).join("") : document.querySelector("#emptyTemplate").innerHTML;
  */

  if (state.customChallenge?.title) {
    els.challengeForm.title.value = state.customChallenge.title;
    els.challengeForm.startDate.value = state.customChallenge.startDate || "";
    els.challengeForm.endDate.value = state.customChallenge.endDate || "";
    els.challengeForm.image.value = state.customChallenge.image || "";
  }
}

function renderAdminUser(user) {
  const isSelf = user.id === supabaseUser?.id;
  const meta = `${user.district} · ${user.status}${user.isAdmin ? " · Admin" : ""}`;
  return `
    <div class="admin-user">
      <strong>${escapeHtml(user.name)}</strong>
      <span>${escapeHtml(meta)}</span>
      ${isSelf
        ? `<span class="self-admin-note">Du</span>`
        : `<button class="small-action" data-toggle-user="${escapeHtml(user.id)}" type="button">${user.status === "aktiv" ? "Sperren" : "Aktivieren"}</button>`}
    </div>
  `;
}

function calculateBadges(entries) {
  const badges = [{ code: "GB", name: "Gartenbande" }];
  if (entries.some((entry) => entry.kind === "moment")) badges.push({ code: "FE", name: "Fruehlingsentdecker" });
  if (entries.some((entry) => entry.kind === "plants")) badges.push({ code: "PP", name: "Pflanzenpate" });
  if (entries.some((entry) => entry.kind === "lend")) badges.push({ code: "HH", name: "Helfende Hand" });
  if (entries.some((entry) => entry.kind === "help")) badges.push({ code: "NH", name: "Nachbarschaftsheld" });
  if (entries.some((entry) => entry.kind === "info")) badges.push({ code: "TR", name: "Tierretter" });
  if (entries.some((entry) => entry.kind === "challenge")) badges.push({ code: "GF", name: "Gartenfreund" });
  return badges;
}

function renderPwaStatus() {
  els.pwaStatus.textContent = navigator.onLine ? "Online · Offline-Speicher aktiv" : "Offline · lokale Nutzung aktiv";
  if ("serviceWorker" in navigator) {
    els.installHint.textContent = "Installierbar als PWA. Auf iPhone: Teilen > Zum Home-Bildschirm.";
  }
}

function showView(viewId) {
  if (viewId === "adminView" && !profile.isAdmin) {
    showToast("Der G\u00e4rtnerraum ist nur f\u00fcr Admins sichtbar.");
    viewId = "homeView";
  }
  document.querySelectorAll(".view").forEach((view) => view.classList.toggle("active", view.id === viewId));
  document.querySelectorAll(".nav-item").forEach((item) => {
    const active = item.dataset.view === viewId || (viewId === "moduleView" && item.dataset.kind === state.activeKind);
    item.classList.toggle("active", active);
  });
  els.quickMoment.classList.toggle("hidden", ["homeView", "profileView"].includes(viewId));
  window.scrollTo({ top: 0, behavior: "smooth" });
}

function openModule(kind) {
  state.activeKind = kind;
  saveState();
  render();
  showView("moduleView");
}

function openEntryDialog(kind) {
  if (requireLogin()) return;
  if (!profile.rulesAccepted) {
    showToast("Bitte zuerst deinen Garten einrichten.");
    showView("profileView");
    return;
  }
  const module = getModule(kind);
  pendingImageData = "";
  els.entryForm.reset();
  els.entryKind.value = kind;
  els.dialogEyebrow.textContent = module.alert ? "Wichtige Info" : "Neuer Eintrag";
  els.dialogTitle.textContent = module.title;
  els.entryType.innerHTML = module.types.map((type) => `<option>${escapeHtml(type)}</option>`).join("");
  els.entryDistrict.value = profile.district || "Hemmingen-Westerfeld";
  els.contactLabel.classList.toggle("hidden", kind === "moment" || kind === "challenge");
  els.photoDrop.classList.remove("has-image");
  els.photoPreview.removeAttribute("src");
  els.photoDropText.textContent = kind === "moment" || kind === "challenge" ? "Foto aufnehmen oder auswaehlen" : "Foto optional";
  if (typeof els.entryDialog.showModal === "function") els.entryDialog.showModal();
}

function classifyHelp(text) {
  const normalized = text.toLowerCase();
  if (/tomate|pflanze|ableger|samen|staude|lavendel|kraeuter|kräuter|erdbeer/.test(normalized)) {
    return { kind: "plants", type: "Suche", contact: "automatisch als Pflanzengesuch eingeordnet" };
  }
  if (/haecksler|häcksler|leiter|bohrmaschine|anhaenger|anhänger|vertikutierer|hochdruck|werkzeug/.test(normalized)) {
    return { kind: "lend", type: "Suche", contact: "automatisch als Werkzeuganfrage eingeordnet" };
  }
  if (/katze|hund|schildkroete|schildkröte|vermisst|gefunden|offenes gartentor|unfall|sperrung|verdächtig|verdaechtig/.test(normalized)) {
    return { kind: "info", type: /vermisst|katze|hund|schild/.test(normalized) ? "Vermisst" : "Achtung", contact: "automatisch als wichtige Info eingeordnet" };
  }
  return { kind: "help", type: "Ich brauche Hilfe", contact: "automatisch als Nachbarschaftshilfe eingeordnet" };
}

async function compressImage(file) {
  const dataUrl = await readFileAsDataUrl(file);
  const image = await loadImage(dataUrl);
  const maxSize = 900;
  const scale = Math.min(1, maxSize / Math.max(image.width, image.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.round(image.width * scale);
  canvas.height = Math.round(image.height * scale);
  canvas.getContext("2d").drawImage(image, 0, 0, canvas.width, canvas.height);
  return canvas.toDataURL("image/jpeg", 0.78);
}

function readFileAsDataUrl(file) {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(reader.result);
    reader.onerror = reject;
    reader.readAsDataURL(file);
  });
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function showToast(message) {
  document.querySelector(".toast")?.remove();
  const toast = document.createElement("div");
  toast.className = "toast";
  toast.textContent = message;
  document.body.append(toast);
  setTimeout(() => toast.remove(), 2600);
}

document.querySelectorAll(".nav-item").forEach((button) => {
  button.addEventListener("click", () => {
    if (button.dataset.kind) openModule(button.dataset.kind);
    if (button.dataset.view) showView(button.dataset.view);
  });
});

document.querySelectorAll("[data-view-target]").forEach((button) => {
  button.addEventListener("click", () => showView(button.dataset.viewTarget));
});

els.homeAvatarCard?.addEventListener("click", () => showView("profileView"));

els.moduleTiles.addEventListener("click", (event) => {
  const tile = event.target.closest(".garden-place");
  if (!tile) return;
  if (tile.dataset.locked === "true") {
    showToast("Dieser Gartenort ist noch nicht entdeckt.");
    return;
  }
  if (tile.dataset.kind) openModule(tile.dataset.kind);
  if (tile.dataset.view) showView(tile.dataset.view);
});

document.body.addEventListener("click", async (event) => {
  const closeDialog = event.target.closest("[data-close-dialog]");
  const react = event.target.closest("[data-react-entry]");
  const create = event.target.closest("[data-create-kind]");
  const remove = event.target.closest("[data-delete-entry]");
  const approve = event.target.closest("[data-approve-entry]");
  const toggleUser = event.target.closest("[data-toggle-user]");
  if (closeDialog) {
    document.querySelector(`#${closeDialog.dataset.closeDialog}`)?.close();
    return;
  }
  if (react) {
    if (requireLogin()) return;
    const entryId = react.dataset.reactEntry;
    const reaction = react.dataset.reaction;
    const exists = (state.reactions || []).some((item) => item.entryId === entryId && item.userId === profile.id && item.reaction === reaction);
    if (exists) {
      showToast("Schon gemerkt.");
      return;
    }
    const localReaction = {
      id: createId(),
      entryId,
      userId: profile.id,
      reaction,
      createdAt: new Date().toISOString()
    };
    try {
      const savedReaction = await saveRemoteReaction(entryId, reaction);
      state.reactions.push(savedReaction || localReaction);
      saveState();
      render();
    } catch (error) {
      reportRemoteIssue(error);
      state.reactions.push(localReaction);
      saveState();
      render();
    }
    return;
  }
  if (create) openEntryDialog(create.dataset.createKind);
  if (remove) {
    try {
      await deleteRemoteEntry(remove.dataset.deleteEntry);
      state.entries = state.entries.filter((entry) => entry.id !== remove.dataset.deleteEntry);
      saveState();
      render();
      showToast("Eintrag geloescht.");
    } catch (error) {
      reportRemoteIssue(error);
    }
  }
  if (approve) {
    try {
      await updateRemoteEntry(approve.dataset.approveEntry, { approved: true });
      const entry = state.entries.find((item) => item.id === approve.dataset.approveEntry);
      if (entry) entry.approved = true;
      saveState();
      render();
      showToast("Info freigegeben.");
    } catch (error) {
      reportRemoteIssue(error);
    }
  }
  if (toggleUser) {
    const user = cleanUsers(state.users).find((item) => item.id === toggleUser.dataset.toggleUser);
    if (!user) return;
    if (user.id === supabaseUser?.id) {
      showToast("Du kannst dein eigenes Admin-Konto nicht sperren.");
      return;
    }
    const nextStatus = user.status === "aktiv" ? "gesperrt" : "aktiv";
    try {
      await updateRemoteProfileStatus(user.id, nextStatus);
      user.status = nextStatus;
      state.users = cleanUsers(state.users).map((item) => item.id === user.id ? { ...item, status: nextStatus } : item);
      state.members = memberCountsFromUsers(state.users);
      saveState();
      render();
      showToast(nextStatus === "aktiv" ? "Nutzer aktiviert." : "Nutzer gesperrt.");
    } catch (error) {
      reportRemoteIssue(error);
    }
  }
});

document.body.addEventListener("submit", async (event) => {
  const commentForm = event.target.closest("[data-comment-entry]");
  if (!commentForm) return;
  event.preventDefault();
  if (requireLogin()) return;

  const text = String(new FormData(commentForm).get("comment") || "").trim();
  if (!text) return;

  const entryId = commentForm.dataset.commentEntry;
  const localComment = {
    id: createId(),
    entryId,
    userId: profile.id,
    userName: profile.nickname || profile.name || "Nachbar",
    text,
    createdAt: new Date().toISOString()
  };

  try {
    const savedComment = await saveRemoteComment(entryId, text);
    state.comments.push(savedComment || localComment);
    saveState();
    render();
    showToast("Antwort gespeichert.");
  } catch (error) {
    reportRemoteIssue(error);
    state.comments.push(localComment);
    saveState();
    render();
  }
});

els.moduleCreate.addEventListener("click", () => openEntryDialog(state.activeKind));
els.quickMoment.addEventListener("click", () => openEntryDialog("moment"));
els.hideIntro.addEventListener("click", () => {
  state.introHidden = true;
  saveState();
  render();
});
els.quickHelp.addEventListener("click", () => {
  if (requireLogin()) return;
  els.helpForm.reset();
  els.helpDistrict.value = profile.district || "Hemmingen-Westerfeld";
  if (typeof els.helpDialog.showModal === "function") els.helpDialog.showModal();
});

els.photoInput.addEventListener("change", async () => {
  const file = els.photoInput.files?.[0];
  if (!file) return;
  try {
    pendingImageData = await compressImage(file);
    els.photoPreview.src = pendingImageData;
    els.photoDrop.classList.add("has-image");
    els.photoDropText.textContent = "Bild gewaehlt";
  } catch (error) {
    console.error(error);
    showToast("Das Bild konnte nicht gelesen werden.");
  }
});

els.entryForm.addEventListener("submit", async (event) => {
  if (event.submitter?.value === "cancel") return;
  event.preventDefault();
  const formData = new FormData(els.entryForm);
  const kind = String(formData.get("kind") || "moment");
  const entry = {
    id: createId(),
    kind,
    type: String(formData.get("type") || ""),
    text: String(formData.get("text") || "").trim(),
    district: String(formData.get("district") || profile.district),
    contact: String(formData.get("contact") || "").trim(),
    imageData: pendingImageData,
    approved: kind !== "info",
    userId: profile.id,
    userName: profile.nickname || profile.name,
    createdAt: new Date().toISOString()
  };

  try {
    const savedEntry = await saveRemoteEntry(entry);
    state.entries.unshift(savedEntry);
    state.unlocked = true;
    saveState();
    els.entryDialog.close();
    render();
    openModule(kind);
    showToast("Auf den Dorfplatz gesetzt.");
  } catch (error) {
    reportRemoteIssue(error);
    state.entries.unshift(entry);
    state.unlocked = true;
    saveState();
    els.entryDialog.close();
    render();
    openModule(kind);
  }
});

els.helpForm.addEventListener("submit", async (event) => {
  if (event.submitter?.value === "cancel") return;
  event.preventDefault();
  const formData = new FormData(els.helpForm);
  const text = String(formData.get("text") || "").trim();
  const classified = classifyHelp(text);
  const entry = {
    id: createId(),
    kind: classified.kind,
    type: classified.type,
    text,
    district: String(formData.get("district") || profile.district),
    contact: classified.contact,
    imageData: "",
    approved: classified.kind !== "info",
    userId: profile.id,
    userName: profile.nickname || profile.name,
    createdAt: new Date().toISOString()
  };

  try {
    const savedEntry = await saveRemoteEntry(entry);
    state.entries.unshift(savedEntry);
    state.unlocked = true;
    saveState();
    els.helpDialog.close();
    render();
    openModule(classified.kind);
    showToast(`Eingeordnet als ${getModule(classified.kind).title}.`);
  } catch (error) {
    reportRemoteIssue(error);
    state.entries.unshift(entry);
    state.unlocked = true;
    saveState();
    els.helpDialog.close();
    render();
    openModule(classified.kind);
  }
});

els.profileForm.addEventListener("submit", async (event) => {
  event.preventDefault();
  const formData = new FormData(els.profileForm);
  profile = {
    ...profile,
    name: String(formData.get("name") || "").trim(),
    email: supabaseUser?.email || profile.email || "",
    nickname: String(formData.get("nickname") || "").trim(),
    district: String(formData.get("district") || ""),
    rulesAccepted: formData.get("rulesAccepted") === "on"
  };
  saveProfile();
  await ensureRemoteProfile();
  render();
  showView("homeView");
  showToast("Gartenprofil gespeichert.");
});

els.authForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  const email = String(new FormData(els.authForm).get("email") || "").trim();
  if (!email) return;
  if (!supabaseClient) {
    showToast("Supabase SDK wurde nicht geladen.");
    return;
  }

  try {
    const { error } = await supabaseClient.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: authRedirectUrl()
      }
    });
    if (error) throw error;
    renderAuthStatus("Anmeldelink wurde verschickt. Bitte E-Mail öffnen.");
    showToast("Anmeldelink verschickt.");
  } catch (error) {
    console.warn(error);
    const message = readableAuthError(error);
    renderAuthStatus(message);
    showToast(message);
  }
});

els.signOutButton?.addEventListener("click", async () => {
  if (supabaseClient) await supabaseClient.auth.signOut();
  supabaseUser = null;
  remoteReady = false;
  profile.isAdmin = false;
  saveProfile();
  render();
  showView("homeView");
  showToast("Abgemeldet.");
});

els.challengeForm.addEventListener("submit", (event) => {
  event.preventDefault();
  const formData = new FormData(els.challengeForm);
  state.customChallenge = {
    title: String(formData.get("title") || "").trim(),
    startDate: String(formData.get("startDate") || ""),
    endDate: String(formData.get("endDate") || ""),
    image: String(formData.get("image") || "")
  };
  saveState();
  render();
  showToast("Monatschallenge aktualisiert.");
});

els.resetDemo.addEventListener("click", () => {
  localStorage.removeItem(DB_KEY);
  state = structuredClone(defaultState);
  saveState();
  render();
  showView("homeView");
});

window.addEventListener("online", renderPwaStatus);
window.addEventListener("offline", renderPwaStatus);

window.addEventListener("beforeinstallprompt", (event) => {
  event.preventDefault();
  deferredInstallPrompt = event;
  els.installButton.classList.remove("hidden");
  els.installHint.textContent = "Diese App kann auf dem Geraet installiert werden.";
});

els.installButton.addEventListener("click", async () => {
  if (!deferredInstallPrompt) return;
  deferredInstallPrompt.prompt();
  await deferredInstallPrompt.userChoice;
  deferredInstallPrompt = null;
  els.installButton.classList.add("hidden");
});

if ("serviceWorker" in navigator) {
  window.addEventListener("load", () => {
    navigator.serviceWorker.register("./service-worker.js").catch((error) => {
      console.warn("Service worker registration failed", error);
    });
  });
}

render();
bootSupabase();
bootWeather();
