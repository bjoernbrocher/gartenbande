const DB_KEY = "gartenbande:v2:state";
const USER_KEY = "gartenbande:v2:user";
const SUPABASE_URL = "https://kyjcbmwzcxbymbcuwtfw.supabase.com";
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
    short: "Werkzeug, Geraete, kleine Hilfe.",
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
    code: "MB",
    place: "Momentebeet",
    hint: "Kleine Augenblicke aus Hemmingen",
    x: 26,
    y: 62,
    size: "large"
  },
  {
    kind: "plants",
    code: "TT",
    place: "Tauschtisch",
    hint: "Ableger, Samen und Pflanzen",
    x: 62,
    y: 64,
    size: "large"
  },
  {
    kind: "info",
    code: "GT",
    place: "Aushang am Tor",
    hint: "Wichtiges und Vermisstes",
    x: 68,
    y: 31,
    size: "large",
    alert: true
  },
  {
    kind: "help",
    code: "HB",
    place: "Helferbank",
    hint: "Eine kurze Bitte reicht",
    x: 30,
    y: 41,
    size: "medium"
  },
  {
    kind: "lend",
    code: "GS",
    place: "Geraeteschuppen",
    hint: "Werkzeug suchen oder anbieten",
    x: 22,
    y: 23,
    size: "medium"
  },
  {
    kind: "events",
    code: "PG",
    place: "Pergola-Treff",
    hint: "Termine und kleine Treffen",
    x: 76,
    y: 51,
    size: "medium"
  },
  {
    kind: "challenge",
    code: "MBL",
    place: "Monatsbluete",
    hint: "Die ruhige Monatsidee",
    x: 43,
    y: 47,
    size: "small"
  },
  {
    view: "albumView",
    code: "GR",
    place: "Gartenjahr-Regal",
    hint: "Sammelalbum und Abzeichen",
    x: 40,
    y: 82,
    size: "small",
    locked: true
  },
  {
    view: "moreView",
    code: "VH",
    place: "Vogelhaus",
    hint: "Dorffunk und Ortsteile",
    x: 74,
    y: 82,
    size: "small",
    locked: true
  }
];

const seasons = [
  { key: "spring", name: "Fruehling", icon: "Fr" },
  { key: "summer", name: "Sommer", icon: "So" },
  { key: "autumn", name: "Herbst", icon: "He" },
  { key: "winter", name: "Winter", icon: "Wi" }
];

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
  seasonIndex: 0,
  activeKind: "moment",
  unlocked: false,
  introHidden: false,
  members: {
    "Hemmingen-Westerfeld": 18,
    Hiddestorf: 12,
    Arnum: 21,
    Devese: 9,
    Wilkenburg: 8,
    Harkenbleck: 7,
    Ohlendorf: 8
  },
  users: [
    { name: "Mira Gartenfreund", district: "Hiddestorf", status: "aktiv" },
    { name: "Jens", district: "Arnum", status: "aktiv" },
    { name: "Nele", district: "Wilkenburg", status: "aktiv" }
  ],
  customChallenge: null,
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
  seasonSwitch: document.querySelector("#seasonSwitch"),
  seasonIcon: document.querySelector("#seasonIcon"),
  alertStrip: document.querySelector("#alertStrip"),
  homeIntro: document.querySelector("#homeIntro"),
  homeIntroStrip: document.querySelector("#homeIntroStrip"),
  hideIntro: document.querySelector("#hideIntro"),
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
    members: { ...defaultState.members, ...(stored.members || {}) },
    users: stored.users || defaultState.users,
    entries: stored.entries.map((entry) => ({
      approved: entry.kind !== "info",
      ...entry
    }))
  };
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

function render() {
  renderAuthStatus();
  renderProfile();
  renderSeason();
  renderHome();
  renderModule();
  renderAlbum();
  renderAdmin();
  renderPwaStatus();
}

function renderProfile() {
  els.avatarInitials.textContent = initials(profile.nickname || profile.name);
  els.profileForm.name.value = profile.name || "";
  els.profileForm.nickname.value = profile.nickname || "";
  els.profileForm.district.value = profile.district || "Hemmingen-Westerfeld";
  els.profileForm.rulesAccepted.checked = Boolean(profile.rulesAccepted);
  els.profileForm.classList.toggle("hidden", Boolean(supabaseClient && !supabaseUser));
  if (els.adminButton) els.adminButton.classList.toggle("hidden", !profile.isAdmin);
  if (els.resetDemo) els.resetDemo.classList.toggle("hidden", Boolean(supabaseClient));
}

function renderSeason() {
  const season = seasons[state.seasonIndex];
  document.body.classList.remove("summer", "autumn", "winter");
  if (season.key !== "spring") document.body.classList.add(season.key);
  if (els.seasonName) els.seasonName.textContent = season.name;
  if (els.seasonIcon) els.seasonIcon.textContent = season.icon;
}

function renderHome() {
  const infoCount = state.entries.filter((entry) => entry.kind === "info").length;

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
    const style = `--garden-x:${place.x}%;--garden-y:${place.y}%;--place-color:${module?.color || "#f3c467"}`;
    const actionAttr = place.kind ? `data-kind="${place.kind}"` : `data-view="${place.view}"`;
    const countText = place.kind === "info" && infoCount ? ` · ${infoCount}` : "";
    return `
      <button class="garden-place ${place.size || "medium"} ${locked ? "locked" : ""} ${place.alert ? "urgent" : ""}" style="${style}" ${actionAttr} data-locked="${locked}" type="button">
        <span>${escapeHtml(place.code)}</span>
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
  els.adminDashboard.innerHTML = `
    <div class="admin-stat"><strong>${Object.values(state.members || {}).reduce((sum, value) => sum + value, 0)}</strong><span>Mitglieder</span></div>
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
    showToast("Der Gaertnerraum ist nur fuer Admins sichtbar.");
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
  const create = event.target.closest("[data-create-kind]");
  const remove = event.target.closest("[data-delete-entry]");
  const approve = event.target.closest("[data-approve-entry]");
  const toggleUser = event.target.closest("[data-toggle-user]");
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
    const user = state.users[Number(toggleUser.dataset.toggleUser)];
    if (user) user.status = user.status === "aktiv" ? "gesperrt" : "aktiv";
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

els.seasonSwitch.addEventListener("click", () => {
  state.seasonIndex = (state.seasonIndex + 1) % seasons.length;
  saveState();
  render();
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
        emailRedirectTo: `${location.origin}${location.pathname}`
      }
    });
    if (error) throw error;
    renderAuthStatus("Anmeldelink wurde verschickt. Bitte E-Mail oeffnen.");
    showToast("Anmeldelink verschickt.");
  } catch (error) {
    console.warn(error);
    renderAuthStatus("Anmeldung konnte nicht gestartet werden.");
    showToast("Anmeldelink konnte nicht gesendet werden.");
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
