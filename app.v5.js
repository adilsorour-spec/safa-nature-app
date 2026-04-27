/* ══════════════════════════════════════
   SAFA NATURE — app.v5.js
   Commandes+Packs+Achats+Rapports
══════════════════════════════════════ */

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
let allPacks      = [];
let allPurchases  = [];
let allAds        = [];
let editOrderId   = null;
let editProductId = null;
let editPackId    = null;
let packItems     = []; // items en cours de création de pack
let chartCA, chartOrders, chartAds, chartBenefit, chartChannel, chartSupplier;

// ── HELPERS ──────────────────────────────
const $ = id => document.getElementById(id);
const fmt = n => (parseFloat(n)||0).toLocaleString('fr-MA',{minimumFractionDigits:0,maximumFractionDigits:2});
const esc = s => String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
const isAdmin = () => userRole === 'admin';
const openModal  = id => { const el=$(id); if(el) el.style.display='flex'; };
const closeModal = id => { const el=$(id); if(el) el.style.display='none'; };
const clearFields = (...ids) => ids.forEach(id => { const el=$(id); if(el) el.value=''; });
const showMsg = (el,msg,type) => { if(!el)return; el.textContent=msg; el.className='profile-msg '+type; el.classList.remove('hidden'); setTimeout(()=>el.classList.add('hidden'),3000); };
const getNames = () => { try { const s=localStorage.getItem('sn_names'); return s?JSON.parse(s):[...DEFAULT_NAMES]; } catch(e){ return [...DEFAULT_NAMES]; } };
const saveNames = names => { try { localStorage.setItem('sn_names',JSON.stringify(names)); } catch(e){} };
const today = () => new Date().toISOString().split('T')[0];

// ── AUTH STATE ───────────────────────────
auth.onAuthStateChanged(user => {
  console.log('Auth:', user ? user.email : 'null');
  const splash = $('splash');
  if (splash) splash.style.display = 'none';
  if (user) {
    currentUser = user;
    userRole = ADMIN_EMAILS.includes(user.email) ? 'admin' : 'restricted';
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
  const email=$('login-email').value.trim(), pass=$('login-password').value;
  const errEl=$('auth-error'), btn=$('btn-login');
  errEl.classList.add('hidden');
  if (!email||!pass){errEl.textContent='Remplissez tous les champs';errEl.classList.remove('hidden');return;}
  btn.textContent='Connexion…';
  try { await auth.signInWithEmailAndPassword(email,pass); }
  catch(e) {
    btn.textContent='Se connecter';
    const msgs={'auth/user-not-found':'Utilisateur introuvable.','auth/wrong-password':'Mot de passe incorrect.','auth/invalid-credential':'Email ou mot de passe incorrect.'};
    errEl.textContent=msgs[e.code]||e.message; errEl.classList.remove('hidden');
  }
});

$('btn-google').addEventListener('click', async () => {
  const btn=$('btn-google');
  try { btn.disabled=true; btn.textContent='Connexion…'; await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider()); }
  catch(e) { btn.disabled=false; btn.textContent='Continuer avec Google'; }
});

$('btn-forgot').addEventListener('click', async () => {
  const email=$('login-email').value.trim(), errEl=$('auth-error');
  if (!email){errEl.textContent="Entrez votre email d'abord";errEl.classList.remove('hidden');return;}
  try {
    await auth.sendPasswordResetEmail(email);
    errEl.style.cssText='background:#e8f5e3;color:#2d5a27';
    errEl.textContent='✅ Email envoyé à '+email; errEl.classList.remove('hidden');
  } catch(e){errEl.textContent=e.message;errEl.classList.remove('hidden');}
});

// ── INIT APP ─────────────────────────────
function initApp() {
  applyRoleUI();
  populateSelects();
  setWelcomeDate();
  setupNav();
  setupModals();
  setupOrders();
  setupProducts();
  setupPacks();
  setupPurchases();
  setupAds();
  setupProfile();
  setupReports();
  setupNamesManager();
  loadAll();
}

async function loadAll() {
  await Promise.all([loadProducts(), loadPacks(), loadOrders(), loadPurchases(), loadAds()]);
  loadProfile();
  refreshDashboard();
}

function refreshDashboard() {
  updateKPIs();
  renderRecentOrders();
  renderStockAlerts();
  setWelcomeDate();
}

// ── RÔLES ────────────────────────────────
function applyRoleUI() {
  document.querySelectorAll('.admin-only').forEach(el => el.style.display=isAdmin()?'':'none');
  document.querySelectorAll('.staff-hidden').forEach(el => el.style.display=isAdmin()?'none':'');
  const rb=$('role-badge');
  if(rb){rb.textContent=isAdmin()?'👑 Administrateur':'👁️ Consultation';rb.className='role-badge '+(isAdmin()?'admin':'restricted');}
}

// ── NAV ──────────────────────────────────
function setupNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => btn.addEventListener('click',()=>navigateTo(btn.dataset.page)));
  const av=$('topbar-avatar'); if(av) av.addEventListener('click',()=>navigateTo('profil'));
}

function navigateTo(page) {
  document.querySelectorAll('.nav-btn').forEach(b=>b.classList.toggle('active',b.dataset.page===page));
  document.querySelectorAll('.page').forEach(p=>p.classList.toggle('active',p.id==='page-'+page));
  const titles={dashboard:'Tableau de bord',commandes:'Commandes',stocks:'Stocks',packs:'Packs',achats:'Achats',rapports:'Rapports',profil:'Profil'};
  $('page-title').textContent=titles[page]||'';
  if(page==='rapports') setTimeout(initCharts,100);
  if(page==='dashboard') refreshDashboard();
}

function setWelcomeDate() {
  const el=$('welcome-date'); if(!el)return;
  el.innerHTML=new Date().toLocaleDateString('fr-MA',{weekday:'long',day:'numeric',month:'long'}).replace(',','<br>');
}

// ── MODALS ───────────────────────────────
function setupModals() {
  document.querySelectorAll('.modal-close').forEach(btn=>btn.addEventListener('click',()=>closeModal(btn.dataset.modal)));
  document.querySelectorAll('.modal').forEach(modal=>modal.addEventListener('click',e=>{if(e.target===modal)closeModal(modal.id);}));
}

// ── SELECTS ──────────────────────────────
function populateSelects() {
  const u=$('product-unit'), c=$('product-category');
  if(u) u.innerHTML=UNITS.map(x=>`<option value="${x}">${x}</option>`).join('');
  if(c) c.innerHTML=CATS.map(x=>`<option value="${x}">${x}</option>`).join('');
  populateNameSelect();
}

