

# Systeme Complet de Securite et Anti-Scam -- Re-Bali

## Vue d'ensemble

Ce plan implemente les 10 modules de securite demandes, en utilisant **Fonnte** pour la verification WhatsApp OTP, **ipinfo.io** pour la detection VPN, et un systeme de confiance invisible cote backend.

Le projet est decoupe en **4 phases** pour rester geeable. Chaque phase est deployable independamment.

---

## Phase 1 : Infrastructure base de donnees + WhatsApp OTP via Fonnte

### 1A. Migration SQL -- Nouvelles tables

**Table `user_devices`** : empreinte appareil, IP, OS, navigateur
```text
id, user_id, device_hash, ip_address, user_agent, os, browser, is_vpn, created_at
```

**Table `phone_verifications`** : OTP WhatsApp
```text
id, user_id, phone_number, otp_code (hashed), verified, attempts, expires_at, created_at
```

**Table `banned_devices`** : blocage appareil/telephone
```text
id, device_hash, phone_number, reason, banned_by, created_at
```

**Table `whatsapp_click_logs`** : tracking clics WhatsApp
```text
id, listing_id, user_id (nullable), clicked_at
```

**Table `trust_scores`** : score de confiance interne
```text
id, user_id, score (0-100), risk_level (low/medium/high), last_calculated, factors (jsonb)
```

**Table `id_verifications`** : verification identite (KTP/Passeport)
```text
id, user_id, document_type, document_path, selfie_path, status (pending/approved/rejected), reviewed_by, reviewed_at, created_at
```

Ajout de colonnes sur `profiles` :
- `phone_verified` (boolean, default false)
- `trust_score` (integer, default 50)
- `risk_level` (text, default 'low')
- `is_verified_seller` (boolean, default false)

Ajout d'un enum `risk_level` : low, medium, high

RLS policies pour chaque table (lecture admin, ecriture owner via edge functions).

### 1B. Edge Function `send-otp`

- Recoit `phone_number` et `user_id`
- Verifie que le numero n'est pas dans `banned_devices`
- Verifie qu'il n'est pas deja utilise par un autre compte
- Genere un OTP 6 chiffres, le hash avec SHA-256
- Envoie via Fonnte API (`POST https://api.fonnte.com/send`) avec token stocke en secret
- Message WhatsApp : "Votre code Re-Bali : 123456. Valide 5 minutes."
- Stocke dans `phone_verifications` avec expiration 5 min
- Limite : max 3 tentatives par session

### 1C. Edge Function `verify-otp`

- Recoit `phone_number`, `otp_code`, `user_id`
- Compare le hash
- Si correct : met a jour `profiles.phone_verified = true`, `profiles.whatsapp = phone_number`
- Si incorrect : incremente `attempts`, bloque apres 3 essais

### 1D. UI -- Verification WhatsApp dans le profil

- Nouvelle section dans `Profile.tsx` : "Verifier votre WhatsApp"
- Champ telephone + bouton "Envoyer le code"
- Input OTP 6 chiffres (composant `InputOTP` existant)
- Bouton "Verifier"
- Badge "WhatsApp Verifie" une fois confirme

### 1E. Secret a configurer

