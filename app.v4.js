/* ══════════════════════════════════════
   SAFA NATURE — app.v4.js
   Version propre et stable
══════════════════════════════════════ */

// ── FIREBASE ─────────────────────────────
const firebaseConfig = {
  apiKey:            "AIzaSyAQyw3emVSE_rAKlQw2tvI8Lii4r8K256s",
  authDomain:        "safa-nature.firebaseapp.com",
  projectId:         "safa-nature",
  storageBucket:     "safa-nature.firebasestorage.app",
  messagingSenderId: "1069220685040",
  appId:             "1:1069220685040:web:20b4ea247ac04b46c00e35"
};
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db   = firebase.firestore();

// ── CONSTANTES ───────────────────────────
const ADMIN_EMAILS = ['a.sorour@a2i.co.ma','adil.sorour@gmail.com','safaa@safanature.ma'];
const SHARED_UID   = 'HtSiS1gJpuWKZ5K0W4fjMmG3QhL2';
const UNITS = ['1kg','500g','250g','100g','50g','250ml','100ml','60ml','40ml','30ml','1p','Pièce'];
const CATS  = ['Miel','Amlou','Huiles','Vinaigre','Pollen','Savon','Eau de rose','Autres'];
const DEFAULT_NAMES = [
  "Miel d'Euphorbe","Miel d'Oranger","Miel de Thym","Miel de Carobe",
  "Miel d'Eucalyptus","Miel de Sidr","Miel des Herbes","Miel de Chardon","Miel de Zagoume",
  "Amlou Graine de citrouille","Amlou LOUZE - CHOCOLAT","Amlou LOUZE - NORMAL","Amlou cacahuète",
  "Vinaigre de Cidre","Vinaigre de Figue de barbarie","Pollen",
  "Argan alimentaire","Argan cosmétique",
  "Simsim","Louze hlou","Louze mor","Kharwa3","Kouk","Halba","Yazir","Joujouba",
  "Bodour alkattan","Glissirine","la formule des 7 huiles","la force des 14 huiles","tachkikat acha3r",
  "Argan gommage","Eau de rose distillé"
];

// ── ÉTAT ─────────────────────────────────
let currentUser   = null;
let userRole      = 'restricted';
let allOrders     = [];
let allProducts   = [];
let allAds        = [];
let editOrderId   = null;
let editProductId = null;
let chartCA, chartOrders, chartAds;

// ── HELPERS ──────────────────────────────
const $ = id => document.getElementById(id);
const fmt = n => (parseFloat(n)||0).toLocaleString('fr-MA',{minimumFractionDigits:0,maximumFractionDigits:2});
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const isAdmin = () => userRole === 'admin';
const openModal  = id => { const el=$(id); if(el){ el.style.display='flex'; } };
const closeModal = id => { const el=$(id); if(el){ el.style.display='none'; } };
const clearFields = (...ids) => ids.forEach(id => { const el=$(id); if(el) el.value=''; });
const showMsg = (el,msg,type) => { if(!el)return; el.textContent=msg; el.className='profile-msg '+type; el.classList.remove('hidden'); setTimeout(()=>el.classList.add('hidden'),3000); };
const getNames = () => { try { const s=localStorage.getItem('sn_names'); return s?JSON.parse(s):[...DEFAULT_NAMES]; } catch(e){ return [...DEFAULT_NAMES]; } };
const saveNames = names => { try { localStorage.setItem('sn_names',JSON.stringify(names)); } catch(e){} };

// ── AUTH STATE ───────────────────────────
auth.onAuthStateChanged(user => {
  console.log('onAuthStateChanged:', user ? user.email : 'null');
  const splash = $('splash');
  if (splash) splash.style.display = 'none';

  if (user) {
    currentUser = user;
    userRole = ADMIN_EMAILS.includes(user.email) ? 'admin' : 'restricted';
    console.log('Role:', userRole);
    $('auth-screen').classList.add('hidden');
    $('app').classList.remove('hidden');
    initApp();
  } else {
    $('auth-screen').classList.remove('hidden');
    $('app').classList.add('hidden');
  }
});

