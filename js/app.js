import { db, auth, signInAnonymously, onAuthStateChanged }
  from "./firebase-config.js";

import {
  collection, doc, addDoc, updateDoc, deleteDoc,
  onSnapshot, query, orderBy, serverTimestamp,
  getDocs, setDoc, getDoc
} from "https://www.gstatic.com/firebasejs/10.12.0/firebase-firestore.js";

// ═══════════════════════════════════════════
// ESTADO GLOBAL
// ═══════════════════════════════════════════
const S = {
  currentUser : null,
  authUid     : null,
  categories  : [],
  links       : [],
  users       : [],
  activeCat   : "all",
  activePlat  : "all",
  activeMember: "all",
  activeTag   : null,
  searchQ     : "",
  editingId   : null,
  currentTags : [],
  _pendingOgImage : null,
  _pendingUserImage: null,  // base64 image uploaded by user
};

// ═══════════════════════════════════════════
// PLATFORM CONFIG
// ═══════════════════════════════════════════
const PLAT = {
  instagram : { label:"Instagram", abbr:"IG", color:"#E1306C", bg:"#fce4ec" },
  facebook  : { label:"Facebook",  abbr:"FB", color:"#1877F2", bg:"#e3f2fd" },
  tiktok    : { label:"TikTok",    abbr:"TT", color:"#111111", bg:"#F0F0F0" },
  youtube   : { label:"YouTube",   abbr:"YT", color:"#FF0000", bg:"#FFEBEE" },
  web       : { label:"Web",       abbr:"W",  color:"#5F5E5A", bg:"#F1EFE8" },
};

// ═══════════════════════════════════════════
// COLORES DE USUARIO
// ═══════════════════════════════════════════
const USER_COLORS = [
  {bg:"#E1F5EE",text:"#085041"}, {bg:"#FAECE7",text:"#4A1B0C"},
  {bg:"#E6F1FB",text:"#042C53"}, {bg:"#EAF3DE",text:"#173404"},
  {bg:"#EEEDFE",text:"#26215C"}, {bg:"#FAEEDA",text:"#412402"},
  {bg:"#FBEAF0",text:"#4B1528"}, {bg:"#E8F4F8",text:"#0D3345"},
];
function userColor(name="") {
  let h = 0;
  for (const c of name) h = (h * 31 + c.charCodeAt(0)) % USER_COLORS.length;
  return USER_COLORS[h];
}
function initials(name="") {
  return name.split(" ").map(w => w[0]).join("").toUpperCase().slice(0, 2);
}

// ═══════════════════════════════════════════
// FIREBASE AUTH – login anónimo
// ═══════════════════════════════════════════
onAuthStateChanged(auth, user => {
  if (user) {
    S.authUid = user.uid;
    initFirestoreListeners();
  } else {
    signInAnonymously(auth).catch(err => {
      setLoginStatus("Error conectando: " + err.message);
    });
  }
});

// ═══════════════════════════════════════════
// FIRESTORE LISTENERS EN TIEMPO REAL
// ═══════════════════════════════════════════
function initFirestoreListeners() {
  // Usuarios
  onSnapshot(doc(db, "config", "users"), snap => {
    S.users = snap.exists() ? (snap.data().list || []) : [];
    renderUserGrid();
  });

  // Categorías
  onSnapshot(
    query(collection(db, "categories"), orderBy("createdAt")),
    snap => {
      S.categories = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderSidebar();
      populateCatSelect();
    }
  );

  // Links
  onSnapshot(
    query(collection(db, "links"), orderBy("createdAt", "desc")),
    snap => {
      S.links = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      renderSidebar();
      renderCards();
      updateTopStats();
    }
  );

  // Restaurar sesión local
  const saved = localStorage.getItem("fl_user");
  if (saved) {
    S.currentUser = saved;
    showMainApp();
  }
}

function setLoginStatus(msg) {
  document.getElementById("loginStatus").textContent = msg;
}

// ═══════════════════════════════════════════
// CATEGORÍAS POR DEFECTO (primera carga)
// ═══════════════════════════════════════════
async function seedDefaultCategories() {
  const snap = await getDocs(collection(db, "categories"));
  if (!snap.empty) return;
  const defaults = [
    { name:"Recetas",      emoji:"🍳", color:"#E1F5EE", textColor:"#085041" },
    { name:"Tragos",       emoji:"🍹", color:"#FAECE7", textColor:"#4A1B0C" },
    { name:"Turismo",      emoji:"✈️", color:"#E6F1FB", textColor:"#042C53" },
    { name:"Salud",        emoji:"💊", color:"#EAF3DE", textColor:"#173404" },
    { name:"Manualidades", emoji:"🧵", color:"#FBEAF0", textColor:"#4B1528" },
  ];
  for (const c of defaults) {
    await addDoc(collection(db, "categories"), { ...c, createdAt: serverTimestamp() });
  }
}

