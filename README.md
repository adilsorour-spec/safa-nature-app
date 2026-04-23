# 🌿 Safa Nature PWA — Guide d'installation

Application mobile PWA de gestion pour Safa Nature.
Stack : HTML/CSS/JS + Firebase + Netlify

---

## 📋 Structure des fichiers

```
safa-nature-pwa/
├── index.html       ← App principale
├── style.css        ← Styles
├── app.js           ← Logique + Firebase
├── manifest.json    ← Config PWA (installation)
├── sw.js            ← Service Worker (offline)
├── _redirects       ← Config Netlify SPA
└── icons/
    ├── icon-192.png ← Icône app (à créer)
    └── icon-512.png ← Icône app splash (à créer)
```

---

## 🔥 ÉTAPE 1 — Créer le projet Firebase

1. Va sur https://console.firebase.google.com
2. Clique **"Créer un projet"** → nomme-le `safa-nature`
3. Désactive Google Analytics si tu veux (optionnel)

### Activer Authentication
- Dans le menu gauche → **Authentication** → **Get started**
- Active **Email/Password**

### Activer Firestore
- Dans le menu gauche → **Firestore Database** → **Créer une base de données**
- Choisis **"Démarrer en mode production"**
- Région : **europe-west1** (le plus proche du Maroc)

### Règles Firestore (sécurité)
Dans **Firestore → Règles**, colle :

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    match /users/{userId} {
      allow read, write: if request.auth != null && request.auth.uid == userId;
    }
    match /orders/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.uid;
      allow create: if request.auth != null;
    }
    match /products/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.uid;
      allow create: if request.auth != null;
    }
    match /ads/{docId} {
      allow read, write: if request.auth != null && request.auth.uid == resource.data.uid;
      allow create: if request.auth != null;
    }
  }
}
```

### Récupérer la config Firebase
- **Paramètres du projet** (icône ⚙️) → **Vos applications** → **</>** (Web)
- Nomme-la `safa-nature-web`
- Copie l'objet `firebaseConfig`

### Mettre la config dans app.js
Ouvre `app.js` et remplace le bloc en haut :

```javascript
const firebaseConfig = {
  apiKey:            "AIzaSy...",
  authDomain:        "safa-nature.firebaseapp.com",
  projectId:         "safa-nature",
  storageBucket:     "safa-nature.appspot.com",
  messagingSenderId: "123456789",
  appId:             "1:123456789:web:abc..."
};
```

### Créer ton compte admin
- Dans Firebase **Authentication** → **Ajouter un utilisateur**
- Email : `admin@safanature.ma` (ou ton email)
- Mot de passe : choisis un mot de passe fort

---

## 🖼️ ÉTAPE 2 — Créer les icônes

Tu as besoin de 2 icônes PNG dans un dossier `icons/` :
- `icons/icon-192.png` (192×192 px)
- `icons/icon-512.png` (512×512 px)

**Option rapide** : utilise https://realfavicongenerator.net
- Upload ton logo Safa Nature
- Télécharge le pack → prends les PNG 192 et 512

---

## 🌐 ÉTAPE 3 — Déployer sur Netlify

### Option A — Glisser-déposer (le plus simple)
1. Va sur https://app.netlify.com
2. Crée un compte gratuit
3. Sur le dashboard → **"Add new site"** → **"Deploy manually"**
4. Glisse tout le dossier `safa-nature-pwa/` dans la zone de dépôt
5. Netlify te donne une URL du type `https://safa-nature-xxx.netlify.app`

### Option B — Via GitHub (recommandé pour les mises à jour)
1. Crée un repo GitHub privé
2. Push les fichiers
3. Sur Netlify → **"Import from Git"** → connecte GitHub
4. Chaque `git push` → déploiement automatique !

### Domaine personnalisé (optionnel)
- Dans Netlify → **Domain settings** → **Add custom domain**
- Entre `app.safanature.ma` par exemple
- Configure les DNS chez ton registrar

---

## 📱 ÉTAPE 4 — Installer l'app sur mobile

### Sur iPhone (Safari)
1. Ouvre l'URL de ton app dans Safari
2. Appuie sur **Partager** (icône carré avec flèche)
3. **"Sur l'écran d'accueil"**
4. L'app apparaît comme une vraie app !

### Sur Android (Chrome)
1. Ouvre l'URL dans Chrome
2. Une bannière **"Installer l'application"** apparaît automatiquement
3. Ou : menu ⋮ → **"Ajouter à l'écran d'accueil"**

---

## 📊 Collections Firestore créées automatiquement

| Collection | Description |
|------------|-------------|
| `users`    | Profils utilisateurs |
| `orders`   | Commandes clients |
| `products` | Catalogue + stocks |
| `ads`      | Données Meta Ads |

---

## 🔧 Personnalisations courantes

### Changer les produits par défaut dans le formulaire
Dans `index.html`, cherche `<select id="product-category">` et modifie les options.

### Ajouter un canal de vente
Dans `<select id="order-channel">`, ajoute une option.

### Changer la devise
Dans `app.js`, cherche `MAD` et remplace par ta devise.

---

## 🆘 Support

Si tu as une erreur Firebase, vérifie :
1. Que la config `firebaseConfig` est correcte dans `app.js`
2. Que les règles Firestore sont bien configurées
3. Que l'utilisateur est créé dans Authentication

---

*Safa Nature App v1.0 — Développé avec ❤️*