// ── LOGIN ────────────────────────────────
$('btn-login').addEventListener('click', async () => {
  const email = $('login-email').value.trim();
  const pass  = $('login-password').value;
  const errEl = $('auth-error');
  const btn   = $('btn-login');
  errEl.classList.add('hidden');
  if (!email || !pass) { errEl.textContent='Remplissez tous les champs'; errEl.classList.remove('hidden'); return; }
  btn.textContent = 'Connexion…';
  try {
    await auth.signInWithEmailAndPassword(email, pass);
  } catch(e) {
    btn.textContent = 'Se connecter';
    const msgs = {'auth/user-not-found':'Utilisateur introuvable.','auth/wrong-password':'Mot de passe incorrect.','auth/invalid-credential':'Email ou mot de passe incorrect.'};
    errEl.textContent = msgs[e.code] || e.message;
    errEl.classList.remove('hidden');
  }
});

$('btn-google').addEventListener('click', async () => {
  const btn = $('btn-google');
  try {
    btn.disabled=true; btn.textContent='Connexion…';
    await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
  } catch(e) {
    btn.disabled=false; btn.textContent='Continuer avec Google';
  }
});

$('btn-forgot').addEventListener('click', async () => {
  const email = $('login-email').value.trim();
  const errEl = $('auth-error');
  if (!email) { errEl.textContent="Entrez votre email d'abord"; errEl.classList.remove('hidden'); return; }
  try {
    await auth.sendPasswordResetEmail(email);
    errEl.style.cssText='background:#e8f5e3;color:#2d5a27';
    errEl.textContent='✅ Email envoyé à '+email;
    errEl.classList.remove('hidden');
  } catch(e) { errEl.textContent=e.message; errEl.classList.remove('hidden'); }
});

// ── INIT APP ─────────────────────────────
function initApp() {
  applyRoleUI();
  loadProfile();
  setWelcomeDate();
  loadProducts();
  loadOrders();
  loadAds();
  setupNav();
  setupModals();
  setupProducts();
  setupOrders();
  setupAds();
  setupProfile();
  setupReports();
  setupNamesManager();
  populateSelects();
}

// ── RÔLES ────────────────────────────────
function applyRoleUI() {
  document.querySelectorAll('.admin-only').forEach(el => el.style.display = isAdmin()?'':'none');
  const rb = $('role-badge');
  if (rb) { rb.textContent = isAdmin()?'👑 Administrateur':'👁️ Consultation'; rb.className='role-badge '+(isAdmin()?'admin':'restricted'); }
}

// ── NAV ──────────────────────────────────
function setupNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click', () => navigateTo(btn.dataset.page)));
  const av = $('topbar-avatar'); if(av) av.addEventListener('click', () => navigateTo('profil'));
}

function navigateTo(page) {
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page===page));
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id==='page-'+page));
  const titles = {dashboard:'Tableau de bord',commandes:'Commandes',stocks:'Stocks',rapports:'Rapports',profil:'Profil'};
  $('page-title').textContent = titles[page]||'';
  if (page==='rapports') setTimeout(initCharts,100);
}

function setWelcomeDate() {
  const el=$('welcome-date'); if(!el)return;
  el.innerHTML = new Date().toLocaleDateString('fr-MA',{weekday:'long',day:'numeric',month:'long'}).replace(',','<br>');
}

// ── MODALS ───────────────────────────────
function setupModals() {
  document.querySelectorAll('.modal-close').forEach(btn => btn.addEventListener('click', () => closeModal(btn.dataset.modal)));
  document.querySelectorAll('.modal').forEach(modal => modal.addEventListener('click', e => { if(e.target===modal) closeModal(modal.id); }));
}