// ═══════════════════════════════════════════
// LOGIN / USUARIOS
// ═══════════════════════════════════════════
let _selectedUser = null;

function renderUserGrid() {
  const grid = document.getElementById("userGrid");
  if (!S.users.length) {
    grid.innerHTML = `<div style="grid-column:1/-1;font-size:13px;color:var(--text-tertiary);text-align:center;padding:1rem">
      Agregá el primer integrante abajo ↓</div>`;
    seedDefaultCategories();
    return;
  }
  grid.innerHTML = S.users.map(u => {
    const c = userColor(u);
    return `<button class="user-btn${_selectedUser===u?' selected':''}" onclick="selectUser('${u}',this)">
      <div class="u-avatar" style="background:${c.bg};color:${c.text}">${initials(u)}</div>
      <div class="u-name">${u}</div>
    </button>`;
  }).join("");
}
window.selectUser = (name, btn) => {
  _selectedUser = name;
  document.querySelectorAll(".user-btn").forEach(b => b.classList.remove("selected"));
  btn.classList.add("selected");
  document.getElementById("loginBtn").disabled = false;
};

async function addUser() {
  const inp = document.getElementById("newUserInput");
  const name = inp.value.trim();
  if (!name) return;
  const list = [...new Set([...S.users, name])];
  await setDoc(doc(db, "config", "users"), { list });
  inp.value = "";
  seedDefaultCategories();
}

document.getElementById("addUserBtn").addEventListener("click", addUser);
document.getElementById("newUserInput").addEventListener("keydown", e => {
  if (e.key === "Enter") addUser();
});

document.getElementById("loginBtn").addEventListener("click", () => {
  if (!_selectedUser) return;
  S.currentUser = _selectedUser;
  localStorage.setItem("fl_user", S.currentUser);
  showMainApp();
});

function showMainApp() {
  document.getElementById("loginScreen").classList.add("hidden");
  const ma = document.getElementById("mainApp");
  ma.classList.remove("hidden");
  ma.style.display = "flex";
  const c = userColor(S.currentUser);
  const av = document.getElementById("topAvatar");
  av.textContent = initials(S.currentUser);
  av.style.background = c.bg;
  av.style.color = c.text;
  document.getElementById("topUserName").textContent = S.currentUser;
  renderSidebar();
  renderCards();
  updateTopStats();
}

// Logout
document.getElementById("userPill").addEventListener("click", () => {
  document.getElementById("userMenuName").textContent = S.currentUser;
  openModal("userMenu");
});
document.getElementById("logoutBtn").addEventListener("click", () => {
  S.currentUser = null;
  _selectedUser = null;
  localStorage.removeItem("fl_user");
  closeModal("userMenu");
  document.getElementById("mainApp").classList.add("hidden");
  document.getElementById("loginScreen").classList.remove("hidden");
  document.getElementById("loginBtn").disabled = true;
  document.querySelectorAll(".user-btn").forEach(b => b.classList.remove("selected"));
});

// ═══════════════════════════════════════════
// SIDEBAR
// ═══════════════════════════════════════════
function renderSidebar() {
  renderCatList();
  renderPlatformList();
  renderMemberList();
}

function renderCatList() {
  const el = document.getElementById("catList");
  const allCount = S.links.length;
  el.innerHTML = navItem("all-cat", "🔖", "Todos", allCount, S.activeCat==="all", `setFilter('cat','all')`) +
    S.categories.map(c => {
      const cnt = S.links.filter(l => l.catId === c.id).length;
      return navItem(c.id, c.emoji, c.name, cnt, S.activeCat===c.id, `setFilter('cat','${c.id}')`);
    }).join("");
}

function renderPlatformList() {
  const el = document.getElementById("platformList");
  const used = [...new Set(S.links.map(l => l.platform))].filter(Boolean);
  el.innerHTML = navItem("all-plat", "🌐", "Todas", S.links.length, S.activePlat==="all", `setFilter('plat','all')`) +
    used.map(p => {
      const cfg = PLAT[p] || PLAT.web;
      const cnt = S.links.filter(l => l.platform === p).length;
      const badge = `<span class="plat-badge" style="background:${cfg.bg};color:${cfg.color}">${cfg.abbr}</span>`;
      return navItemRaw(badge, cfg.label, cnt, S.activePlat===p, `setFilter('plat','${p}')`);
    }).join("");
}