- `FONNTE_TOKEN` : token API Fonnte (a demander a l'utilisateur)

---

## Phase 2 : Device Fingerprinting, IP Intelligence, Trust Score

### 2A. Edge Function `log-device`

- Appelee a chaque login/signup
- Recoit : device_hash (genere cote client via simple hash de navigator properties), user_agent, IP (extraite du header)
- Appelle ipinfo.io pour detecter VPN/datacenter (secret `IPINFO_TOKEN`)
- Stocke dans `user_devices`
- Verifie si `device_hash` est dans `banned_devices` -- si oui, refuse
- Detecte si meme IP a cree 2+ comptes en 24h -- flag en "medium"

### 2B. Fingerprinting cote client

- Au signup/login, collecter : `navigator.userAgent`, `navigator.language`, `screen.width`, `screen.height`, `navigator.platform`
- Hash SHA-256 de la concatenation = `device_hash`
- Envoyer a `log-device`

### 2C. Edge Function `calculate-trust-score`

- Appelee periodiquement ou a chaque action significative
- Score base sur :
  - Age du compte (+1/jour, max 30)
  - Nombre d'annonces actives (+5/annonce, max 20)
  - Verification WhatsApp (+15)
  - Verification identite (+20)
  - Signalements recus (-10/signalement non resolu)
  - Stabilite IP (-15 si VPN detecte)
  - Stabilite device (-10 si multi-comptes meme device)
- Score < 30 : annonces en moderation
- Score < 10 : suspension auto

### 2D. Secret a configurer

- `IPINFO_TOKEN` : token ipinfo.io (a demander a l'utilisateur)

---

## Phase 3 : Protections Annonces + Watermark + Limitations nouveaux comptes

### 3A. Watermark photos

- Dans `CreateListing.tsx`, apres upload de chaque photo :
  - Utiliser Canvas API pour ajouter un watermark semi-transparent :
    "Re-Bali - @username - DD/MM/YYYY"
  - Position : bas-droit, police blanche avec ombre
  - Le fichier uploade est la version watermarkee

### 3B. Limitations nouveaux comptes (< 7 jours)

- Dans `CreateListing.tsx` et via trigger SQL :
  - Si `profile.created_at` < 7 jours :
    - Max 3 annonces actives (au lieu de 5)
    - Pas de boost/feature
  - Trigger SQL `check_new_account_limit` sur INSERT listings

### 3C. Filtrage description

- Edge Function `check-content` ou logique client :
  - Scanner la description pour liens suspects : `wa.me`, `t.me`, `bit.ly`, numeros de telephone bruts
  - Bloquer la publication si detecte
  - Message d'erreur : "Les liens externes ne sont pas autorises dans la description"

### 3D. WhatsApp contact securise

- `ListingDetail.tsx` : masquer le numero, garder uniquement le bouton "Contacter via WhatsApp"
- A chaque clic : inserer dans `whatsapp_click_logs`
- Message pre-rempli existant conserve

---

## Phase 4 : Verified Seller, Admin Panel etendu, Disclaimer

### 4A. Verification identite

- Nouveau bucket Storage `id-verifications` (prive, acces admin uniquement)
- RLS : INSERT par owner, SELECT par admin
- Nouvelle page/section dans Profile : "Devenir Vendeur Verifie"
  - Upload document (KTP ou Passeport)
  - Upload selfie avec document
  - Statut : en attente / approuve / rejete
- Apres approbation admin : `profiles.is_verified_seller = true`, trust score +20
- Badge "Verified Seller" affiche sur le profil et les annonces

### 4B. Admin Panel etendu

Ajouter dans `Admin.tsx` un nouvel onglet "Securite" avec :
- Vue trust score + risk level pour chaque utilisateur
- Historique devices + IPs par utilisateur
- Comptes lies (meme device_hash)
- Demandes de verification identite en attente
- Actions : bannir device, bannir telephone, reduire limite annonces
- Signalements auto (3+ scam reports en 24h = listing cache automatiquement)

### 4C. Auto-moderation signalements

- Trigger SQL ou Edge Function : si une annonce recoit 3+ signalements "scam" en 24h :
  - Passer le statut en `archived`
  - Marquer le profil en `risk_level = high`

### 4D. Disclaimer legal

- Ajouter dans la page Rules/Safety un paragraphe :
  "Re-Bali agit en tant que plateforme de mise en relation entre acheteurs et vendeurs. Les transactions sont effectuees directement entre utilisateurs."

---

## Fichiers a creer/modifier

### Nouveaux fichiers
- `supabase/functions/send-otp/index.ts` -- envoi OTP via Fonnte
- `supabase/functions/verify-otp/index.ts` -- verification OTP
- `supabase/functions/log-device/index.ts` -- fingerprint + IP logging
- `supabase/functions/calculate-trust-score/index.ts` -- calcul score confiance
- `supabase/functions/check-content/index.ts` -- filtrage liens suspects

### Fichiers modifies
- `src/pages/Profile.tsx` -- section verification WhatsApp + verification identite
- `src/pages/Auth.tsx` -- appel log-device au signup/login
- `src/pages/CreateListing.tsx` -- watermark, limitations, filtrage description
- `src/pages/ListingDetail.tsx` -- tracking clics WhatsApp, masquage numero
- `src/pages/Admin.tsx` -- onglet securite, gestion verifications
- `src/contexts/AuthContext.tsx` -- appel log-device apres auth
- `src/i18n/translations/en.json` -- nouvelles traductions
- `src/i18n/translations/fr.json` -- nouvelles traductions
- `supabase/config.toml` -- config edge functions (verify_jwt = false)

### Migrations SQL
- Tables : `user_devices`, `phone_verifications`, `banned_devices`, `whatsapp_click_logs`, `trust_scores`, `id_verifications`
- Colonnes sur `profiles` : `phone_verified`, `trust_score`, `risk_level`, `is_verified_seller`
- Enum `risk_level`
- Triggers : `check_new_account_limit`, auto-archive sur 3+ scam reports
- RLS policies pour toutes les nouvelles tables
- Bucket Storage `id-verifications` (prive)

### Secrets necessaires
- `FONNTE_TOKEN` -- a fournir apres creation du compte Fonnte
- `IPINFO_TOKEN` -- a fournir apres inscription sur ipinfo.io

---

## Ordre d'implementation

L'implementation suivra l'ordre Phase 1 > 2 > 3 > 4, en commencant par la migration SQL complete, puis les edge functions, puis les modifications frontend. Les secrets seront demandes avant de coder les edge functions correspondantes.