// ── PROFIL ───────────────────────────────
function setupProfile() {
  $('btn-logout').addEventListener('click', async () => { if(confirm('Se déconnecter ?')){ await auth.signOut(); location.reload(); } });
  $('btn-reset-password').addEventListener('click', async () => {
    if (!currentUser) return;
    if (!confirm('Envoyer un email de réinitialisation à '+currentUser.email+' ?')) return;
    try { await auth.sendPasswordResetEmail(currentUser.email); showMsg($('profile-msg'),'✅ Email envoyé','success'); }
    catch(e) { showMsg($('profile-msg'),'❌ '+e.message,'error'); }
  });
  $('btn-save-profile').addEventListener('click', async () => {
    if (!isAdmin()) return;
    try {
      await db.collection('users').doc(currentUser.uid).set({
        displayName: $('profile-name').value, phone: $('profile-phone').value,
        store: $('profile-store').value, city: $('profile-city').value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, {merge:true});
      showMsg($('profile-msg'),'✅ Profil enregistré','success');
      loadProfile();
    } catch(e) { showMsg($('profile-msg'),'❌ '+e.message,'error'); }
  });
}

async function loadProfile() {
  if (!currentUser) return;
  try {
    const doc = await db.collection('users').doc(currentUser.uid).get();
    const data = doc.exists ? doc.data() : {};
    const name = data.displayName || currentUser.displayName || currentUser.email || '';
    $('profile-name').value  = name;
    $('profile-email').value = currentUser.email;
    $('profile-phone').value = data.phone||'';
    $('profile-store').value = data.store||'Safa Nature';
    $('profile-city').value  = data.city||'Casablanca';
    const ini = name.charAt(0).toUpperCase()||'A';
    $('profile-avatar-display').textContent = ini;
    $('topbar-avatar').textContent = ini;
    $('profile-display-name').textContent  = name;
    $('profile-display-email').textContent = currentUser.email;
    $('welcome-name').textContent = name.split(' ')[0]||'vous';
  } catch(e) { console.error('loadProfile:',e); }
}

// ── PRODUITS ─────────────────────────────
function populateSelects() {
  const u=$('product-unit'), c=$('product-category');
  if(u) u.innerHTML = UNITS.map(x=>`<option value="${x}">${x}</option>`).join('');
  if(c) c.innerHTML = CATS.map(x=>`<option value="${x}">${x}</option>`).join('');
  populateNameSelect();
}

function populateNameSelect() {
  const sel = $('product-name-select'); if(!sel) return;
  const names = getNames();
  sel.innerHTML = '<option value="">-- Choisir un nom --</option>' +
    names.map(n=>`<option value="${n}">${n}</option>`).join('') +
    '<option value="__custom__">✏️ Autre nom (saisie libre)</option>';
  sel.onchange = () => {
    const row = $('product-name-custom-row');
    if (sel.value==='__custom__') { if(row) row.style.display=''; $('product-name-custom-input').focus(); }
    else { if(row) row.style.display='none'; }
  };
}

function getProductName() {
  const sel = $('product-name-select');
  if (!sel) return '';
  if (sel.value === '__custom__') return ($('product-name-custom-input')||{value:''}).value.trim();
  return sel.value;
}

function setupProducts() {
  $('btn-add-product').addEventListener('click', () => {
    if (!isAdmin()) return;
    editProductId = null;
    populateSelects();
    clearFields('product-qty','product-price-sale','product-price-buy','product-alert');
    $('product-name-select').value = '';
    const row=$('product-name-custom-row'); if(row) row.style.display='none';
    const mp=$('margin-preview'); if(mp){mp.textContent='';mp.className='margin-preview';}
    $('btn-delete-product').style.display='none';
    openModal('modal-product');
  });

  $('btn-save-product').addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) { alert('Session expirée'); return; }
    const name = getProductName();
    if (!name) { alert('Choisissez ou entrez un nom de produit'); return; }
    const sale = parseFloat($('product-price-sale').value)||0;
    const buy  = parseFloat($('product-price-buy').value)||0;
    const data = {
      uid: SHARED_UID, name,
      category: $('product-category').value||'Miel',
      qty:      parseFloat($('product-qty').value)||0,
      unit:     $('product-unit').value||'500g',
      priceSale: sale, priceBuy: buy,
      margin: sale-buy,
      marginPct: sale>0?((sale-buy)/sale*100):0,
      alertThreshold: parseFloat($('product-alert').value)||5,
    };
    const btn=$('btn-save-product'); btn.textContent='Enregistrement…'; btn.disabled=true;
    try {
      if (editProductId) {
        await db.collection('products').doc(editProductId).update({...data, updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
      } else {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('products').add(data);
      }
      closeModal('modal-product');
      await loadProducts();
    } catch(e) { alert('❌ '+e.message); }
    finally { btn.textContent='Enregistrer'; btn.disabled=false; }
  });

  $('btn-delete-product').addEventListener('click', async () => {
    if (!editProductId || !confirm('Supprimer ce produit ?')) return;
    try { await db.collection('products').doc(editProductId).delete(); closeModal('modal-product'); await loadProducts(); }
    catch(e) { alert('❌ '+e.message); }
  });

  ['product-price-sale','product-price-buy'].forEach(id => {
    const el=$(id); if(!el) return;
    el.addEventListener('input', () => {
      const s=parseFloat($('product-price-sale').value)||0, b=parseFloat($('product-price-buy').value)||0;
      const mp=$('margin-preview'); if(!mp) return;
      if(s>0){mp.textContent='Marge : '+fmt(s-b)+' MAD ('+((s-b)/s*100).toFixed(1)+'%)'; mp.className='margin-preview '+(s>=b?'positive':'negative');}
      else{mp.textContent='';mp.className='margin-preview';}
    });
  });
}