function renderMemberList() {
  const el = document.getElementById("memberList");
  const members = [...new Set(S.links.map(l => l.user))].filter(Boolean);
  el.innerHTML = navItem("all-mem","👥","Todos", S.links.length, S.activeMember==="all", `setFilter('member','all')`) +
    members.map(m => {
      const c = userColor(m);
      const cnt = S.links.filter(l => l.user === m).length;
      const av = `<span class="meta-avatar" style="background:${c.bg};color:${c.text}">${initials(m)}</span>`;
      return navItemRaw(av, m, cnt, S.activeMember===m, `setFilter('member','${m}')`);
    }).join("");
}

function navItem(id, emoji, label, count, active, onclick) {
  return `<button class="nav-item${active?' active':''}" onclick="${onclick}">
    <span>${emoji}</span><span style="flex:1">${label}</span>
    <span class="nav-count">${count}</span></button>`;
}
function navItemRaw(iconHtml, label, count, active, onclick) {
  return `<button class="nav-item${active?' active':''}" onclick="${onclick}">
    ${iconHtml}<span style="flex:1">${label}</span>
    <span class="nav-count">${count}</span></button>`;
}

window.setFilter = (type, val) => {
  if (type==="cat")    S.activeCat    = val;
  if (type==="plat")   S.activePlat   = val;
  if (type==="member") S.activeMember = val;
  S.activeTag = null;
  renderSidebar();
  renderCards();
  // cerrar sidebar en móvil
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sidebarOverlay").classList.remove("active");
};

// ═══════════════════════════════════════════
// CARDS
// ═══════════════════════════════════════════
function filteredLinks() {
  let links = [...S.links];
  if (S.activeCat    !== "all") links = links.filter(l => l.catId    === S.activeCat);
  if (S.activePlat   !== "all") links = links.filter(l => l.platform === S.activePlat);
  if (S.activeMember !== "all") links = links.filter(l => l.user     === S.activeMember);
  if (S.activeTag)               links = links.filter(l => (l.tags||[]).includes(S.activeTag));
  if (S.searchQ) {
    const q = S.searchQ.toLowerCase();
    links = links.filter(l =>
      (l.title||"").toLowerCase().includes(q) ||
      (l.desc||"").toLowerCase().includes(q)  ||
      (l.tags||[]).some(t => t.toLowerCase().includes(q))
    );
  }
  return links;
}

function renderCards() {
  const grid = document.getElementById("cardsGrid");
  const links = filteredLinks();

  // Tags filter chips
  const allTags = [...new Set(S.links.flatMap(l => l.tags||[]))].slice(0,12);
  document.getElementById("tagsFilter").innerHTML = allTags.map(t =>
    `<span class="filter-chip${S.activeTag===t?' active':''}" onclick="quickTag('${t}')">#${t}</span>`
  ).join("");

  // Section header
  const total = links.length;
  document.getElementById("sectionHeader").textContent =
    total ? `${total} link${total>1?"s":""} encontrado${total>1?"s":""}` : "";

  if (!links.length) {
    grid.innerHTML = `<div class="empty-state">
      <div class="empty-icon">🔍</div>
      <h3>No hay links aquí</h3>
      <p>Probá con otra búsqueda o categoría.</p>
    </div>`;
    return;
  }
  grid.innerHTML = links.map(l => cardHTML(l)).join("");
}

function cardHTML(l) {
  const cat  = S.categories.find(c => c.id === l.catId);
  const plat = PLAT[l.platform] || PLAT.web;
  const uc   = userColor(l.user);
  const tags = (l.tags||[]).slice(0,3).map(t => `<span class="tag-pill">#${t}</span>`).join("");
  const catBadge = cat
    ? `<span class="cat-badge" style="background:${cat.color};color:${cat.textColor}">${cat.emoji} ${cat.name}</span>`
    : "";
  const dateStr = l.createdAt?.toDate
    ? l.createdAt.toDate().toLocaleDateString("es-AR",{day:"numeric",month:"short"})
    : "";
  // User-uploaded image takes priority over OG image
  const imgSrc = l.userImage || l.ogImage || null;
  const thumb = imgSrc
    ? `<div class="card-thumb"><img src="${escAttr(imgSrc)}" alt="" loading="lazy" onerror="this.parentElement.remove()"></div>`
    : "";
  return `<div class="card" onclick="openDetail('${l.id}')">
    ${thumb}
    <div class="card-header">
      <div class="card-plat-icon" style="background:${plat.bg};color:${plat.color}">${plat.abbr}</div>
      <div class="card-title-wrap">
        <div class="card-title">${escHtml(l.title||"Sin título")}</div>
        <div class="card-url">${escHtml(l.url||"")}</div>
      </div>
    </div>
    ${l.desc ? `<div class="card-desc">${escHtml(l.desc)}</div>` : ""}
    <div class="card-footer">
      ${catBadge}${tags}
      <div class="card-meta">
        <div class="meta-avatar" style="background:${uc.bg};color:${uc.text}">${initials(l.user)}</div>
        ${escHtml(l.user)} ${dateStr?`· ${dateStr}`:""}
      </div>
    </div>
    <div class="card-actions">
      <button class="card-action-btn" onclick="event.stopPropagation();window.open('${escAttr(l.url)}','_blank')">
        ↗ Abrir</button>
      <button class="card-action-btn" onclick="event.stopPropagation();copyUrl('${escAttr(l.url)}')">
        ⧉ Copiar</button>
      <button class="card-action-btn" onclick="event.stopPropagation();editLink('${l.id}')">
        ✎ Editar</button>
      <button class="card-action-btn danger" onclick="event.stopPropagation();deleteLink('${l.id}')">
        ✕ Borrar</button>
    </div>
  </div>`;
}