function populateNameSelect(selId='product-name-select') {
  const sel=$(selId); if(!sel) return;
  const names=getNames();
  sel.innerHTML='<option value="">-- Choisir un nom --</option>'+
    names.map(n=>`<option value="${n}">${n}</option>`).join('')+
    '<option value="__custom__">✏️ Autre nom (saisie libre)</option>';
  sel.onchange=()=>{
    const rowId = selId==='product-name-select'?'product-name-custom-row':'purchase-name-custom-row';
    const inputId = selId==='product-name-select'?'product-name-custom-input':'purchase-name-custom-input';
    const row=$(rowId);
    if(sel.value==='__custom__'){if(row)row.style.display='';const inp=$(inputId);if(inp)inp.focus();}
    else{if(row)row.style.display='none';}
  };
}

function getProductName(selId='product-name-select',inputId='product-name-custom-input') {
  const sel=$(selId); if(!sel) return '';
  if(sel.value==='__custom__') return ($(inputId)||{value:''}).value.trim();
  return sel.value;
}

// ══════════════════════════════════════════
//  PRODUITS
// ══════════════════════════════════════════
function setupProducts() {
  const btnAdd=$('btn-add-product');
  if(btnAdd) btnAdd.addEventListener('click',()=>openAddProduct());

  $('btn-save-product').addEventListener('click', async()=>{
    const user=auth.currentUser; if(!user){alert('Session expirée');return;}
    const name=getProductName();
    if(!name){alert('Choisissez ou entrez un nom de produit');return;}
    const sale=parseFloat($('product-price-sale').value)||0;
    const buy=parseFloat($('product-price-buy').value)||0;
    const data={
      uid:SHARED_UID, name,
      category:$('product-category').value||'Miel',
      qty:parseFloat($('product-qty').value)||0,
      unit:$('product-unit').value||'500g',
      priceSale:sale, priceBuy:buy,
      margin:sale-buy, marginPct:sale>0?((sale-buy)/sale*100):0,
      alertThreshold:parseFloat($('product-alert').value)||5,
      createdBy: user.email
    };
    const btn=$('btn-save-product'); btn.textContent='Enregistrement…'; btn.disabled=true;
    try {
      if(editProductId){
        await db.collection('products').doc(editProductId).update({...data,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
      } else {
        data.createdAt=firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('products').add(data);
      }
      closeModal('modal-product'); await loadProducts();
    } catch(e){alert('❌ '+e.message);}
    finally{btn.textContent='Enregistrer';btn.disabled=false;}
  });

  const btnDel=$('btn-delete-product');
  if(btnDel) btnDel.addEventListener('click',async()=>{
    if(!editProductId||!isAdmin()||!confirm('Supprimer ce produit ?'))return;
    try{await db.collection('products').doc(editProductId).delete();closeModal('modal-product');await loadProducts();}
    catch(e){alert('❌ '+e.message);}
  });

  ['product-price-sale','product-price-buy'].forEach(id=>{
    const el=$(id); if(!el)return;
    el.addEventListener('input',()=>{
      const s=parseFloat($('product-price-sale').value)||0,b=parseFloat($('product-price-buy').value)||0;
      const mp=$('margin-preview'); if(!mp)return;
      if(s>0){mp.textContent='Marge : '+fmt(s-b)+' MAD ('+((s-b)/s*100).toFixed(1)+'%)';mp.className='margin-preview '+(s>=b?'positive':'negative');}
      else{mp.textContent='';mp.className='margin-preview';}
    });
  });
}

function openAddProduct(prefillName='') {
  editProductId=null;
  populateSelects();
  clearFields('product-qty','product-price-sale','product-price-buy','product-alert');
  if(prefillName){
    const sel=$('product-name-select');
    const names=getNames();
    if(names.includes(prefillName)){sel.value=prefillName;}
    else{sel.value='__custom__';const row=$('product-name-custom-row');if(row)row.style.display='';$('product-name-custom-input').value=prefillName;}
  } else {
    $('product-name-select').value='';
    const row=$('product-name-custom-row');if(row)row.style.display='none';
  }
  const mp=$('margin-preview');if(mp){mp.textContent='';mp.className='margin-preview';}
  const btnDel=$('btn-delete-product');if(btnDel)btnDel.style.display='none';
  const adminFields=document.querySelectorAll('#modal-product .admin-only');
  adminFields.forEach(el=>el.style.display=isAdmin()?'':'none');
  openModal('modal-product');
}

async function loadProducts() {
  if(!auth.currentUser)return;
  try {
    const snap=await db.collection('products').where('uid','==',SHARED_UID).get();
    allProducts=snap.docs.map(d=>({id:d.id,...d.data()}));
    allProducts.sort((a,b)=>(a.name||'').localeCompare(b.name||''));
    console.log('Produits:',allProducts.length);
    renderProducts(); renderStockAlerts(); updateKPIs();
    refreshProductDropdowns();
  } catch(e){console.error('loadProducts:',e);}
}

function renderProducts() {
  const grid=$('products-list'); if(!grid)return;
  if(!allProducts.length){grid.innerHTML='<div class="empty-state">Aucun produit</div>';return;}
  grid.innerHTML=allProducts.map(p=>{
    const low=p.qty<=(p.alertThreshold||5);
    const m=(p.priceSale||0)-(p.priceBuy||0);
    const pct=p.priceSale>0?((m/p.priceSale)*100).toFixed(0):0;
    const adminInfo=isAdmin()?`<div class="product-margin"><span class="margin-badge">Achat : ${fmt(p.priceBuy)} MAD</span><span class="margin-badge green">Marge : ${fmt(m)} MAD (${pct}%)</span></div>`:'';
    return `<div class="product-card" data-id="${p.id}">
      <div class="product-info"><div class="product-name">${esc(p.name||'—')}</div>
      <div class="product-cat">${esc(p.category||'')} · ${esc(p.unit||'')}</div>
      ${low?'<span class="product-alert-badge">⚠️ Stock bas</span>':''}${adminInfo}</div>
      <div class="product-right"><div class="product-qty">${p.qty??'—'}</div><div class="product-price">${fmt(p.priceSale)} MAD</div></div>
    </div>`;
  }).join('');
  grid.querySelectorAll('.product-card').forEach(el=>el.addEventListener('click',()=>{
    if(!isAdmin())return;
    const p=allProducts.find(x=>x.id===el.dataset.id); if(!p)return;
    editProductId=p.id;
    populateSelects();
    const names=getNames(),sel=$('product-name-select'),row=$('product-name-custom-row'),ci=$('product-name-custom-input');
    if(names.includes(p.name)){if(sel)sel.value=p.name;if(row)row.style.display='none';}
    else{if(sel)sel.value='__custom__';if(row)row.style.display='';if(ci)ci.value=p.name||'';}
    $('product-category').value=p.category||'Miel';
    $('product-qty').value=p.qty??'';
    $('product-unit').value=p.unit||'500g';
    $('product-price-sale').value=p.priceSale||'';
    $('product-price-buy').value=p.priceBuy||'';
    $('product-alert').value=p.alertThreshold||5;
    const btnDel=$('btn-delete-product');if(btnDel)btnDel.style.display='';
    openModal('modal-product');
  }));
}

function renderStockAlerts() {
  const el=$('stock-alerts'); if(!el)return;
  const low=allProducts.filter(p=>p.qty<=(p.alertThreshold||5));
  el.innerHTML=low.length?low.map(p=>`<div class="alert-item">⚠️ <strong>${esc(p.name)}</strong> — ${p.qty} ${esc(p.unit||'')}</div>`).join(''):'<div class="empty-state">Stock en ordre ✅</div>';
}

function refreshProductDropdowns() {
  // Refresh product selects in order modal and pack builder
  const orderSel=$('order-product-select');
  if(orderSel){
    const prev=orderSel.value;
    orderSel.innerHTML='<option value="">-- Choisir un produit --</option>'+
      allProducts.map(p=>`<option value="${p.id}">${esc(p.name)} (${p.qty} ${p.unit||''})</option>`).join('');
    orderSel.value=prev;
  }
  const packSel=$('pack-item-product');
  if(packSel){
    packSel.innerHTML='<option value="">-- Produit --</option>'+
      allProducts.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');
  }
  // Purchase product select
  const purchaseProdSel=$('purchase-existing-product');
  if(purchaseProdSel){
    purchaseProdSel.innerHTML='<option value="">-- Sélectionner un produit existant --</option>'+
      allProducts.map(p=>`<option value="${p.id}">${esc(p.name)}</option>`).join('');
  }
}

// ══════════════════════════════════════════
//  PACKS
// ══════════════════════════════════════════
function setupPacks() {
  const btnAdd=$('btn-add-pack');
  if(btnAdd) btnAdd.addEventListener('click',()=>{
    editPackId=null; packItems=[];
    clearFields('pack-name','pack-price-sale');
    renderPackItems();
    $('pack-price-buy-display').textContent='0 MAD';
    $('pack-margin-display').textContent='0 MAD (0%)';
    const btnDel=$('btn-delete-pack');if(btnDel)btnDel.style.display='none';
    openModal('modal-pack');
  });

  $('btn-add-pack-item').addEventListener('click',()=>{
    const pid=$('pack-item-product').value;
    const qty=parseFloat($('pack-item-qty').value)||1;
    if(!pid){alert('Choisissez un produit');return;}
    const prod=allProducts.find(p=>p.id===pid);
    if(!prod)return;
    const existing=packItems.find(i=>i.productId===pid);
    if(existing){existing.qty+=qty;}
    else{packItems.push({productId:pid,name:prod.name,unit:prod.unit,qty,priceBuy:prod.priceBuy||0,priceSale:prod.priceSale||0});}
    $('pack-item-qty').value='1';
    $('pack-item-product').value='';
    renderPackItems(); updatePackPrices();
  });

  $('pack-price-sale').addEventListener('input',updatePackPrices);

  $('btn-save-pack').addEventListener('click',async()=>{
    const name=($('pack-name').value||'').trim();
    if(!name){alert('Entrez le nom du pack');return;}
    if(!packItems.length){alert('Ajoutez au moins un produit');return;}
    const priceSale=parseFloat($('pack-price-sale').value)||0;
    const priceBuy=packItems.reduce((s,i)=>s+(i.priceBuy*i.qty),0);
    const data={
      uid:SHARED_UID, name, items:packItems,
      priceSale, priceBuy, margin:priceSale-priceBuy,
      marginPct:priceSale>0?((priceSale-priceBuy)/priceSale*100):0
    };
    const btn=$('btn-save-pack'); btn.textContent='Enregistrement…'; btn.disabled=true;
    try {
      if(editPackId){
        await db.collection('packs').doc(editPackId).update({...data,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
      } else {
        data.createdAt=firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('packs').add(data);
      }
      closeModal('modal-pack'); await loadPacks();
    } catch(e){alert('❌ '+e.message);}
    finally{btn.textContent='Enregistrer';btn.disabled=false;}
  });

  const btnDelPack=$('btn-delete-pack');
  if(btnDelPack) btnDelPack.addEventListener('click',async()=>{
    if(!editPackId||!confirm('Supprimer ce pack ?'))return;
    try{await db.collection('packs').doc(editPackId).delete();closeModal('modal-pack');await loadPacks();}
    catch(e){alert('❌ '+e.message);}
  });
}

function renderPackItems() {
  const el=$('pack-items-list'); if(!el)return;
  if(!packItems.length){el.innerHTML='<div class="empty-state" style="padding:12px">Aucun produit ajouté</div>';return;}
  el.innerHTML=packItems.map((item,i)=>`
    <div class="pack-item-row">
      <div class="pack-item-info">
        <span class="pack-item-name">${esc(item.name)}</span>
        <span class="pack-item-detail">×${item.qty} ${item.unit||''} · Achat: ${fmt(item.priceBuy*item.qty)} MAD</span>
      </div>
      <button class="btn-remove-item" data-i="${i}">✕</button>
    </div>`).join('');
  el.querySelectorAll('.btn-remove-item').forEach(btn=>btn.addEventListener('click',()=>{
    packItems.splice(parseInt(btn.dataset.i),1); renderPackItems(); updatePackPrices();
  }));
}

function updatePackPrices() {
  const totalBuy=packItems.reduce((s,i)=>s+(i.priceBuy*i.qty),0);
  const sale=parseFloat($('pack-price-sale').value)||0;
  const margin=sale-totalBuy;
  const pct=sale>0?((margin/sale)*100).toFixed(1):0;
  const buyEl=$('pack-price-buy-display');
  const marEl=$('pack-margin-display');
  if(buyEl) buyEl.textContent=fmt(totalBuy)+' MAD';
  if(marEl){marEl.textContent=fmt(margin)+' MAD ('+pct+'%)';marEl.style.color=margin>=0?'var(--green)':'var(--red)';}
}

async function loadPacks() {
  if(!auth.currentUser)return;
  try {
    const snap=await db.collection('packs').where('uid','==',SHARED_UID).get();
    allPacks=snap.docs.map(d=>({id:d.id,...d.data()}));
    allPacks.sort((a,b)=>(a.name||'').localeCompare(b.name||''));
    renderPacks(); refreshPackDropdown();
  } catch(e){console.error('loadPacks:',e);}
}

function renderPacks() {
  const grid=$('packs-list'); if(!grid)return;
  if(!allPacks.length){grid.innerHTML='<div class="empty-state">Aucun pack créé</div>';return;}
  grid.innerHTML=allPacks.map(p=>{
    const adminInfo=isAdmin()?`<div class="product-margin"><span class="margin-badge">Achat : ${fmt(p.priceBuy)} MAD</span><span class="margin-badge green">Marge : ${fmt(p.margin)} MAD (${(p.marginPct||0).toFixed(0)}%)</span></div>`:'';
    const items=(p.items||[]).map(i=>`${i.name} ×${i.qty}`).join(', ');
    return `<div class="product-card" data-id="${p.id}">
      <div class="product-info">
        <div class="product-name">📦 ${esc(p.name||'—')}</div>
        <div class="product-cat" style="font-size:.75rem;margin-top:3px">${esc(items)}</div>
        ${adminInfo}
      </div>
      <div class="product-right"><div class="product-price">${fmt(p.priceSale)} MAD</div></div>
    </div>`;
  }).join('');
  grid.querySelectorAll('.product-card').forEach(el=>el.addEventListener('click',()=>{
    if(!isAdmin())return;
    const p=allPacks.find(x=>x.id===el.dataset.id); if(!p)return;
    editPackId=p.id; packItems=[...(p.items||[])];
    $('pack-name').value=p.name||'';
    $('pack-price-sale').value=p.priceSale||'';
    renderPackItems(); updatePackPrices();
    const btnDel=$('btn-delete-pack');if(btnDel)btnDel.style.display='';
    openModal('modal-pack');
  }));
}

function refreshPackDropdown() {
  const sel=$('order-pack-select');
  if(sel){
    const prev=sel.value;
    sel.innerHTML='<option value="">-- Choisir un pack --</option>'+
      allPacks.map(p=>`<option value="${p.id}">${esc(p.name)} — ${fmt(p.priceSale)} MAD</option>`).join('');
    sel.value=prev;
  }
}

// ══════════════════════════════════════════
//  COMMANDES
// ══════════════════════════════════════════
function setupOrders() {
  $('btn-add-order').addEventListener('click',()=>openOrderModal());

  // Toggle produit/pack
  document.querySelectorAll('input[name="order-type"]').forEach(radio=>{
    radio.addEventListener('change',()=>{
      const isProduct=radio.value==='product';
      const productRow=$('order-product-row'), packRow=$('order-pack-row');
      if(productRow) productRow.style.display=isProduct?'':'none';
      if(packRow) packRow.style.display=isProduct?'none':'';
      updateOrderAmount();
    });
  });

  // Auto-fill amount when product/pack selected
  $('order-product-select').addEventListener('change',updateOrderAmount);
  $('order-pack-select').addEventListener('change',updateOrderAmount);
  $('order-qty').addEventListener('input',updateOrderAmount);

  // Toggle boutique fields
  $('order-channel').addEventListener('change',()=>{
    const isBoutique=$('order-channel').value==='boutique';
    const clientRow=$('order-client-row');
    if(clientRow) clientRow.style.display=isBoutique?'none':'';
  });

  $('btn-save-order').addEventListener('click',saveOrder);

  const btnDel=$('btn-delete-order');
  if(btnDel) btnDel.addEventListener('click',async()=>{
    if(!editOrderId||!confirm('Supprimer cette commande ?'))return;
    try{await db.collection('orders').doc(editOrderId).delete();closeModal('modal-order');await loadOrders();}
    catch(e){alert('❌ '+e.message);}
  });

  document.querySelectorAll('.filter-btn').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
    btn.classList.add('active'); renderOrders(btn.dataset.filter);
  }));
}

function openOrderModal(order=null) {
  editOrderId = order ? order.id : null;
  $('modal-order-title').textContent = order ? 'Modifier la commande' : 'Nouvelle commande';
  clearFields('order-client','order-phone','order-notes','order-qty');
  $('order-date').value = order ? (order.date||today()) : today();
  $('order-channel').value = order ? (order.channel||'whatsapp') : 'whatsapp';
  $('order-status').value = order ? (order.status||'pending') : 'pending';
  $('order-amount').value = order ? (order.amount||'') : '';
  $('order-notes').value = order ? (order.notes||'') : '';
  $('order-qty').value = order ? (order.qty||1) : 1;

  // Set type
  const isProduct = !order || order.orderType !== 'pack';
  document.querySelectorAll('input[name="order-type"]').forEach(r=>{
    r.checked = (r.value==='product') === isProduct;
  });
  const productRow=$('order-product-row'), packRow=$('order-pack-row');
  if(productRow) productRow.style.display=isProduct?'':'none';
  if(packRow) packRow.style.display=isProduct?'none':'';

  if(order){
    $('order-client').value=order.client||'';
    $('order-phone').value=order.phone||'';
    if(isProduct) { $('order-product-select').value=order.productId||''; }
    else { $('order-pack-select').value=order.packId||''; }
  }

  // Show/hide client fields for boutique
  const clientRow=$('order-client-row');
  if(clientRow) clientRow.style.display=$('order-channel').value==='boutique'?'none':'';

  const btnDel=$('btn-delete-order');if(btnDel)btnDel.style.display=order?'':'none';
  refreshProductDropdowns(); refreshPackDropdown();
  openModal('modal-order');
}

function updateOrderAmount() {
  const isProduct=document.querySelector('input[name="order-type"]:checked')?.value==='product';
  const qty=parseFloat($('order-qty').value)||1;
  let unitPrice=0;
  if(isProduct){
    const pid=$('order-product-select').value;
    const prod=allProducts.find(p=>p.id===pid);
    if(prod) unitPrice=prod.priceSale||0;
  } else {
    const pkid=$('order-pack-select').value;
    const pack=allPacks.find(p=>p.id===pkid);
    if(pack) unitPrice=pack.priceSale||0;
  }
  if(unitPrice>0) $('order-amount').value=(unitPrice*qty).toFixed(2);
}

async function saveOrder() {
  const user=auth.currentUser; if(!user)return;
  const date=$('order-date').value;
  if(!date){alert('La date est obligatoire');return;}
  const isProduct=document.querySelector('input[name="order-type"]:checked')?.value==='product';
  const channel=$('order-channel').value;
  const isBoutique=channel==='boutique';
  const client=isBoutique?'Boutique':($('order-client').value||'').trim();
  const qty=parseFloat($('order-qty').value)||1;

  let productId='', packId='', productName='', packName='';
  if(isProduct){
    productId=$('order-product-select').value;
    if(!productId){alert('Choisissez un produit');return;}
    const prod=allProducts.find(p=>p.id===productId);
    productName=prod?prod.name:'';
  } else {
    packId=$('order-pack-select').value;
    if(!packId){alert('Choisissez un pack');return;}
    const pack=allPacks.find(p=>p.id===packId);
    packName=pack?pack.name:'';
  }

  const prevStatus = editOrderId ? (allOrders.find(o=>o.id===editOrderId)||{}).status : null;
  const newStatus=$('order-status').value;

  const data={
    uid:SHARED_UID, date, client,
    phone:$('order-phone').value.trim(),
    orderType:isProduct?'product':'pack',
    productId, productName, packId, packName,
    qty, amount:parseFloat($('order-amount').value)||0,
    channel, status:newStatus,
    notes:$('order-notes').value.trim(),
    createdBy:user.email
  };

  const btn=$('btn-save-order'); btn.textContent='Enregistrement…'; btn.disabled=true;
  try {
    const shouldDeduct = (newStatus==='confirmed'||newStatus==='done') && prevStatus!=='confirmed' && prevStatus!=='done';
    if(editOrderId){
      await db.collection('orders').doc(editOrderId).update({...data,updatedAt:firebase.firestore.FieldValue.serverTimestamp()});
    } else {
      data.createdAt=firebase.firestore.FieldValue.serverTimestamp();
      await db.collection('orders').add(data);
    }
    if(shouldDeduct){
      if(isProduct && productId) await deductProductStock(productId, qty);
      else if(!isProduct && packId) await deductPackStock(packId, qty);
    }
    closeModal('modal-order'); await loadOrders(); await loadProducts();
  } catch(e){alert('❌ '+e.message);}
  finally{btn.textContent='Enregistrer';btn.disabled=false;}
}

async function deductProductStock(productId, qty) {
  const prod=allProducts.find(p=>p.id===productId);
  if(!prod)return;
  const newQty=Math.max(0,prod.qty-qty);
  await db.collection('products').doc(productId).update({qty:newQty});
  console.log('Stock déduit:',prod.name,'→',newQty);
}

async function deductPackStock(packId, qty) {
  const pack=allPacks.find(p=>p.id===packId);
  if(!pack||!pack.items)return;
  for(const item of pack.items){
    const prod=allProducts.find(p=>p.id===item.productId);
    if(prod){
      const newQty=Math.max(0,prod.qty-(item.qty*qty));
      await db.collection('products').doc(item.productId).update({qty:newQty});
      console.log('Pack stock déduit:',prod.name,'→',newQty);
    }
  }
}

async function loadOrders() {
  if(!auth.currentUser)return;
  try {
    const snap=await db.collection('orders').where('uid','==',SHARED_UID).get();
    allOrders=snap.docs.map(d=>({id:d.id,...d.data()}));
    allOrders.sort((a,b)=>((b.date||'')+(b.createdAt?.seconds||0)).localeCompare((a.date||'')+(a.createdAt?.seconds||0)));
    renderOrders('all'); renderRecentOrders(); updateKPIs();
  } catch(e){console.error('loadOrders:',e);}
}

function renderOrders(filter='all') {
  const list=$('orders-list'); if(!list)return;
  const orders=filter==='all'?allOrders:allOrders.filter(o=>o.status===filter);
  if(!orders.length){list.innerHTML='<div class="empty-state">Aucune commande</div>';return;}
  list.innerHTML=orders.map(o=>orderHTML(o)).join('');
  list.querySelectorAll('.order-item').forEach(el=>el.addEventListener('click',()=>{
    const o=allOrders.find(x=>x.id===el.dataset.id); if(!o)return;
    openOrderModal(o);
  }));
}

function renderRecentOrders() {
  const el=$('recent-orders'); if(!el)return;
  const r=allOrders.slice(0,3);
  el.innerHTML=r.length?r.map(o=>orderHTML(o)).join(''):'<div class="empty-state">Aucune commande</div>';
}

function orderHTML(o) {
  const labels={pending:'En attente',confirmed:'Confirmée',done:'Livrée',cancelled:'Annulée'};
  const name=o.orderType==='pack'?(o.packName||'Pack'):( o.productName||o.products||'—');
  const client=o.client||'—';
  return `<div class="order-item" data-id="${o.id}">
    <div class="order-info">
      <div class="order-client">${esc(client)}</div>
      <div class="order-meta">${esc(name)} ×${o.qty||1} · ${o.date||'—'}</div>
    </div>
    <div class="order-right">
      <div class="order-amount">${fmt(o.amount)} MAD</div>
      <div class="order-status status-${o.status||'pending'}">${labels[o.status]||'En attente'}</div>
    </div>
  </div>`;
}

// ══════════════════════════════════════════
//  ACHATS FOURNISSEURS
// ══════════════════════════════════════════
function setupPurchases() {
  $('btn-add-purchase').addEventListener('click',()=>{
    clearFields('purchase-supplier','purchase-date','purchase-qty','purchase-price','purchase-notes','purchase-name-custom-input');
    $('purchase-date').value=today();
    $('purchase-type').value='existing';
    $('purchase-existing-row').style.display='';
    $('purchase-new-row').style.display='none';
    refreshProductDropdowns();
    openModal('modal-purchase');
  });

  $('purchase-type').addEventListener('change',()=>{
    const isExisting=$('purchase-type').value==='existing';
    $('purchase-existing-row').style.display=isExisting?'':'none';
    $('purchase-new-row').style.display=isExisting?'none':'';
    if(!isExisting) populateNameSelect('purchase-name-select');
  });

  $('btn-save-purchase').addEventListener('click',savePurchase);
}

async function savePurchase() {
  const user=auth.currentUser; if(!user)return;
  const date=$('purchase-date').value;
  const supplier=($('purchase-supplier').value||'').trim();
  const qty=parseFloat($('purchase-qty').value)||0;
  const price=parseFloat($('purchase-price').value)||0;
  const notes=($('purchase-notes').value||'').trim();
  if(!date){alert('La date est obligatoire');return;}
  if(!qty){alert('Entrez la quantité');return;}

  const isExisting=$('purchase-type').value==='existing';
  const btn=$('btn-save-purchase'); btn.textContent='Enregistrement…'; btn.disabled=true;

  try {
    if(isExisting){
      const productId=$('purchase-existing-product').value;
      if(!productId){alert('Choisissez un produit');btn.textContent='Enregistrer';btn.disabled=false;return;}
      const prod=allProducts.find(p=>p.id===productId);
      if(!prod){btn.textContent='Enregistrer';btn.disabled=false;return;}
      // Update stock and price
      const updateData={qty:prod.qty+qty};
      if(price>0) updateData.priceBuy=price;
      await db.collection('products').doc(productId).update(updateData);
      // Save purchase record
      await db.collection('purchases').add({
        uid:SHARED_UID, date, supplier, productId,
        productName:prod.name, qty, price, notes,
        createdAt:firebase.firestore.FieldValue.serverTimestamp(),
        createdBy:user.email
      });
      console.log('Stock alimenté:',prod.name,'→',prod.qty+qty);
    } else {
      // New product
      const newName=getProductName('purchase-name-select','purchase-name-custom-input');
      if(!newName){alert('Entrez le nom du produit');btn.textContent='Enregistrer';btn.disabled=false;return;}
      // Create product
      const newProd={
        uid:SHARED_UID, name:newName,
        category:'Autres', qty, unit:'Pièce',
        priceBuy:price, priceSale:0, margin:0, marginPct:0,
        alertThreshold:5, createdBy:user.email,
        createdAt:firebase.firestore.FieldValue.serverTimestamp()
      };
      const ref=await db.collection('products').add(newProd);
      // Save purchase record
      await db.collection('purchases').add({
        uid:SHARED_UID, date, supplier, productId:ref.id,
        productName:newName, qty, price, notes,
        createdAt:firebase.firestore.FieldValue.serverTimestamp(),
        createdBy:user.email
      });
      console.log('Nouveau produit créé et stock ajouté:',newName);
    }
    closeModal('modal-purchase');
    await loadProducts();
    await loadPurchases();
  } catch(e){alert('❌ '+e.message);}
  finally{btn.textContent='Enregistrer';btn.disabled=false;}
}

async function loadPurchases() {
  if(!auth.currentUser)return;
  try {
    const snap=await db.collection('purchases').where('uid','==',SHARED_UID).get();
    allPurchases=snap.docs.map(d=>({id:d.id,...d.data()}));
    allPurchases.sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    renderPurchases();
  } catch(e){console.error('loadPurchases:',e);}
}

function renderPurchases() {
  const el=$('purchases-list'); if(!el)return;
  if(!allPurchases.length){el.innerHTML='<div class="empty-state">Aucun achat enregistré</div>';return;}
  el.innerHTML=allPurchases.slice(0,20).map(p=>`
    <div class="order-item">
      <div class="order-info">
        <div class="order-client">${esc(p.productName||'—')}</div>
        <div class="order-meta">${esc(p.supplier||'—')} · ${p.date||'—'}</div>
      </div>
      <div class="order-right">
        <div class="order-amount">${p.qty} unités</div>
        <div class="order-meta">${fmt(p.price)} MAD/u</div>
      </div>
    </div>`).join('');
}

// ══════════════════════════════════════════
//  META ADS
// ══════════════════════════════════════════
function setupAds() {
  $('btn-add-ads').addEventListener('click',()=>{
    $('ads-date').value=today();
    clearFields('ads-campaign','ads-spend','ads-reach','ads-clicks','ads-conv');
    openModal('modal-ads');
  });
  $('btn-save-ads').addEventListener('click',async()=>{
    const user=auth.currentUser; if(!user)return;
    const data={
      uid:SHARED_UID, date:$('ads-date').value, campaign:$('ads-campaign').value.trim(),
      spend:parseFloat($('ads-spend').value)||0, reach:parseInt($('ads-reach').value)||0,
      clicks:parseInt($('ads-clicks').value)||0, conversions:parseInt($('ads-conv').value)||0,
      createdAt:firebase.firestore.FieldValue.serverTimestamp()
    };
    try{await db.collection('ads').add(data);closeModal('modal-ads');await loadAds();}
    catch(e){alert('❌ '+e.message);}
  });
}

async function loadAds() {
  if(!auth.currentUser)return;
  try {
    const snap=await db.collection('ads').where('uid','==',SHARED_UID).get();
    allAds=snap.docs.map(d=>({id:d.id,...d.data()}));
    allAds.sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    renderAdsEntries(); updateKPIs();
  } catch(e){console.error('loadAds:',e);}
}

function renderAdsEntries() {
  const el=$('ads-entries-list'); if(!el)return;
  el.innerHTML=allAds.length?allAds.slice(0,10).map(a=>`
    <div class="order-item">
      <div class="order-info"><div class="order-client">${esc(a.campaign||'—')}</div><div class="order-meta">${a.date||'—'} · ${(a.reach||0).toLocaleString()} portée</div></div>
      <div class="order-right"><div class="order-amount">${fmt(a.spend)} MAD</div><div class="order-meta">${a.clicks||0} clics</div></div>
    </div>`).join(''):'<div class="empty-state">Aucune donnée</div>';
}

// ══════════════════════════════════════════
//  KPIs
// ══════════════════════════════════════════
function updateKPIs() {
  const now=new Date(), som=new Date(now.getFullYear(),now.getMonth(),1);
  
  // CA ce mois (toutes commandes non annulées du mois en cours)
  const ordersMonth=allOrders.filter(o=>o.date&&new Date(o.date)>=som);
  const caMonth=ordersMonth.filter(o=>o.status!=='cancelled').reduce((s,o)=>s+(o.amount||0),0);
  
  // Si aucune commande ce mois, afficher le total général
  const caTotal=allOrders.filter(o=>o.status!=='cancelled').reduce((s,o)=>s+(o.amount||0),0);
  const ca = caMonth > 0 ? caMonth : caTotal;
  const caLabel = caMonth > 0 ? 'ce mois' : 'total';
  
  const e1=$('kpi-ca');if(e1)e1.textContent=fmt(ca)+' MAD';
  const kpiLabel=$('kpi-ca-label');if(kpiLabel)kpiLabel.textContent='CA '+caLabel;
  
  // Commandes ce mois ou total
  const ordersCount = ordersMonth.length > 0 ? ordersMonth.length : allOrders.length;
  const e2=$('kpi-orders');if(e2)e2.textContent=ordersCount;
  const ordLabel=$('kpi-orders-label');if(ordLabel)ordLabel.textContent=ordersMonth.length>0?'Commandes mois':'Commandes total';
  
  const e3=$('kpi-stock');if(e3)e3.textContent=allProducts.length;
  
  const adsMonth=allAds.filter(a=>a.date&&new Date(a.date)>=som).reduce((s,a)=>s+(a.spend||0),0);
  const adsTotal=allAds.reduce((s,a)=>s+(a.spend||0),0);
  const ads = adsMonth > 0 ? adsMonth : adsTotal;
  const e4=$('kpi-ads');if(e4)e4.textContent=fmt(ads)+' MAD';
  const adsLabel=$('kpi-ads-label');if(adsLabel)adsLabel.textContent=adsMonth>0?'Dépense Ads mois':'Dépense Ads total';
}

// ══════════════════════════════════════════
//  PROFIL
// ══════════════════════════════════════════
function setupProfile() {
  $('btn-logout').addEventListener('click',async()=>{if(confirm('Se déconnecter ?')){await auth.signOut();location.reload();}});
  $('btn-reset-password').addEventListener('click',async()=>{
    if(!currentUser)return;
    if(!confirm('Envoyer un email de réinitialisation à '+currentUser.email+' ?'))return;
    try{await auth.sendPasswordResetEmail(currentUser.email);showMsg($('profile-msg'),'✅ Email envoyé','success');}
    catch(e){showMsg($('profile-msg'),'❌ '+e.message,'error');}
  });
  $('btn-save-profile').addEventListener('click',async()=>{
    if(!isAdmin())return;
    try{
      await db.collection('users').doc(currentUser.uid).set({
        displayName:$('profile-name').value,phone:$('profile-phone').value,
        store:$('profile-store').value,city:$('profile-city').value,
        updatedAt:firebase.firestore.FieldValue.serverTimestamp()
      },{merge:true});
      showMsg($('profile-msg'),'✅ Profil enregistré','success'); loadProfile();
    }catch(e){showMsg($('profile-msg'),'❌ '+e.message,'error');}
  });
}

async function loadProfile() {
  if(!currentUser)return;
  try{
    const doc=await db.collection('users').doc(currentUser.uid).get();
    const data=doc.exists?doc.data():{};
    const name=data.displayName||currentUser.displayName||currentUser.email||'';
    $('profile-name').value=name;$('profile-email').value=currentUser.email;
    $('profile-phone').value=data.phone||'';$('profile-store').value=data.store||'Safa Nature';
    $('profile-city').value=data.city||'Casablanca';
    const ini=name.charAt(0).toUpperCase()||'A';
    $('profile-avatar-display').textContent=ini;$('topbar-avatar').textContent=ini;
    $('profile-display-name').textContent=name;$('profile-display-email').textContent=currentUser.email;
    $('welcome-name').textContent=name.split(' ')[0]||'vous';
  }catch(e){console.error('loadProfile:',e);}
}

// ══════════════════════════════════════════
//  RAPPORTS
// ══════════════════════════════════════════
function setupReports() {
  document.querySelectorAll('.rtab').forEach(btn=>btn.addEventListener('click',()=>{
    document.querySelectorAll('.rtab').forEach(b=>b.classList.remove('active'));
    document.querySelectorAll('.rtab-content').forEach(c=>c.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('rtab-'+btn.dataset.tab).classList.add('active');
    setTimeout(initCharts,50);
  }));
  const periodSel=$('report-period');
  if(periodSel) periodSel.addEventListener('change',initCharts);
}

function initCharts() {
  const days=parseInt(($('report-period')||{value:'30'}).value)||30;
  const now=new Date();
  const startDate=new Date(); startDate.setDate(startDate.getDate()-days);

  const filteredOrders=allOrders.filter(o=>o.date&&new Date(o.date)>=startDate);
  const filteredPurchases=allPurchases.filter(p=>p.date&&new Date(p.date)>=startDate);
  const filteredAds=allAds.filter(a=>a.date&&new Date(a.date)>=startDate);

  initChartCA(filteredOrders, days);
  initChartOrderStatus(filteredOrders);
  initChartChannel(filteredOrders);
  initChartAds(filteredAds);
  if(isAdmin()){
    initChartBenefit(filteredOrders);
    initChartSupplier(filteredPurchases);
  }
  updateReportStats(filteredOrders, filteredPurchases, filteredAds);
}

function initChartCA(orders, days) {
  const ctx=$('chart-ca'); if(!ctx)return;
  if(chartCA)chartCA.destroy();
  const labels=[],vals=[];
  for(let i=days-1;i>=0;i--){
    const d=new Date();d.setDate(d.getDate()-i);
    const ds=d.toISOString().split('T')[0];
    labels.push(d.toLocaleDateString('fr-MA',{day:'2-digit',month:'2-digit'}));
    vals.push(orders.filter(o=>o.date===ds&&o.status!=='cancelled').reduce((s,o)=>s+(o.amount||0),0));
  }
  chartCA=new Chart(ctx,{type:'line',data:{labels,datasets:[{label:'CA',data:vals,borderColor:'#2d5a27',backgroundColor:'rgba(45,90,39,.1)',borderWidth:2,fill:true,tension:.4,pointRadius:2}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{ticks:{maxTicksLimit:7,font:{size:10}},grid:{display:false}},y:{ticks:{font:{size:10}},beginAtZero:true}}}});
}

function initChartOrderStatus(orders) {
  const ctx=$('chart-orders'); if(!ctx)return;
  if(chartOrders)chartOrders.destroy();
  const c={pending:0,confirmed:0,done:0,cancelled:0};
  orders.forEach(o=>{if(c[o.status]!==undefined)c[o.status]++;});
  chartOrders=new Chart(ctx,{type:'doughnut',data:{labels:['En attente','Confirmées','Livrées','Annulées'],datasets:[{data:Object.values(c),backgroundColor:['#f5c842','#2e6da4','#2d5a27','#c0392b'],borderWidth:0}]},options:{responsive:true,plugins:{legend:{position:'bottom',labels:{font:{size:11},padding:10}}}}});
}

function initChartChannel(orders) {
  const ctx=$('chart-channel'); if(!ctx)return;
  if(chartChannel)chartChannel.destroy();
  const c={whatsapp:0,site:0,boutique:0};
  orders.filter(o=>o.status!=='cancelled').forEach(o=>{if(c[o.channel]!==undefined)c[o.channel]+=(o.amount||0);});
  chartChannel=new Chart(ctx,{type:'bar',data:{labels:['WhatsApp','Site','Boutique'],datasets:[{data:Object.values(c),backgroundColor:['#25D366','#2e6da4','#c8971f'],borderRadius:6}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{font:{size:11}}},y:{beginAtZero:true,ticks:{font:{size:10}}}}}});
}

function initChartAds(ads) {
  const ctx=$('chart-ads'); if(!ctx)return;
  if(chartAds)chartAds.destroy();
  const sorted=[...ads].sort((a,b)=>a.date>b.date?1:-1).slice(-14);
  chartAds=new Chart(ctx,{type:'bar',data:{labels:sorted.map(a=>a.date?.slice(5)||''),datasets:[{label:'Dépense',data:sorted.map(a=>a.spend||0),backgroundColor:'#c8971f',borderRadius:6}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{font:{size:10}}},y:{beginAtZero:true,ticks:{font:{size:10}}}}}});
}