async function loadProducts() {
  if (!auth.currentUser) return;
  try {
    const snap = await db.collection('products').where('uid','==',SHARED_UID).get();
    allProducts = snap.docs.map(d=>({id:d.id,...d.data()}));
    allProducts.sort((a,b)=>(a.name||'').localeCompare(b.name||''));
    console.log('Produits:', allProducts.length);
    renderProducts();
    renderStockAlerts();
    updateKPIs();
  } catch(e) { console.error('loadProducts:',e); }
}

function renderProducts() {
  const grid=$('products-list'); if(!grid) return;
  if (!allProducts.length) { grid.innerHTML='<div class="empty-state">Aucun produit</div>'; return; }
  grid.innerHTML = allProducts.map(p => {
    const low = p.qty<=(p.alertThreshold||5);
    const m = (p.priceSale||0)-(p.priceBuy||0);
    const pct = p.priceSale>0?((m/p.priceSale)*100).toFixed(0):0;
    const adminInfo = isAdmin()?`<div class="product-margin"><span class="margin-badge">Achat : ${fmt(p.priceBuy)} MAD</span><span class="margin-badge green">Marge : ${fmt(m)} MAD (${pct}%)</span></div>`:'';
    return `<div class="product-card" data-id="${p.id}">
      <div class="product-info"><div class="product-name">${esc(p.name||'—')}</div><div class="product-cat">${esc(p.category||'')} · ${esc(p.unit||'')}</div>${low?'<span class="product-alert-badge">⚠️ Stock bas</span>':''}${adminInfo}</div>
      <div class="product-right"><div class="product-qty">${p.qty??'—'}</div><div class="product-price">${fmt(p.priceSale)} MAD</div></div>
    </div>`;
  }).join('');
  grid.querySelectorAll('.product-card').forEach(el => el.addEventListener('click', () => {
    if (!isAdmin()) return;
    const p = allProducts.find(x=>x.id===el.dataset.id); if(!p) return;
    editProductId = p.id;
    populateSelects();
    const names = getNames();
    const sel = $('product-name-select');
    const row = $('product-name-custom-row');
    const ci  = $('product-name-custom-input');
    if (names.includes(p.name)) { if(sel) sel.value=p.name; if(row) row.style.display='none'; }
    else { if(sel) sel.value='__custom__'; if(row) row.style.display=''; if(ci) ci.value=p.name||''; }
    $('product-category').value   = p.category||'Miel';
    $('product-qty').value        = p.qty??'';
    $('product-unit').value       = p.unit||'500g';
    $('product-price-sale').value = p.priceSale||'';
    $('product-price-buy').value  = p.priceBuy||'';
    $('product-alert').value      = p.alertThreshold||5;
    $('btn-delete-product').style.display = '';
    openModal('modal-product');
  }));
}

function renderStockAlerts() {
  const el=$('stock-alerts'); if(!el) return;
  const low = allProducts.filter(p=>p.qty<=(p.alertThreshold||5));
  el.innerHTML = low.length ? low.map(p=>`<div class="alert-item">⚠️ <strong>${esc(p.name)}</strong> — ${p.qty} ${esc(p.unit||'')}</div>`).join('') : '<div class="empty-state">Stock en ordre ✅</div>';
}