window.quickTag = tag => {
  S.activeTag = S.activeTag === tag ? null : tag;
  renderCards();
};
window.copyUrl = url => {
  navigator.clipboard.writeText(url).then(() => toast("Link copiado ✓"));
};
window.openDetail = id => {
  const l = S.links.find(x => x.id === id);
  if (!l) return;
  const cat  = S.categories.find(c => c.id === l.catId);
  const plat = PLAT[l.platform] || PLAT.web;
  const uc   = userColor(l.user);
  const dateStr = l.createdAt?.toDate
    ? l.createdAt.toDate().toLocaleDateString("es-AR",{day:"numeric",month:"long",year:"numeric"})
    : "";
  const imgSrc = l.userImage || l.ogImage || null;
  document.getElementById("detailTitle").textContent = l.title || "Sin título";
  document.getElementById("detailBody").innerHTML = `
    ${imgSrc ? `<img class="detail-thumb" src="${escAttr(imgSrc)}" alt="" loading="lazy" onerror="this.remove()">` : ""}
    <a class="detail-url" href="${escAttr(l.url)}" target="_blank" rel="noopener">${escHtml(l.url)}</a>
    ${l.desc ? `<p class="detail-desc">${escHtml(l.desc)}</p>` : ""}
    <div class="detail-badges">
      ${cat?`<span class="cat-badge" style="background:${cat.color};color:${cat.textColor}">${cat.emoji} ${cat.name}</span>`:""}
      <span class="tag-pill" style="background:${plat.bg};color:${plat.color}">${plat.label}</span>
      ${(l.tags||[]).map(t=>`<span class="tag-pill">#${t}</span>`).join("")}
    </div>
    <div class="detail-meta">
      <div class="meta-avatar" style="background:${uc.bg};color:${uc.text}">${initials(l.user)}</div>
      Compartido por <strong>${escHtml(l.user)}</strong>${dateStr?` · ${dateStr}`:""}
    </div>
    <div class="detail-actions">
      <button class="btn-primary" onclick="window.open('${escAttr(l.url)}','_blank')">↗ Abrir link</button>
      <button class="btn-outline" onclick="copyUrl('${escAttr(l.url)}')">⧉ Copiar URL</button>
      <button class="btn-outline" onclick="closeModal('detailModal');editLink('${l.id}')">✎ Editar</button>
    </div>`;
  openModal("detailModal");
};

window.deleteLink = async id => {
  if (!confirm("¿Eliminar este link?")) return;
  await deleteDoc(doc(db, "links", id));
  toast("Link eliminado");
};

window.editLink = id => {
  const l = S.links.find(x => x.id === id);
  if (!l) return;
  S.editingId = id;
  S.currentTags = [...(l.tags||[])];
  S._pendingOgImage = null;
  S._pendingUserImage = null;
  document.getElementById("urlInput").value = l.url || "";
  document.getElementById("titleInput").value = l.title || "";
  document.getElementById("descInput").value = l.desc || "";
  document.getElementById("catSelect").value = l.catId || "";
  document.getElementById("platformSelect").value = l.platform || "web";
  // Show existing image preview if any
  const existing = l.userImage || l.ogImage || null;
  renderImagePreview(existing, !!l.userImage);
  renderTagsInModal();
  document.getElementById("linkModalTitle").textContent = "Editar link";
  document.getElementById("aiStrip").classList.add("hidden");
  openModal("linkModal");
};

// ═══════════════════════════════════════════
// MODAL AGREGAR / EDITAR LINK
// ═══════════════════════════════════════════
document.getElementById("addLinkBtn").addEventListener("click", () => {
  S.editingId = null;
  S.currentTags = [];
  S._pendingOgImage = null;
  S._pendingUserImage = null;
  document.getElementById("urlInput").value = "";
  document.getElementById("titleInput").value = "";
  document.getElementById("descInput").value = "";
  document.getElementById("platformSelect").value = "web";
  document.getElementById("aiStrip").classList.add("hidden");
  renderImagePreview(null, false);
  renderTagsInModal();
  document.getElementById("linkModalTitle").textContent = "Agregar link";
  if (S.activeCat !== "all") document.getElementById("catSelect").value = S.activeCat;
  else document.getElementById("catSelect").value = "";
  openModal("linkModal");
});

// Auto detectar plataforma
document.getElementById("urlInput").addEventListener("input", () => {
  const url = document.getElementById("urlInput").value.toLowerCase();
  const sel = document.getElementById("platformSelect");
  if (url.includes("instagram"))              sel.value = "instagram";
  else if (url.includes("tiktok"))            sel.value = "tiktok";
  else if (url.includes("facebook")||url.includes("fb.com")) sel.value = "facebook";
  else if (url.includes("youtube")||url.includes("youtu.be")) sel.value = "youtube";
  else                                        sel.value = "web";
});

// Analizar con IA
document.getElementById("analyzeBtn").addEventListener("click", analyzeWithAI);

async function analyzeWithAI() {
  const url = document.getElementById("urlInput").value.trim();
  if (!url) { toast("Ingresá una URL primero", "error"); return; }

  const apiKey = getApiKey();
  if (!apiKey) {
    openApiKeyModal();
    toast("Primero configurá tu clave API de Anthropic", "error");
    return;
  }

  const strip = document.getElementById("aiStrip");
  const stripText = document.getElementById("aiStripText");
  const btn = document.getElementById("analyzeBtn");
  strip.classList.remove("hidden");
  stripText.innerHTML = "Obteniendo info del link <span style='opacity:.6'>...</span>";
  btn.disabled = true;

  // Fetch OG data and AI in parallel
  const catNames = S.categories.map(c => c.name).join(", ");

  // First try to get OG metadata via proxy
  let ogData = { title: "", desc: "", image: null };
  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const ogRes = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
    if (ogRes.ok) {
      const ogJson = await ogRes.json();
      const html = ogJson.contents || "";
      const getMetaContent = (patterns) => {
        for (const p of patterns) {
          const m = html.match(p);
          if (m && m[1]) return m[1].trim();
        }
        return "";
      };
      ogData.title = getMetaContent([
        /<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i,
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:title["']/i,
        /<title[^>]*>([^<]+)<\/title>/i,
      ]);
      ogData.desc = getMetaContent([
        /<meta[^>]+property=["']og:description["'][^>]+content=["']([^"']+)["']/i,
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:description["']/i,
        /<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i,
        /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']description["']/i,
      ]);
      let imgUrl = getMetaContent([
        /<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i,
        /<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i,
        /<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i,
        /<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i,
      ]);
      if (imgUrl) {
        if (imgUrl.startsWith("/")) {
          const base = new URL(url);
          imgUrl = base.origin + imgUrl;
        }
        ogData.image = imgUrl;
      }
    }
  } catch(e) { /* continue without OG data */ }

  // Now call Claude API via allorigins proxy (to bypass CORS)
  stripText.innerHTML = "Analizando con IA <span style='opacity:.6'>...</span>";

  const contextInfo = ogData.title ? `\nTítulo de la página: ${ogData.title}\nDescripción de la página: ${ogData.desc}` : "";
  const prompt = `Analizá este link y respondé SOLO con JSON válido, sin backticks ni texto extra:
URL: ${url}${contextInfo}
Categorías disponibles: ${catNames}

Devolvé exactamente: {"title":"título descriptivo en español (máx 80 chars)","desc":"1-2 oraciones en español explicando de qué trata","category":"nombre exacto de la categoría más apropiada o cadena vacía si ninguna aplica","tags":["tag1","tag2","tag3"]}

Respondé SOLO el JSON, sin texto adicional.`;

  try {
    // Use allorigins as a CORS proxy to reach Anthropic API
    const anthropicPayload = JSON.stringify({
      model: "claude-sonnet-4-6",
      max_tokens: 1000,
      messages: [{ role: "user", content: prompt }]
    });

    const proxyPayload = {
      url: "https://api.anthropic.com/v1/messages",
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: anthropicPayload
    };

    // Direct fetch with the correct headers (requires anthropic-dangerous-direct-browser-access)
    const res = await fetch("https://api.anthropic.com/v1/messages", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-api-key": apiKey,
        "anthropic-version": "2023-06-01",
        "anthropic-dangerous-direct-browser-access": "true"
      },
      body: anthropicPayload
    });

    if (!res.ok) {
      const errData = await res.json().catch(() => ({}));
      if (res.status === 401) {
        toast("Clave API incorrecta. Revisala en Configuración.", "error");
        stripText.textContent = "Clave API incorrecta. Hacé clic en ⚙️ para actualizarla.";
        btn.disabled = false;
        return;
      }
      throw new Error(errData.error?.message || `HTTP ${res.status}`);
    }

    const data = await res.json();
    const text = data.content.map(i => i.text||"").join("");
    const clean = text.replace(/```json|```/g,"").trim();
    const parsed = JSON.parse(clean);

    if (parsed.title) document.getElementById("titleInput").value = parsed.title;
    if (parsed.desc)  document.getElementById("descInput").value  = parsed.desc;
    if (parsed.category) {
      const cat = S.categories.find(c => c.name.toLowerCase()===parsed.category.toLowerCase());
      if (cat) document.getElementById("catSelect").value = cat.id;
    }
    if (parsed.tags?.length) {
      S.currentTags = parsed.tags.map(t => t.toLowerCase().replace(/\s+/g,"-"));
      renderTagsInModal();
    }

    // Store OG image if found
    if (ogData.image) {
      S._pendingOgImage = ogData.image;
      renderImagePreview(ogData.image, false);
      stripText.innerHTML = "✓ IA completó los datos · imagen de vista previa detectada. Revisá y guardá.";
    } else {
      S._pendingOgImage = null;
      stripText.textContent = "✓ IA completó los datos. Revisá y guardá.";
    }

  } catch(e) {
    console.error("AI error:", e);
    // Fallback: if we got OG data, use it
    if (ogData.title) {
      document.getElementById("titleInput").value = ogData.title;
      if (ogData.desc) document.getElementById("descInput").value = ogData.desc;
      if (ogData.image) {
        S._pendingOgImage = ogData.image;
        renderImagePreview(ogData.image, false);
      }
      stripText.textContent = "IA no disponible, se usaron los datos del link. Revisá y guardá.";
    } else {
      stripText.textContent = "No se pudo analizar. Completá los datos manualmente.";
    }
  }
  btn.disabled = false;
}

// Guardar link
document.getElementById("saveLinkBtn").addEventListener("click", async () => {
  const url   = document.getElementById("urlInput").value.trim();
  const title = document.getElementById("titleInput").value.trim();
  if (!url || !title) { toast("URL y título son obligatorios", "error"); return; }

  const btn = document.getElementById("saveLinkBtn");
  btn.disabled = true;
  btn.textContent = "Guardando...";

  const data = {
    url,
    title,
    desc     : document.getElementById("descInput").value.trim(),
    catId    : document.getElementById("catSelect").value || null,
    platform : document.getElementById("platformSelect").value,
    tags     : [...S.currentTags],
    user     : S.currentUser,
  };

  // Attach OG image if fetched during AI analysis
  if (S._pendingUserImage) {
    data.userImage = S._pendingUserImage;
    data.ogImage = null;  // user image takes over
    S._pendingUserImage = null;
  } else if (S._pendingOgImage) {
    data.ogImage = S._pendingOgImage;
    S._pendingOgImage = null;
  } else if (S._clearImages) {
    data.userImage = null;
    data.ogImage = null;
    S._clearImages = false;
  }

  try {
    if (S.editingId) {
      await updateDoc(doc(db, "links", S.editingId), { ...data, updatedAt: serverTimestamp() });
      toast("Link actualizado ✓");
    } else {
      data.createdAt = serverTimestamp();
      await addDoc(collection(db, "links"), data);
      toast("Link guardado ✓");
    }
    closeModal("linkModal");
  } catch(e) {
    toast("Error al guardar: " + e.message, "error");
  }
  btn.disabled = false;
  btn.textContent = "Guardar link";
});

// ═══════════════════════════════════════════
// IMAGEN MANUAL (upload desde dispositivo)
// ═══════════════════════════════════════════
function renderImagePreview(src, isUserImage) {
  const wrap = document.getElementById("imagePreviewWrap");
  if (!src) {
    wrap.innerHTML = "";
    wrap.classList.add("hidden");
    return;
  }
  wrap.classList.remove("hidden");
  wrap.innerHTML = `
    <div class="img-preview-inner">
      <img src="${escAttr(src)}" alt="Vista previa">
      <button type="button" class="img-preview-remove" onclick="removeUserImage()" title="Quitar imagen">✕</button>
      ${!isUserImage ? `<span class="img-preview-badge">imagen automática</span>` : ""}
    </div>`;
}

window.removeUserImage = () => {
  S._pendingUserImage = null;
  // If editing, also clear the stored image flag
  if (S.editingId) {
    const l = S.links.find(x => x.id === S.editingId);
    if (l) {
      // Mark for deletion on save
      S._clearImages = true;
    }
  }
  renderImagePreview(null, false);
};

document.getElementById("imageUploadInput").addEventListener("change", e => {
  const file = e.target.files[0];
  if (!file) return;
  if (file.size > 600 * 1024) {
    toast("La imagen debe pesar menos de 600KB. Probá con una captura de pantalla.", "error");
    e.target.value = "";
    return;
  }
  const reader = new FileReader();
  reader.onload = ev => {
    // Resize/compress to keep Firestore happy (target ~400px wide)
    const img = new Image();
    img.onload = () => {
      const canvas = document.createElement("canvas");
      const MAX = 600;
      let w = img.width, h = img.height;
      if (w > MAX) { h = Math.round(h * MAX / w); w = MAX; }
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d").drawImage(img, 0, 0, w, h);
      const base64 = canvas.toDataURL("image/jpeg", 0.82);
      S._pendingUserImage = base64;
      S._clearImages = false;
      renderImagePreview(base64, true);
    };
    img.src = ev.target.result;
  };
  reader.readAsDataURL(file);
  e.target.value = ""; // reset so same file can be re-selected
});

// Tags input
document.getElementById("tagTextInput").addEventListener("keydown", e => {
  if (e.key === "Enter" || e.key === ",") {
    e.preventDefault();
    const val = e.target.value.trim().replace(/^#/,"").replace(/\s+/g,"-").toLowerCase();
    if (val && !S.currentTags.includes(val)) {
      S.currentTags.push(val);
      renderTagsInModal();
    }
    e.target.value = "";
  }
});

function renderTagsInModal() {
  const wrap = document.getElementById("tagsWrap");
  wrap.querySelectorAll(".input-tag").forEach(t => t.remove());
  const inp = document.getElementById("tagTextInput");
  S.currentTags.forEach(tag => {
    const span = document.createElement("span");
    span.className = "input-tag";
    span.innerHTML = `#${tag} <button type="button" onclick="removeTag('${tag}')">×</button>`;
    wrap.insertBefore(span, inp);
  });
}
window.removeTag = tag => {
  S.currentTags = S.currentTags.filter(t => t !== tag);
  renderTagsInModal();
};