function initChartBenefit(orders) {
  const ctx=$('chart-benefit'); if(!ctx)return;
  if(chartBenefit)chartBenefit.destroy();
  // CA vs Coût par semaine
  const weeks={};
  orders.filter(o=>o.status!=='cancelled'&&o.date).forEach(o=>{
    const d=new Date(o.date), week=`S${Math.ceil(d.getDate()/7)} ${d.toLocaleDateString('fr-MA',{month:'short'})}`;
    if(!weeks[week])weeks[week]={ca:0,cost:0};
    weeks[week].ca+=(o.amount||0);
    // Estimate cost from product/pack
    if(o.orderType==='product'&&o.productId){
      const prod=allProducts.find(p=>p.id===o.productId);
      if(prod) weeks[week].cost+=((prod.priceBuy||0)*(o.qty||1));
    } else if(o.orderType==='pack'&&o.packId){
      const pack=allPacks.find(p=>p.id===o.packId);
      if(pack) weeks[week].cost+=((pack.priceBuy||0)*(o.qty||1));
    }
  });
  const labels=Object.keys(weeks).slice(-8);
  chartBenefit=new Chart(ctx,{type:'bar',data:{labels,datasets:[{label:'CA',data:labels.map(w=>weeks[w].ca),backgroundColor:'rgba(45,90,39,.7)',borderRadius:4},{label:'Bénéfice',data:labels.map(w=>weeks[w].ca-weeks[w].cost),backgroundColor:'rgba(200,151,31,.7)',borderRadius:4}]},options:{responsive:true,plugins:{legend:{position:'bottom',labels:{font:{size:11}}}},scales:{x:{grid:{display:false},ticks:{font:{size:10}}},y:{beginAtZero:true,ticks:{font:{size:10}}}}}});
}

