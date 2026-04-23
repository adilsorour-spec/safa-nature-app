/* ══════════════════════════════════════
   SAFA NATURE PWA — app.js v3 CLEAN
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

// ── CONFIG ───────────────────────────────
const ADMIN_EMAILS = ['a.sorour@a2i.co.ma', 'safaa@safanature.ma'];
const UNITS = ['1kg','500g','250g','100g','50g','250ml','100ml','60ml','40ml','30ml','Pièce'];
const CATS  = ['Miel','Amlou','Huiles','Vinaigre','Autres'];

// ── STATE ───────────────────────────────
let currentUser   = null;
let userRole      = 'restricted';
let currentPage   = 'dashboard';
let allOrders     = [];
let allProducts   = [];
let allAds        = [];
let editOrderId   = null;
let editProductId = null;
let chartCA, chartOrders, chartAds;

// ══════════════════════════════════════════
//  INIT
// ══════════════════════════════════════════
window.addEventListener('DOMContentLoaded', () => {
  // Populate selects
  const unitSel = document.getElementById('product-unit');
  const catSel  = document.getElementById('product-category');
  if (unitSel) unitSel.innerHTML = UNITS.map(u => `<option value="${u}">${u}</option>`).join('');
  if (catSel)  catSel.innerHTML  = CATS.map(c  => `<option value="${c}">${c}</option>`).join('');

  // Auth state
  setTimeout(() => {
    auth.onAuthStateChanged(user => {
      const splash = document.getElementById('splash');
      if (splash) { splash.classList.add('fade-out'); setTimeout(() => splash.style.display='none', 400); }

      if (user) {
        currentUser = user;
        userRole    = ADMIN_EMAILS.includes(user.email) ? 'admin' : 'restricted';
        console.log('User:', user.email, '| Role:', userRole, '| UID:', user.uid);
        showApp();
      } else {
        document.getElementById('auth-screen').classList.remove('hidden');
        document.getElementById('app').classList.add('hidden');
      }
    });
  }, 1500);

  setWelcomeDate();
  setupNav();
  setupModals();
  setupAuth();
  setupProfile();
  setupReports();
  
  // Setup interactive buttons with retry to ensure DOM is ready
  function setupAll() {
    const btnProd = document.getElementById('btn-add-product');
    const btnOrder = document.getElementById('btn-add-order');
    if (!btnProd || !btnOrder) {
      setTimeout(setupAll, 100);
      return;
    }
    setupProducts();
    setupOrders();
    setupAds();
    console.log('Setup complet ✅');
  }
  setupAll();
});

// ══════════════════════════════════════════
//  AUTH
// ══════════════════════════════════════════
function setupAuth() {
  // Email login
  document.getElementById('btn-login').addEventListener('click', async () => {
    const email = document.getElementById('login-email').value.trim();
    const pass  = document.getElementById('login-password').value;
    const errEl = document.getElementById('auth-error');
    errEl.classList.add('hidden');
    if (!email || !pass) { errEl.textContent='Remplissez tous les champs'; errEl.classList.remove('hidden'); return; }
    document.getElementById('btn-login').textContent = 'Connexion…';
    try {
      await auth.signInWithEmailAndPassword(email, pass);
    } catch(e) {
      document.getElementById('btn-login').textContent = 'Se connecter';
      const msgs = {'auth/user-not-found':'Utilisateur introuvable.','auth/wrong-password':'Mot de passe incorrect.','auth/invalid-credential':'Email ou mot de passe incorrect.'};
      errEl.textContent = msgs[e.code] || e.message;
      errEl.classList.remove('hidden');
    }
  });

  // Google login
  const btnG = document.getElementById('btn-google');
  if (btnG) {
    btnG.addEventListener('click', async () => {
      try {
        btnG.textContent = 'Connexion…'; btnG.disabled = true;
        await auth.signInWithPopup(new firebase.auth.GoogleAuthProvider());
      } catch(e) {
        btnG.textContent = 'Continuer avec Google'; btnG.disabled = false;
      }
    });
  }

  // Logout
  document.getElementById('btn-logout').addEventListener('click', async () => {
    if (confirm('Se déconnecter ?')) { await auth.signOut(); location.reload(); }
  });

  // Forgot password
  const btnForgot = document.getElementById('btn-forgot');
  if (btnForgot) {
    btnForgot.addEventListener('click', async () => {
      const email = document.getElementById('login-email').value.trim();
      const errEl = document.getElementById('auth-error');
      if (!email) { errEl.textContent='Entrez votre email d\'abord'; errEl.classList.remove('hidden'); return; }
      try {
        await auth.sendPasswordResetEmail(email);
        errEl.style.cssText='background:var(--green-pale);color:var(--green)';
        errEl.textContent='✅ Email envoyé à '+email;
        errEl.classList.remove('hidden');
      } catch(e) { errEl.textContent=e.message; errEl.classList.remove('hidden'); }
    });
  }

  // Reset password from profile
  const btnReset = document.getElementById('btn-reset-password');
  if (btnReset) {
    btnReset.addEventListener('click', async () => {
      if (!currentUser) return;
      if (!confirm('Envoyer un email de réinitialisation à '+currentUser.email+' ?')) return;
      try {
        await auth.sendPasswordResetEmail(currentUser.email);
        showMsg(document.getElementById('profile-msg'), '✅ Email envoyé à '+currentUser.email, 'success');
      } catch(e) { showMsg(document.getElementById('profile-msg'), '❌ '+e.message, 'error'); }
    });
  }
}

// ══════════════════════════════════════════
//  SHOW APP
// ══════════════════════════════════════════
function showApp() {
  document.getElementById('auth-screen').classList.add('hidden');
  document.getElementById('app').classList.remove('hidden');
  applyRoleUI();
  loadProfile();
  loadDashboard();
  loadProducts();
  loadOrders();
  loadAds();
}

function applyRoleUI() {
  const admin = userRole === 'admin';
  document.querySelectorAll('.admin-only').forEach(el => el.style.display = admin ? '' : 'none');
  const b1 = document.getElementById('btn-add-product');
  if(b1) {
    b1.style.display = admin ? '' : 'none';
    // Re-attach onclick directly as backup
    b1.onclick = admin ? openAddProductModal : null;
  }
  const b2 = document.getElementById('btn-add-order');   if(b2) b2.style.display = admin ? '' : 'none';
  const b3 = document.getElementById('btn-save-profile');if(b3) b3.style.display = admin ? '' : 'none';
  const rb = document.getElementById('role-badge');
  if (rb) { rb.textContent = admin ? '👑 Administrateur' : '👁️ Consultation'; rb.className = 'role-badge '+(admin?'admin':'restricted'); }
}

function openAddProductModal() {
  if (userRole !== 'admin') { alert('Accès admin requis'); return; }
  editProductId = null;
  const unitSel = document.getElementById('product-unit');
  const catSel  = document.getElementById('product-category');
  if (unitSel) unitSel.innerHTML = UNITS.map(u => '<option value="'+u+'">'+u+'</option>').join('');
  if (catSel)  catSel.innerHTML  = CATS.map(c  => '<option value="'+c+'">'+c+'</option>').join('');
  ['product-name','product-qty','product-price-sale','product-price-buy','product-alert'].forEach(id => {
    const el = document.getElementById(id); if(el) el.value = '';
  });
  const mp = document.getElementById('margin-preview');
  if (mp) { mp.textContent=''; mp.className='margin-preview'; }
  // Hide delete button for new product
  const delBtn = document.getElementById('btn-delete-product');
  if (delBtn) delBtn.style.display = 'none';
  openModal('modal-product');
}

// ══════════════════════════════════════════
//  NAV
// ══════════════════════════════════════════
function setupNav() {
  document.querySelectorAll('.nav-btn').forEach(btn => {
    btn.addEventListener('click', () => navigateTo(btn.dataset.page));
  });
  const av = document.getElementById('topbar-avatar');
  if (av) av.addEventListener('click', () => navigateTo('profil'));
}

function navigateTo(page) {
  currentPage = page;
  document.querySelectorAll('.nav-btn').forEach(b => b.classList.toggle('active', b.dataset.page===page));
  document.querySelectorAll('.page').forEach(p => p.classList.toggle('active', p.id==='page-'+page));
  const titles = {dashboard:'Tableau de bord',commandes:'Commandes',stocks:'Stocks',rapports:'Rapports',profil:'Profil'};
  document.getElementById('page-title').textContent = titles[page]||'';
  if (page==='rapports') setTimeout(initCharts, 100);
}

function setWelcomeDate() {
  const el = document.getElementById('welcome-date');
  if (el) el.innerHTML = new Date().toLocaleDateString('fr-MA',{weekday:'long',day:'numeric',month:'long'}).replace(',','<br>');
}

// ══════════════════════════════════════════
//  MODALS
// ══════════════════════════════════════════
function setupModals() {
  // Force hide all modals at start
  document.querySelectorAll('.modal').forEach(m => {
    m.style.display = 'none';
    m.style.zIndex  = '9999';
  });

  document.querySelectorAll('.modal-close').forEach(btn => {
    btn.addEventListener('click', () => closeModal(btn.dataset.modal));
  });
  document.querySelectorAll('.modal').forEach(modal => {
    modal.addEventListener('click', e => { if(e.target===modal) closeModal(modal.id); });
  });
}

function openModal(id) {
  // Close all first
  document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
  const el = document.getElementById(id);
  if (!el) { console.error('Modal not found:', id); return; }
  el.style.cssText = 'display:flex !important; position:fixed; top:0; left:0; right:0; bottom:0; z-index:9999; background:rgba(0,0,0,0.6); align-items:flex-end; justify-content:center;';
  console.log('Modal opened:', id);
}

function closeModal(id) {
  const el = document.getElementById(id);
  if (!el) return;
  el.style.cssText = 'display:none !important;';
  console.log('Modal closed:', id);
}

// ══════════════════════════════════════════
//  PROFIL
// ══════════════════════════════════════════
function setupProfile() {
  document.getElementById('btn-save-profile').addEventListener('click', async () => {
    if (userRole !== 'admin') return;
    const msg = document.getElementById('profile-msg');
    try {
      await db.collection('users').doc(currentUser.uid).set({
        displayName: document.getElementById('profile-name').value,
        phone: document.getElementById('profile-phone').value,
        store: document.getElementById('profile-store').value,
        city:  document.getElementById('profile-city').value,
        updatedAt: firebase.firestore.FieldValue.serverTimestamp()
      }, {merge:true});
      showMsg(msg, '✅ Profil enregistré', 'success');
      loadProfile();
    } catch(e) { showMsg(msg, '❌ '+e.message, 'error'); }
  });
}

async function loadProfile() {
  if (!currentUser) return;
  try {
    const doc  = await db.collection('users').doc(currentUser.uid).get();
    const data = doc.exists ? doc.data() : {};
    const name = data.displayName || currentUser.email || '';
    document.getElementById('profile-name').value  = name;
    document.getElementById('profile-email').value = currentUser.email;
    document.getElementById('profile-phone').value = data.phone||'';
    document.getElementById('profile-store').value = data.store||'Safa Nature';
    document.getElementById('profile-city').value  = data.city||'Casablanca';
    const ini = name.charAt(0).toUpperCase();
    document.getElementById('profile-avatar-display').textContent = ini;
    document.getElementById('topbar-avatar').textContent = ini;
    document.getElementById('profile-display-name').textContent  = name;
    document.getElementById('profile-display-email').textContent = currentUser.email;
    document.getElementById('welcome-name').textContent = name.split(' ')[0]||'vous';
    applyRoleUI();
  } catch(e) { console.error('loadProfile:', e); }
}

// ══════════════════════════════════════════
//  PRODUITS
// ══════════════════════════════════════════
function setupProducts() {
  document.getElementById('btn-add-product').addEventListener('click', () => {
    if (userRole !== 'admin') { alert('Accès admin requis'); return; }
    editProductId = null;
    // Re-populate selects
    const unitSel = document.getElementById('product-unit');
    const catSel  = document.getElementById('product-category');
    if (unitSel) unitSel.innerHTML = UNITS.map(u => `<option value="${u}">${u}</option>`).join('');
    if (catSel)  catSel.innerHTML  = CATS.map(c  => `<option value="${c}">${c}</option>`).join('');
    // Clear fields
    ['product-name','product-qty','product-price-sale','product-price-buy','product-alert'].forEach(id => {
      const el = document.getElementById(id); if(el) el.value = '';
    });
    const mp = document.getElementById('margin-preview');
    if (mp) { mp.textContent=''; mp.className='margin-preview'; }
    openModal('modal-product');
  });

  // Delete product button
  document.getElementById('btn-delete-product').addEventListener('click', async () => {
    if (!editProductId) return;
    if (!confirm('Supprimer ce produit définitivement ?')) return;
    try {
      await db.collection('products').doc(editProductId).delete();
      closeModal('modal-product');
      await loadProducts();
      console.log('Produit supprimé:', editProductId);
    } catch(e) { alert('❌ Erreur suppression : '+e.message); }
  });

  document.getElementById('btn-save-product').addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) { alert('Session expirée, reconnectez-vous'); return; }

    const name = (document.getElementById('product-name').value||'').trim();
    if (!name) { alert('Entrez le nom du produit'); return; }

    const priceSale = parseFloat(document.getElementById('product-price-sale').value)||0;
    const priceBuy  = parseFloat(document.getElementById('product-price-buy').value)||0;

    const data = {
      uid:            user.uid,
      name,
      category:       document.getElementById('product-category').value || 'Miel',
      qty:            parseFloat(document.getElementById('product-qty').value)||0,
      unit:           document.getElementById('product-unit').value || '500g',
      priceSale, priceBuy,
      margin:         priceSale - priceBuy,
      marginPct:      priceSale > 0 ? ((priceSale-priceBuy)/priceSale*100) : 0,
      alertThreshold: parseFloat(document.getElementById('product-alert').value)||5,
    };

    const btn = document.getElementById('btn-save-product');
    btn.textContent = 'Enregistrement…'; btn.disabled = true;

    try {
      if (editProductId) {
        await db.collection('products').doc(editProductId).update({...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp()});
        console.log('Produit mis à jour:', editProductId);
      } else {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        const ref = await db.collection('products').add(data);
        console.log('Nouveau produit ID:', ref.id);
      }
      closeModal('modal-product');
      await loadProducts();
    } catch(e) {
      console.error('Erreur save produit:', e);
      alert('❌ Erreur: '+e.message+' ('+e.code+')');
    } finally {
      btn.textContent = 'Enregistrer'; btn.disabled = false;
    }
  });

  // Margin preview
  ['product-price-sale','product-price-buy'].forEach(id => {
    const el = document.getElementById(id);
    if (el) el.addEventListener('input', () => {
      const sale = parseFloat(document.getElementById('product-price-sale').value)||0;
      const buy  = parseFloat(document.getElementById('product-price-buy').value)||0;
      const mp   = document.getElementById('margin-preview');
      if (!mp) return;
      if (sale > 0) {
        const m = sale-buy, pct=((m/sale)*100).toFixed(1);
        mp.textContent = 'Marge : '+fmt(m)+' MAD ('+pct+'%)';
        mp.className = 'margin-preview '+(m>=0?'positive':'negative');
      } else { mp.textContent=''; mp.className='margin-preview'; }
    });
  });
}

async function loadProducts() {
  if (!auth.currentUser) return;
  try {
    const snap = await db.collection('products').where('uid','==',auth.currentUser.uid).get();
    allProducts = snap.docs.map(d => ({id:d.id,...d.data()}));
    allProducts.sort((a,b) => (a.name||'').localeCompare(b.name||''));
    console.log('Produits chargés:', allProducts.length);
    renderProducts();
    renderStockAlerts();
    updateKPIs();
  } catch(e) { console.error('loadProducts:', e); }
}

function renderProducts() {
  const grid = document.getElementById('products-list');
  if (!grid) return;
  if (!allProducts.length) { grid.innerHTML = '<div class="empty-state">Aucun produit</div>'; return; }
  const admin = userRole === 'admin';
  grid.innerHTML = allProducts.map(p => {
    const isLow = p.qty <= (p.alertThreshold||5);
    const marge = (p.priceSale||0)-(p.priceBuy||0);
    const pct   = p.priceSale>0 ? ((marge/p.priceSale)*100).toFixed(0) : 0;
    return `<div class="product-card" data-id="${p.id}">
      <div class="product-info">
        <div class="product-name">${esc(p.name||'—')}</div>
        <div class="product-cat">${esc(p.category||'')} · ${esc(p.unit||'')}</div>
        ${isLow?'<span class="product-alert-badge">⚠️ Stock bas</span>':''}
        ${admin?`<div class="product-margin"><span class="margin-badge">Achat : ${fmt(p.priceBuy)} MAD</span><span class="margin-badge green">Marge : ${fmt(marge)} MAD (${pct}%)</span></div>`:''}
      </div>
      <div class="product-right">
        <div class="product-qty">${p.qty??'—'}</div>
        <div class="product-price">${fmt(p.priceSale)} MAD</div>
      </div>
    </div>`;
  }).join('');
  grid.querySelectorAll('.product-card').forEach(el => {
    el.addEventListener('click', () => {
      if (userRole !== 'admin') return;
      const p = allProducts.find(x => x.id===el.dataset.id);
      if (!p) return;
      editProductId = p.id;
      const unitSel = document.getElementById('product-unit');
      const catSel  = document.getElementById('product-category');
      if (unitSel) unitSel.innerHTML = UNITS.map(u => `<option value="${u}">${u}</option>`).join('');
      if (catSel)  catSel.innerHTML  = CATS.map(c  => `<option value="${c}">${c}</option>`).join('');
      document.getElementById('product-name').value       = p.name||'';
      document.getElementById('product-category').value   = p.category||'Miel';
      document.getElementById('product-qty').value        = p.qty??'';
      document.getElementById('product-unit').value       = p.unit||'500g';
      document.getElementById('product-price-sale').value = p.priceSale||'';
      document.getElementById('product-price-buy').value  = p.priceBuy||'';
      document.getElementById('product-alert').value      = p.alertThreshold||5;
      // Show delete button when editing
      const delBtn = document.getElementById('btn-delete-product');
      if (delBtn) delBtn.style.display = '';
      openModal('modal-product');
    });
  });
}

function renderStockAlerts() {
  const el = document.getElementById('stock-alerts');
  if (!el) return;
  const low = allProducts.filter(p => p.qty<=(p.alertThreshold||5));
  el.innerHTML = low.length
    ? low.map(p=>`<div class="alert-item">⚠️ <strong>${esc(p.name)}</strong> — Stock : ${p.qty} ${esc(p.unit||'')}</div>`).join('')
    : '<div class="empty-state">Stock en ordre ✅</div>';
}

// ══════════════════════════════════════════
//  COMMANDES
// ══════════════════════════════════════════
function setupOrders() {
  document.getElementById('btn-add-order').addEventListener('click', () => {
    if (userRole !== 'admin') return;
    editOrderId = null;
    document.getElementById('modal-order-title').textContent = 'Nouvelle commande';
    ['order-client','order-phone','order-products','order-amount','order-notes'].forEach(id => { const el=document.getElementById(id); if(el) el.value=''; });
    document.getElementById('order-channel').value = 'whatsapp';
    document.getElementById('order-status').value  = 'pending';
    // Hide delete button for new order
    const delBtn = document.getElementById('btn-delete-order');
    if (delBtn) delBtn.style.display = 'none';
    openModal('modal-order');
  });

  // Delete order
  document.getElementById('btn-delete-order').addEventListener('click', async () => {
    if (!editOrderId) return;
    if (!confirm('Supprimer cette commande définitivement ?')) return;
    try {
      await db.collection('orders').doc(editOrderId).delete();
      closeModal('modal-order');
      await loadOrders();
      console.log('Commande supprimée:', editOrderId);
    } catch(e) { alert('❌ Erreur suppression : '+e.message); }
  });

  document.getElementById('btn-save-order').addEventListener('click', async () => {
    const user = auth.currentUser;
    if (!user) return;
    const client = (document.getElementById('order-client').value||'').trim();
    if (!client) { alert('Entrez le nom du client'); return; }
    const data = {
      uid: user.uid, client,
      phone:    document.getElementById('order-phone').value.trim(),
      products: document.getElementById('order-products').value.trim(),
      amount:   parseFloat(document.getElementById('order-amount').value)||0,
      channel:  document.getElementById('order-channel').value,
      status:   document.getElementById('order-status').value,
      notes:    document.getElementById('order-notes').value.trim(),
    };
    const btn = document.getElementById('btn-save-order');
    btn.textContent='Enregistrement…'; btn.disabled=true;
    try {
      if (editOrderId) {
        // Check if status changed to 'done' → update stock
        const prevOrder = allOrders.find(o => o.id === editOrderId);
        const justDelivered = prevOrder && prevOrder.status !== 'done' && data.status === 'done';
        
        await db.collection('orders').doc(editOrderId).update({...data, updatedAt: firebase.firestore.FieldValue.serverTimestamp()});
        
        if (justDelivered) {
          await deductStock(data.products);
        }
      } else {
        data.createdAt = firebase.firestore.FieldValue.serverTimestamp();
        await db.collection('orders').add(data);
        // If created directly as 'done', deduct stock
        if (data.status === 'done') {
          await deductStock(data.products);
        }
      }
      closeModal('modal-order');
      await loadOrders();
      await loadProducts();
    } catch(e) { alert('❌ '+e.message); }
    finally { btn.textContent='Enregistrer'; btn.disabled=false; }
  });

  document.querySelectorAll('.filter-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.filter-btn').forEach(b=>b.classList.remove('active'));
      btn.classList.add('active');
      renderOrders(btn.dataset.filter);
    });
  });
}

// Auto stock deduction when order is delivered
async function deductStock(productsText) {
  if (!productsText || !allProducts.length) return;
  
  // Parse product names from order text (comma separated)
  const names = productsText.split(',').map(p => p.trim().toLowerCase()).filter(Boolean);
  
  for (const name of names) {
    // Find matching product (case insensitive partial match)
    const product = allProducts.find(p => 
      p.name.toLowerCase().includes(name) || name.includes(p.name.toLowerCase())
    );
    if (product && product.qty > 0) {
      const newQty = Math.max(0, product.qty - 1);
      try {
        await db.collection('products').doc(product.id).update({ qty: newQty });
        console.log('Stock mis à jour:', product.name, '→', newQty);
      } catch(e) { console.error('Erreur maj stock:', e); }
    }
  }
  await loadProducts();
}

async function loadOrders() {
  if (!auth.currentUser) return;
  try {
    const snap = await db.collection('orders').where('uid','==',auth.currentUser.uid).get();
    allOrders = snap.docs.map(d => ({id:d.id,...d.data()}));
    allOrders.sort((a,b) => (b.createdAt?.seconds||0)-(a.createdAt?.seconds||0));
    renderOrders('all');
    renderRecentOrders();
    updateKPIs();
  } catch(e) { console.error('loadOrders:', e); }
}

function renderOrders(filter='all') {
  const list = document.getElementById('orders-list');
  if (!list) return;
  const orders = filter==='all' ? allOrders : allOrders.filter(o=>o.status===filter);
  if (!orders.length) { list.innerHTML='<div class="empty-state">Aucune commande</div>'; return; }
  list.innerHTML = orders.map(o => orderHTML(o)).join('');
  list.querySelectorAll('.order-item').forEach(el => {
    el.addEventListener('click', () => {
      if (userRole!=='admin') return;
      const o = allOrders.find(x=>x.id===el.dataset.id); if(!o) return;
      editOrderId = o.id;
      document.getElementById('modal-order-title').textContent = 'Modifier';
      document.getElementById('order-client').value   = o.client||'';
      document.getElementById('order-phone').value    = o.phone||'';
      document.getElementById('order-products').value = o.products||'';
      document.getElementById('order-amount').value   = o.amount||'';
      document.getElementById('order-channel').value  = o.channel||'whatsapp';
      document.getElementById('order-status').value   = o.status||'pending';
      document.getElementById('order-notes').value    = o.notes||'';
      // Show delete button when editing
      const delBtn = document.getElementById('btn-delete-order');
      if (delBtn) delBtn.style.display = '';
      openModal('modal-order');
    });
  });
}

function renderRecentOrders() {
  const el = document.getElementById('recent-orders');
  if (!el) return;
  const recent = allOrders.slice(0,3);
  el.innerHTML = recent.length ? recent.map(o=>orderHTML(o)).join('') : '<div class="empty-state">Aucune commande</div>';
}

function orderHTML(o) {
  const labels={pending:'En attente',confirmed:'Confirmée',done:'Livrée',cancelled:'Annulée'};
  const date = o.createdAt ? new Date(o.createdAt.seconds*1000).toLocaleDateString('fr-MA') : '—';
  return `<div class="order-item" data-id="${o.id}"><div class="order-info"><div class="order-client">${esc(o.client||'—')}</div><div class="order-meta">${esc(o.products||'')} · ${date}</div></div><div class="order-right"><div class="order-amount">${fmt(o.amount)} MAD</div><div class="order-status status-${o.status||'pending'}">${labels[o.status]||'En attente'}</div></div></div>`;
}

// ══════════════════════════════════════════
//  ADS
// ══════════════════════════════════════════
function setupAds() {
  document.getElementById('btn-add-ads').addEventListener('click', () => {
    document.getElementById('ads-date').value = new Date().toISOString().split('T')[0];
    ['ads-campaign','ads-spend','ads-reach','ads-clicks','ads-conv'].forEach(id=>{const el=document.getElementById(id);if(el)el.value='';});
    openModal('modal-ads');
  });
  document.getElementById('btn-save-ads').addEventListener('click', async () => {
    const user = auth.currentUser; if(!user) return;
    const data = {
      uid: user.uid,
      date:        document.getElementById('ads-date').value,
      campaign:    document.getElementById('ads-campaign').value.trim(),
      spend:       parseFloat(document.getElementById('ads-spend').value)||0,
      reach:       parseInt(document.getElementById('ads-reach').value)||0,
      clicks:      parseInt(document.getElementById('ads-clicks').value)||0,
      conversions: parseInt(document.getElementById('ads-conv').value)||0,
      createdAt:   firebase.firestore.FieldValue.serverTimestamp()
    };
    try { await db.collection('ads').add(data); closeModal('modal-ads'); await loadAds(); }
    catch(e) { alert('❌ '+e.message); }
  });
}

async function loadAds() {
  if (!auth.currentUser) return;
  try {
    const snap = await db.collection('ads').where('uid','==',auth.currentUser.uid).get();
    allAds = snap.docs.map(d=>({id:d.id,...d.data()}));
    allAds.sort((a,b)=>(b.date||'').localeCompare(a.date||''));
    renderAdsEntries();
    updateKPIs();
  } catch(e) { console.error('loadAds:', e); }
}

function renderAdsEntries() {
  const el = document.getElementById('ads-entries-list'); if(!el) return;
  el.innerHTML = allAds.length
    ? allAds.slice(0,10).map(a=>`<div class="order-item"><div class="order-info"><div class="order-client">${esc(a.campaign||'—')}</div><div class="order-meta">${a.date||'—'} · ${(a.reach||0).toLocaleString()} portée</div></div><div class="order-right"><div class="order-amount">${fmt(a.spend)} MAD</div><div class="order-meta">${a.clicks||0} clics</div></div></div>`).join('')
    : '<div class="empty-state">Aucune donnée publicitaire</div>';
}

// ══════════════════════════════════════════
//  KPIs
// ══════════════════════════════════════════
function updateKPIs() {
  const now=new Date(), som=new Date(now.getFullYear(),now.getMonth(),1);
  const ca=allOrders.filter(o=>o.status!=='cancelled'&&o.createdAt&&new Date(o.createdAt.seconds*1000)>=som).reduce((s,o)=>s+(o.amount||0),0);
  const el1=document.getElementById('kpi-ca'); if(el1) el1.textContent=fmt(ca)+' MAD';
  const el2=document.getElementById('kpi-orders'); if(el2) el2.textContent=allOrders.filter(o=>o.createdAt&&new Date(o.createdAt.seconds*1000)>=som).length;
  const el3=document.getElementById('kpi-stock'); if(el3) el3.textContent=allProducts.length;
  const ads=allAds.filter(a=>a.date&&new Date(a.date)>=som).reduce((s,a)=>s+(a.spend||0),0);
  const el4=document.getElementById('kpi-ads'); if(el4) el4.textContent=fmt(ads)+' MAD';
}

function loadDashboard() { setWelcomeDate(); }

// ══════════════════════════════════════════
//  RAPPORTS
// ══════════════════════════════════════════
function setupReports() {
  document.querySelectorAll('.rtab').forEach(btn => {
    btn.addEventListener('click', () => {
      document.querySelectorAll('.rtab').forEach(b=>b.classList.remove('active'));
      document.querySelectorAll('.rtab-content').forEach(c=>c.classList.remove('active'));
      btn.classList.add('active');
      document.getElementById('rtab-'+btn.dataset.tab).classList.add('active');
      setTimeout(initCharts,50);
    });
  });
}

function initCharts() {
  initChartCA(); initChartOrderStatus(); initChartAds(); updateReportStats();
}

function initChartCA() {
  const ctx=document.getElementById('chart-ca'); if(!ctx) return;
  if(chartCA) chartCA.destroy();
  const days=30,labels=[],values=[];
  for(let i=days-1;i>=0;i--){
    const d=new Date(); d.setDate(d.getDate()-i);
    labels.push(d.toLocaleDateString('fr-MA',{day:'2-digit',month:'2-digit'}));
    const ds=new Date(d.getFullYear(),d.getMonth(),d.getDate()),de=new Date(ds);de.setDate(de.getDate()+1);
    values.push(allOrders.filter(o=>o.status!=='cancelled'&&o.createdAt&&new Date(o.createdAt.seconds*1000)>=ds&&new Date(o.createdAt.seconds*1000)<de).reduce((s,o)=>s+(o.amount||0),0));
  }
  chartCA=new Chart(ctx,{type:'line',data:{labels,datasets:[{label:'CA',data:values,borderColor:'#2d5a27',backgroundColor:'rgba(45,90,39,.1)',borderWidth:2,fill:true,tension:.4,pointRadius:3}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{ticks:{maxTicksLimit:6,font:{size:10}},grid:{display:false}},y:{ticks:{font:{size:10}},beginAtZero:true}}}});
}

function initChartOrderStatus() {
  const ctx=document.getElementById('chart-orders'); if(!ctx) return;
  if(chartOrders) chartOrders.destroy();
  const c={pending:0,confirmed:0,done:0,cancelled:0};
  allOrders.forEach(o=>{if(c[o.status]!==undefined)c[o.status]++;});
  chartOrders=new Chart(ctx,{type:'doughnut',data:{labels:['En attente','Confirmées','Livrées','Annulées'],datasets:[{data:Object.values(c),backgroundColor:['#f5c842','#2e6da4','#2d5a27','#c0392b'],borderWidth:0}]},options:{responsive:true,plugins:{legend:{position:'bottom',labels:{font:{size:11},padding:12}}}}});
}

function initChartAds() {
  const ctx=document.getElementById('chart-ads'); if(!ctx) return;
  if(chartAds) chartAds.destroy();
  const sorted=[...allAds].sort((a,b)=>a.date>b.date?1:-1).slice(-14);
  chartAds=new Chart(ctx,{type:'bar',data:{labels:sorted.map(a=>a.date?.slice(5)||''),datasets:[{label:'Dépense',data:sorted.map(a=>a.spend||0),backgroundColor:'#c8971f',borderRadius:6}]},options:{responsive:true,plugins:{legend:{display:false}},scales:{x:{grid:{display:false},ticks:{font:{size:10}}},y:{beginAtZero:true,ticks:{font:{size:10}}}}}});
}

function updateReportStats() {
  const totalCA=allOrders.filter(o=>o.status!=='cancelled').reduce((s,o)=>s+(o.amount||0),0);
  const el1=document.getElementById('stat-total-ca'); if(el1) el1.textContent=fmt(totalCA)+' MAD';
  const done=allOrders.filter(o=>o.status==='done');
  const avg=done.length?done.reduce((s,o)=>s+(o.amount||0),0)/done.length:0;
  const el2=document.getElementById('stat-avg-order'); if(el2) el2.textContent=fmt(avg)+' MAD';
  const pc={};allOrders.forEach(o=>{if(o.products)o.products.split(',').forEach(p=>{const k=p.trim();if(k)pc[k]=(pc[k]||0)+1;});});
  const top=Object.entries(pc).sort((a,b)=>b[1]-a[1])[0];
  const el3=document.getElementById('stat-top-product'); if(el3) el3.textContent=top?top[0]:'—';
  const ts=allAds.reduce((s,a)=>s+(a.spend||0),0);
  const tr=allAds.reduce((s,a)=>s+(a.reach||0),0);
  const el4=document.getElementById('stat-ads-spend'); if(el4) el4.textContent=fmt(ts)+' MAD';
  const el5=document.getElementById('stat-ads-reach'); if(el5) el5.textContent=tr>1000?(tr/1000).toFixed(1)+'K':tr;
  const el6=document.getElementById('stat-ads-roas');  if(el6) el6.textContent=ts>0?(allAds.reduce((s,a)=>s+(a.conversions||0),0)*avg/ts).toFixed(2):'—';
}

// ══════════════════════════════════════════
//  HELPERS
// ══════════════════════════════════════════
function fmt(n){return(parseFloat(n)||0).toLocaleString('fr-MA',{minimumFractionDigits:0,maximumFractionDigits:2});}
function esc(s){return String(s).replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');}
function showMsg(el,msg,type){if(!el)return;el.textContent=msg;el.className='profile-msg '+type;el.classList.remove('hidden');setTimeout(()=>el.classList.add('hidden'),3000);}

// Service Worker
if('serviceWorker' in navigator){
  navigator.serviceWorker.getRegistrations().then(regs=>regs.forEach(r=>r.unregister()));
}