// ═══════════════════════════════════════════
// MODAL NUEVA CATEGORÍA
// ═══════════════════════════════════════════
document.getElementById("addCatBtn").addEventListener("click", () => {
  document.getElementById("catNameInput").value = "";
  document.getElementById("catEmojiInput").value = "";
  openModal("catModal");
});

document.getElementById("saveCatBtn").addEventListener("click", async () => {
  const name  = document.getElementById("catNameInput").value.trim();
  const emoji = document.getElementById("catEmojiInput").value.trim() || "📌";
  if (!name) { toast("Ingresá un nombre para la categoría", "error"); return; }
  const CAT_COLORS = [
    {color:"#E1F5EE",textColor:"#085041"},{color:"#FAECE7",textColor:"#4A1B0C"},
    {color:"#E6F1FB",textColor:"#042C53"},{color:"#EAF3DE",textColor:"#173404"},
    {color:"#EEEDFE",textColor:"#26215C"},{color:"#FAEEDA",textColor:"#412402"},
    {color:"#FBEAF0",textColor:"#4B1528"},{color:"#E8F4F8",textColor:"#0D3345"},
  ];
  const c = CAT_COLORS[S.categories.length % CAT_COLORS.length];
  await addDoc(collection(db,"categories"), { name, emoji, ...c, createdAt: serverTimestamp() });
  toast(`Categoría "${name}" creada ✓`);
  closeModal("catModal");
});