function initChartSupplier(purchases) {
  const ctx=$('chart-supplier'); if(!ctx)return;
  if(chartSupplier)chartSupplier.destroy();
  const suppliers={};
  purchases.forEach(p=>{const s=p.supplier||'Inconnu';suppliers[s]=(suppliers[s]||0)+(p.price*p.qty||0);});
  const sorted=Object.entries(suppliers).sort((a,b)=>b[1]-a[1]).slice(0,6);
  chartSupplier=new Chart(ctx,{type:'doughnut',data:{labels:sorted.map(x=>x[0]),datasets:[{data:sorted.map(x=>x[1]),backgroundColor:['#2d5a27','#c8971f','#2e6da4','#c0392b','#6b7c3f','#8e44ad'],borderWidth:0}]},options:{responsive:true,plugins:{legend:{position:'bottom',labels:{font:{size:11},padding:10}}}}});
}

function updateReportStats(orders, purchases, ads) {
  const active=orders.filter(o=>o.status!=='cancelled');
  const totalCA=active.reduce((s,o)=>s+(o.amount||0),0);
  const done=orders.filter(o=>o.status==='done');
  const avg=done.length?done.reduce((s,o)=>s+(o.amount||0),0)/done.length:0;

  const e1=$('stat-total-ca');if(e1)e1.textContent=fmt(totalCA)+' MAD';
  const e2=$('stat-avg-order');if(e2)e2.textContent=fmt(avg)+' MAD';

  // Top produit/pack
  const sales={};
  active.forEach(o=>{const k=o.productName||o.packName||'—';sales[k]=(sales[k]||0)+(o.qty||1);});
  const top=Object.entries(sales).sort((a,b)=>b[1]-a[1])[0];
  const e3=$('stat-top-product');if(e3)e3.textContent=top?top[0]:'—';

  // Ads stats
  const ts=ads.reduce((s,a)=>s+(a.spend||0),0);
  const tr=ads.reduce((s,a)=>s+(a.reach||0),0);
  const e4=$('stat-ads-spend');if(e4)e4.textContent=fmt(ts)+' MAD';
  const e5=$('stat-ads-reach');if(e5)e5.textContent=tr>1000?(tr/1000).toFixed(1)+'K':tr;
  const e6=$('stat-ads-roas');if(e6)e6.textContent=ts>0?(ads.reduce((s,a)=>s+(a.conversions||0),0)*avg/ts).toFixed(2):'—';

  // Admin stats
  if(isAdmin()){
    // Bénéfice net
    let totalCost=0;
    active.forEach(o=>{
      if(o.orderType==='product'&&o.productId){const p=allProducts.find(x=>x.id===o.productId);if(p)totalCost+=(p.priceBuy||0)*(o.qty||1);}
      else if(o.orderType==='pack'&&o.packId){const p=allPacks.find(x=>x.id===o.packId);if(p)totalCost+=(p.priceBuy||0)*(o.qty||1);}
    });
    const benefit=totalCA-totalCost;
    const e7=$('stat-benefit');if(e7)e7.textContent=fmt(benefit)+' MAD';
    // Total achats
    const totalPurchases=purchases.reduce((s,p)=>s+(p.price*p.qty||0),0);
    const e8=$('stat-purchases');if(e8)e8.textContent=fmt(totalPurchases)+' MAD';
    // Stock value
    const stockVal=allProducts.reduce((s,p)=>s+(p.priceBuy||0)*(p.qty||0),0);
    const e9=$('stat-stock-value');if(e9)e9.textContent=fmt(stockVal)+' MAD';
  }
}