// ── COMMANDES ────────────────────────────
function setupOrders() {
  $('btn-add-order').addEventListener('click', () => {
    if (!isAdmin()) return;
    editOrderId = null;
    $('modal-order-title').textContent = 'Nouvelle commande';
    clearFields('order-client','order-phone','order-products','order-amount','order-notes');
    $('order-channel').value='whatsapp'; $('order-status').value='pending';
    $('btn-delete-order').style.display='none';
    openModal('modal-order');
  });

  $('btn-save-order').addEventListener('click', async () => {
    const user=auth.currentUser; if(!user) return;
    const client=($('order-client').value||'').trim();
    if (!client) { alert('Entrez le nom du client'); return; }
    const data = {
      uid: SHARED_UID, client,
      phone:    $('order-phone').value.trim(),
      products: $('order-products').value.trim(),
      amount:   parseFloat($('order-amount').value)||0,
      channel:  $('order-channel').value,
      status:   $('order-status').value,
      notes:    $('order-notes').value.trim(),
    };
    const btn=$('btn-save-order'); btn.textContent='Enregistrement…'; btn.disabled=true;
    try {
      if (editOrderId) {
        const prev = allOrders.find(o=>o.id===editOrderId);
        await db.collection('orders').doc(editOrderId).update({...data, updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
        if (prev && prev.status!=='done' && data.status==='done') await deductStock(data.products);
      } else {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('orders').add(data);
        if (data.status==='done') await deductStock(data.products);
      }
      closeModal('modal-order'); await loadOrders(); await loadProducts();
    } catch(e) { alert('❌ '+e.message); }
    finally { btn.textContent='Enregistrer'; btn.disabled=false; }
  });

  $('btn-delete-order').addEventListener('click', async () => {
    if (!editOrderId||!confirm('Supprimer cette commande ?')) return;
    try { await db.collection('orders').doc(editOrderId).delete(); closeModal('modal-order'); await loadOrders(); }
    catch(e) { alert('❌ '+e.message); }
  });

  document.querySelectorAll('.filter-btn').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active'); renderOrders(btn.dataset.filter);
  }));
}