// ═══════════════════════════════════════════
// BÚSQUEDA
// ═══════════════════════════════════════════
const searchInp  = document.getElementById("searchInput");
const searchClear= document.getElementById("searchClear");
searchInp.addEventListener("input", () => {
  S.searchQ = searchInp.value.trim();
  searchClear.classList.toggle("hidden", !S.searchQ);
  renderCards();
});
searchClear.addEventListener("click", () => {
  searchInp.value = ""; S.searchQ = "";
  searchClear.classList.add("hidden");
  renderCards();
});

// ═══════════════════════════════════════════
// SIDEBAR TOGGLE (MÓVIL)
// ═══════════════════════════════════════════
document.getElementById("sidebarToggle").addEventListener("click", () => {
  document.getElementById("sidebar").classList.toggle("open");
  document.getElementById("sidebarOverlay").classList.toggle("active");
});
document.getElementById("sidebarOverlay").addEventListener("click", () => {
  document.getElementById("sidebar").classList.remove("open");
  document.getElementById("sidebarOverlay").classList.remove("active");
});

// ═══════════════════════════════════════════
// UTILS – MODALES
// ═══════════════════════════════════════════
function openModal(id)  { document.getElementById(id).classList.remove("hidden"); }
function closeModal(id) { document.getElementById(id).classList.add("hidden"); }
window.closeModal = closeModal;