// ══════════════════════════════════════════
//  GESTION NOMS
// ══════════════════════════════════════════
function setupNamesManager() {
  const btn=$('btn-manage-names');
  if(btn)btn.addEventListener('click',()=>{renderNamesList();openModal('modal-names');});
  const btnAdd=$('btn-add-name');
  if(btnAdd)btnAdd.addEventListener('click',()=>{
    const inp=$('new-product-name-input');
    const name=(inp.value||'').trim();
    if(!name){alert('Entrez un nom');return;}
    const names=getNames();
    if(names.includes(name)){alert('Ce nom existe déjà');return;}
    names.push(name);names.sort();saveNames(names);
    inp.value='';renderNamesList();populateNameSelect();
  });
  const inp=$('new-product-name-input');
  if(inp)inp.addEventListener('keypress',e=>{if(e.key==='Enter')$('btn-add-name').click();});
}

function renderNamesList() {
  const el=$('names-list'); if(!el)return;
  const names=getNames();
  if(!names.length){el.innerHTML='<div class="empty-state">Aucun nom</div>';return;}
  el.innerHTML=names.map((n,i)=>`<div class="name-item"><span>${n}</span><button class="btn-delete-name" data-i="${i}">🗑️</button></div>`).join('');
  el.querySelectorAll('.btn-delete-name').forEach(btn=>btn.addEventListener('click',()=>{
    const names=getNames(),n=names[parseInt(btn.dataset.i)];
    if(!confirm('Supprimer "'+n+'" ?'))return;
    names.splice(parseInt(btn.dataset.i),1);saveNames(names);
    renderNamesList();populateNameSelect();
  }));
}