async function loadOrders() {
  if (!auth.currentUser) return;
  try {
    const snap = await db.collection('orders').where('uid','==',SHARED_UID).get();
    allOrders = snap.docs.map(d=>({id:d.id,...d.data()}));
    allOrders.sort((a,b)=>(b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
    renderOrders('all'); renderRecentOrders(); updateKPIs();
  } catch(e) { console.error('loadOrders:',e); }
}

function renderOrders(filter='all') {
  const list=$('orders-list'); if(!list) return;
  const orders = filter==='all'?allOrders:allOrders.filter(o=>o.status===filter);
  if (!orders.length) { list.innerHTML='<div class="empty-state">Aucune commande</div>'; return; }
  list.innerHTML = orders.map(o=>orderHTML(o)).join('');
  list.querySelectorAll('.order-item').forEach(el => el.addEventListener('click', () => {
    if (!isAdmin()) return;
    const o=allOrders.find(x=>x.id===el.dataset.id); if(!o) return;
    editOrderId=o.id;
    $('modal-order-title').textContent='Modifier la commande';
    $('order-client').value=o.client||''; $('order-phone').value=o.phone||'';
    $('order-products').value=o.products||''; $('order-amount').value=o.amount||'';
    $('order-channel').value=o.channel||'whatsapp'; $('order-status').value=o.status||'pending';
    $('order-notes').value=o.notes||'';
    $('btn-delete-order').style.display='';
    openModal('modal-order');
  }));
}

function renderRecentOrders() {
  const el=$('recent-orders'); if(!el) return;
  const r=allOrders.slice(0,3);
  el.innerHTML = r.length?r.map(o=>orderHTML(o)).join(''):'<div class="empty-state">Aucune commande</div>';
}

function orderHTML(o) {
  const labels={pending:'En attente',confirmed:'Confirmée',done:'Livrée',cancelled:'Annulée'};
  const date=o.createdAt?new Date(o.createdAt.seconds*1000).toLocaleDateString('fr-MA'):'—';
  return `<div class="order-item" data-id="${o.id}"><div class="order-info"><div class="order-client">${esc(o.client||'—')}</div><div class="order-meta">${esc(o.products||'')} · ${date}</div></div><div class="order-right"><div class="order-amount">${fmt(o.amount)} MAD</div><div class="order-status status-${o.status||'pending'}">${labels[o.status]||'En attente'}</div></div></div>`;
}

async function deductStock(productsText) {
  if (!productsText||!allProducts.length) return;
  const names = productsText.split(',').map(p=>p.trim().toLowerCase()).filter(Boolean);
  for (const name of names) {
    const p = allProducts.find(x=>(x.name||'').toLowerCase().includes(name)||name.includes((x.name||'').toLowerCase()));
    if (p && p.qty>0) {
      await db.collection('products').doc(p.id).update({qty: Math.max(0,p.qty-1)});
      console.log('Stock mis à jour:',p.name,'→',p.qty-1);
    }
  }
}

// ── ADS ──────────────────────────────────
function setupAds() {
  $('btn-add-ads').addEventListener('click', () => {
    $('ads-date').value=new Date().toISOString().split('T')[0];
    clearFields('ads-campaign','ads-spend','ads-reach','ads-clicks','ads-conv');
    openModal('modal-ads');
  });
  $('btn-save-ads').addEventListener('click', async () => {
    const user=auth.currentUser; if(!user) return;
    const data = {
      uid: SHARED_UID,
      date: $('ads-date').value, campaign: $('ads-campaign').value.trim(),
      spend: parseFloat($('ads-spend').value)||0, reach: parseInt($('ads-reach').value)||0,
      clicks: parseInt($('ads-clicks').value)||0, conversions: parseInt($('ads-conv').value)||0,
      createdAt: firebase.firestore.FieldValue.serverTimestamp()
    };
    try { await db.collection('ads').add(data); closeModal('modal-ads'); await loadAds(); }
    catch(e) { alert('❌ '+e.message); }
  });
}

async function loadAds() {
  if (!auth.currentUser) return;
  try {
    const snap=await db.collection('ads').where('uid','==',SHARED_UID).get();
    allAds=snap.docs.map(d=>({id:d.id,...d.data()}));
    allAds.sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    renderAdsEntries(); updateKPIs();
  } catch(e) { console.error('loadAds:',e); }
}

function renderAdsEntries() {
  const el=$('ads-entries-list'); if(!el) return;
  el.innerHTML=allAds.length?allAds.slice(0,10).map(a=>`<div class="order-item"><div class="order-info"><div class="order-client">${esc(a.campaign||'—')}</div><div class="order-meta">${a.date||'—'} · ${(a.reach||0).toLocaleString()} portée</div></div><div class="order-right"><div class="order-amount">${fmt(a.spend)} MAD</div><div class="order-meta">${a.clicks||0} clics</div></div></div>`).join(''):'<div class="empty-state">Aucune donnée</div>';
}

// ── KPIs ─────────────────────────────────
function updateKPIs() {
  const now=new Date(), som=new Date(now.getFullYear(),now.getMonth(),1);
  const ca=allOrders.filter(o=>o.status!=='cancelled'&&o.createdAt&&new Date(o.createdAt.seconds*1000)>=som).reduce((s,o)=>s+(o.amount||0),0);
  const e1=$('kpi-ca'); if(e1) e1.textContent=fmt(ca)+' MAD';
  const e2=$('kpi-orders'); if(e2) e2.textContent=allOrders.filter(o=>o.createdAt&&new Date(o.createdAt.seconds*1000)>=som).length;
  const e3=$('kpi-stock'); if(e3) e3.textContent=allProducts.length;
  const ads=allAds.filter(a=>a.date&&new Date(a.date)>=som).reduce((s,a)=>s+(a.spend||0),0);
  const e4=$('kpi-ads'); if(e4) e4.textContent=fmt(ads)+' MAD';
}

// ── RAPPORTS ─────────────────────────────
function setupReports() {
  document.querySelectorAll('.rtab').forEach(btn => btn.addEventListener('click', () => {
    document.querySelectorAll('.rtab').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.rtab-content').forEach(c=>c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('rtab-'+btn.dataset.tab).classList.add('active');
    setTimeout(initCharts,50);
  }));
}

function initCharts() {
  const c1=$('chart-ca'), c2=$('chart-orders'), c3=$('chart-ads');
  if(c1){
    if(chartCA)chartCA.destroy();
    const days=30,labels=[],vals=[];
    for(let i=days-1;i>=0;i--){const d=new Date();d.setDate(d.getDate()-i);labels.push(d.toLocaleDateString('fr-MA',{day:'2-digit',month:'2-digit'}));const ds=new Date(d.getFullYear(),d.getMonth(),d.getDate()),de=new Date(ds);de.setDate(de.getDate()+1);vals.push(allOrders.filter(o=>o.status!=='cancelled'&&o.createdAt&&new Date(o.createdAt.seconds*1000)>=ds&&new Date(o.createdAt.seconds*1000)<de).reduce((s,o)=>s+(o.amount||0),0));}
    chartCA=new Chart(c1,{type:'line',data:{labels,datasets:[{label:'CA',data:vals,borderColor:'#2d5a27',backgroundColor:'rgba(45,90,39,.1)',borderWidth:2,fill:true,tension:.4,pointRadius:3}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{ticks:{maxTicksLimit:6,font:{size:10}},grid:{display:false}},y:{ticks:{font:{size:10}},beginAtZero:true}}}});
  }
  if(c2){
    if(chartOrders)chartOrders.destroy();
    const cnt={pending:0,confirmed:0,done:0,cancelled:0};allOrders.forEach(o=>{if(cnt[o.status]!==undefined)cnt[o.status]++;});
    chartOrders=new Chart(c2,{type:'doughnut',data:{labels:['En attente','Confirmées','Livrées','Annulées'],datasets:[{data:Object.values(cnt),backgroundColor:['#f5c842','#2e6da4','#2d5a27','#c0392b'],borderWidth:0}]},options:{responsive:true,plugins:{legend:{position:'bottom',labels:{font:{size:11},padding:12}}}}});
  }
  if(c3){
    if(chartAds)chartAds.destroy();
    const s=[...allAds].sort((a,b)=>a.date>b.date?1:-1).slice(-14);
    chartAds=new Chart(c3,{type:'bar',data:{labels:s.map(a=>a.date?.slice(5)||''),datasets:[{label:'Dépense',data:s.map(a=>a.spend||0),backgroundColor:'#c8971f',borderRadius:6}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{font:{size:10}}},y:{beginAtZero:true,ticks:{font:{size:10}}}}}});
  }
  // Stats
  const tc=allOrders.filter(o=>o.status!=='cancelled').reduce((s,o)=>s+(o.amount||0),0);
  const e1=$('stat-total-ca');if(e1)e1.textContent=fmt(tc)+' MAD';
  const done=allOrders.filter(o=>o.status==='done');
  const avg=done.length?done.reduce((s,o)=>s+(o.amount||0),0)/done.length:0;
  const e2=$('stat-avg-order');if(e2)e2.textContent=fmt(avg)+' MAD';
  const pc={};allOrders.forEach(o=>{if(o.products)o.products.split(',').forEach(p=>{const k=p.trim();if(k)pc[k]=(pc[k]||0)+1;});});
  const top=Object.entries(pc).sort((a,b)=>b[1]-a[1])[0];
  const e3=$('stat-top-product');if(e3)e3.textContent=top?top[0]:'—';
  const ts=allAds.reduce((s,a)=>s+(a.spend||0),0);
  const tr=allAds.reduce((s,a)=>s+(a.reach||0),0);
  const e4=$('stat-ads-spend');if(e4)e4.textContent=fmt(ts)+' MAD';
  const e5=$('stat-ads-reach');if(e5)e5.textContent=tr>1000?(tr/1000).toFixed(1)+'K':tr;
  const e6=$('stat-ads-roas');if(e6)e6.textContent=ts>0?(allAds.reduce((s,a)=>s+(a.conversions||0),0)*avg/ts).toFixed(2):'—';
}

// ── GESTION NOMS ─────────────────────────
function setupNamesManager() {
  const btn=$('btn-manage-names');
  if(btn) btn.addEventListener('click', () => { renderNamesList(); openModal('modal-names'); });
  const btnAdd=$('btn-add-name');
  if(btnAdd) btnAdd.addEventListener('click', () => {
    const inp=$('new-product-name-input');
    const name=(inp.value||'').trim();
    if (!name){alert('Entrez un nom');return;}
    const names=getNames();
    if(names.includes(name)){alert('Ce nom existe déjà');return;}
    names.push(name); names.sort(); saveNames(names);
    inp.value=''; renderNamesList(); populateNameSelect();
  });
  const inp=$('new-product-name-input');
  if(inp) inp.addEventListener('keypress', e=>{ if(e.key==='Enter') $('btn-add-name').click(); });
}

function renderNamesList() {
  const el=$('names-list'); if(!el) return;
  const names=getNames();
  if(!names.length){el.innerHTML='<div class="empty-state">Aucun nom</div>';return;}
  el.innerHTML=names.map((n,i)=>`<div class="name-item"><span>${n}</span><button class="btn-delete-name" data-i="${i}">🗑️</button></div>`).join('');
  el.querySelectorAll('.btn-delete-name').forEach(btn=>btn.addEventListener('click',()=>{
    const names=getNames(); const n=names[parseInt(btn.dataset.i)];
    if(!confirm('Supprimer "'+n+'" ?'))return;
    names.splice(parseInt(btn.dataset.i),1); saveNames(names);
    renderNamesList(); populateNameSelect();
  }));
}