document.querySelectorAll("[data-close]").forEach(btn => {
  btn.addEventListener("click", () => closeModal(btn.dataset.close));
});
document.querySelectorAll(".overlay").forEach(ov => {
  ov.addEventListener("click", e => { if (e.target === ov) closeModal(ov.id); });
});

// ═══════════════════════════════════════════
// UTILS – POPULAT CAT SELECT
// ═══════════════════════════════════════════
function populateCatSelect() {
  const sel = document.getElementById("catSelect");
  const prev = sel.value;
  sel.innerHTML = `<option value="">Sin categoría</option>` +
    S.categories.map(c => `<option value="${c.id}">${c.emoji} ${c.name}</option>`).join("");
  sel.value = prev;
}

// ═══════════════════════════════════════════
// UTILS – TOP STATS
// ═══════════════════════════════════════════
function updateTopStats() {
  document.getElementById("topStats").textContent =
    `${S.links.length} link${S.links.length!==1?"s":""} guardado${S.links.length!==1?"s":""}`;
}

// ═══════════════════════════════════════════
// UTILS – TOAST
// ═══════════════════════════════════════════
function toast(msg, type="success") {
  const el = document.createElement("div");
  el.className = `toast ${type}`;
  el.innerHTML = `<span class="toast-icon">${type==="error"?"✕":"✓"}</span> ${msg}`;
  document.getElementById("toastContainer").appendChild(el);
  setTimeout(() => el.remove(), 2800);
}