// ── STOCK REPORT ─────────────────────────
function renderStockReport() {
  const low=allProducts.filter(p=>p.qty<=(p.alertThreshold||5));
  const el=$('report-stock-low');
  if(el){
    el.innerHTML=low.length?low.map(p=>`
      <div class="order-item">
        <div class="order-info"><div class="order-client">${esc(p.name||'—')}</div><div class="order-meta">${esc(p.category||'')} · ${esc(p.unit||'')}</div></div>
        <div class="order-right"><div class="order-amount" style="color:var(--red)">${p.qty} restants</div><div class="order-meta">Seuil : ${p.alertThreshold||5}</div></div>
      </div>`).join(''):'<div class="empty-state">Tous les stocks sont OK ✅</div>';
  }
  const e=$('stat-stock-low');if(e)e.textContent=low.length;
  const sv=$('stat-stock-value');
  if(sv&&isAdmin()){sv.textContent=fmt(allProducts.reduce((s,p)=>s+(p.priceBuy||0)*(p.qty||0),0))+' MAD';}
}

// Override initCharts to also render stock report
const _origInitCharts = initCharts;
// Patch: call renderStockReport when stock tab is active
document.addEventListener('DOMContentLoaded', ()=>{
  document.querySelectorAll('.rtab').forEach(btn=>{
    btn.addEventListener('click',()=>{
      if(btn.dataset.tab==='stock') setTimeout(renderStockReport,50);
    });
  });
});