// ═══════════════════════════════════════════
// UTILS – ESCAPE HTML
// ═══════════════════════════════════════════
function escHtml(str="") {
  return str.replace(/&/g,"&amp;").replace(/</g,"&lt;").replace(/>/g,"&gt;").replace(/"/g,"&quot;");
}
function escAttr(str="") {
  return str.replace(/"/g,"&quot;").replace(/'/g,"&#39;");
}

// ═══════════════════════════════════════════
// API KEY MANAGEMENT
// ═══════════════════════════════════════════
function getApiKey() {
  return localStorage.getItem("fl_apikey") || "";
}
function setApiKey(key) {
  localStorage.setItem("fl_apikey", key.trim());
}

window.saveApiKey = () => {
  const inp = document.getElementById("apiKeyInput");
  const key = inp.value.trim();
  if (!key.startsWith("sk-ant-")) {
    toast("La clave debe comenzar con sk-ant-", "error");
    return;
  }
  setApiKey(key);
  inp.value = "sk-ant-...guardada";
  toast("Clave API guardada ✓");
  closeModal("apiKeyModal");
};

window.openApiKeyModal = () => {
  const inp = document.getElementById("apiKeyInput");
  const existing = getApiKey();
  inp.value = existing ? "sk-ant-...guardada" : "";
  openModal("apiKeyModal");
};

// ═══════════════════════════════════════════
// FETCH OPEN GRAPH IMAGE
// ═══════════════════════════════════════════
async function fetchOgImage(url) {
  try {
    const proxyUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`;
    const res = await fetch(proxyUrl, { signal: AbortSignal.timeout(8000) });
    if (!res.ok) return null;
    const data = await res.json();
    const html = data.contents || "";
    // Try og:image first, then twitter:image
    const ogMatch = html.match(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+property=["']og:image["']/i)
      || html.match(/<meta[^>]+name=["']twitter:image["'][^>]+content=["']([^"']+)["']/i)
      || html.match(/<meta[^>]+content=["']([^"']+)["'][^>]+name=["']twitter:image["']/i);
    if (ogMatch && ogMatch[1]) {
      let imgUrl = ogMatch[1];
      // Handle relative URLs
      if (imgUrl.startsWith("/")) {
        const base = new URL(url);
        imgUrl = base.origin + imgUrl;
      }
      return imgUrl;
    }
  } catch(e) {
    // Silently fail
  }
  return null;
}
