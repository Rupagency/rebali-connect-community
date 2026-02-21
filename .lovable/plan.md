
# Plan d'amelioration globale de Re-Bali

Ce plan couvre 4 axes d'amelioration, a implementer etape par etape.

---

## Etape 1 — Performance & Optimisation

### Probleme actuel
Chaque `ListingCard` effectue 2 requetes individuelles (profil vendeur + compteur favoris), ce qui cree un probleme N+1 : pour 8 annonces sur la page d'accueil, cela genere 16 requetes supplementaires.

### Solution
- **Home.tsx / Browse.tsx** : enrichir la requete principale pour inclure `profiles:seller_id(user_type, is_verified_seller)` et le compteur de favoris directement, puis transmettre ces donnees aux `ListingCard` via props
- **ListingCard.tsx** : accepter les donnees vendeur et favoris en props optionnels, ne faire la requete que si les props ne sont pas fournis (retro-compatible)
- **Browse.tsx** : ajouter un debounce sur le champ de recherche (300ms) pour eviter les requetes a chaque frappe

---

## Etape 2 — Messages en temps reel (Supabase Realtime)

### Probleme actuel
Les messages utilisent un polling toutes les 5 secondes (`refetchInterval: 5000`), ce qui est inefficace et ajoute de la latence.

### Solution
- **Messages.tsx** : remplacer le polling par un abonnement Supabase Realtime sur la table `messages` filtre par `conversation_id`
- Quand un nouveau message arrive via le canal, l'ajouter directement au cache React Query
- Ajouter egalement un canal Realtime pour la liste des conversations (nouveaux messages non lus)
- Nettoyage du canal dans le `useEffect` cleanup

---

## Etape 3 — Politique de retention des documents

### Probleme actuel
Les documents d'identite chiffres restent stockes indefiniment apres approbation ou rejet.

### Solution
1. **Migration SQL** : ajouter une colonne `documents_purged_at` (timestamptz, nullable) a la table `id_verifications`
2. **Edge Function `purge-expired-docs`** : 
   - Parcourt les verifications approuvees/rejetees datant de plus de 30 jours
   - Supprime les fichiers du bucket `id-verifications` via le service role
   - Met a jour `documents_purged_at` avec la date courante
3. **Cron job** : planifier l'execution quotidienne via `pg_cron` + `pg_net`
4. **Admin.tsx** : afficher le statut de purge dans les cartes de verification (documents purges ou toujours disponibles)

---

## Etape 4 — UX & Design

### 4a. Menu mobile complet
- **Header.tsx** : ajouter les liens de navigation manquants dans le menu mobile (Browse, Favoris, Messages, Mes annonces, Profil)
- Ajouter une barre de navigation mobile fixe en bas de l'ecran (bottom nav) avec les 5 icones principales : Accueil, Parcourir, Vendre, Messages, Profil

### 4b. Etats de chargement (skeletons)
- **Home.tsx** : ajouter des skeletons pour les cartes d'annonces pendant le chargement
- **ListingDetail.tsx** : ameliorer le skeleton existant avec une vraie structure (image, titre, prix)
- **Profile.tsx** : ajouter un skeleton pendant le chargement du profil

### 4c. Animations avec Framer Motion
- Ajouter des animations d'entree sur les cartes d'annonces (fade-in + slide-up echelonne)
- Animer les transitions entre les etapes du formulaire de creation
- Ajouter une animation subtile sur le changement de favoris (coeur qui pulse)

### 4d. Mode sombre
- L'application utilise deja le systeme de design Tailwind/shadcn avec des variables CSS. Verifier que toutes les pages respectent le theme (pas de couleurs codees en dur)
- Ajouter un bouton de basculement clair/sombre dans le header via `next-themes` (deja installe)

---

## Ordre d'implementation

| Ordre | Etape | Fichiers principaux |
|-------|-------|-------------------|
| 1 | Performance (N+1) | ListingCard.tsx, Home.tsx, Browse.tsx |
| 2 | Messages Realtime | Messages.tsx |
| 3 | Retention documents | Migration SQL, nouvelle edge function, Admin.tsx |
| 4a | Mobile nav | Header.tsx, nouveau composant BottomNav |
| 4b | Skeletons | Home.tsx, ListingDetail.tsx, Profile.tsx |
| 4c | Animations | ListingCard.tsx, CreateListing.tsx |
| 4d | Mode sombre | Header.tsx, index.css |

---

## Details techniques

### Realtime (Etape 2)
```text
useEffect
  |-- subscribe to channel "messages:{convId}"
  |-- on INSERT -> append to React Query cache
  |-- return () => unsubscribe
```

### Purge cron (Etape 3)
```text
pg_cron (daily 3am)
  |-- POST /functions/v1/purge-expired-docs
  |-- Edge function:
  |     |-- SELECT verifications WHERE status IN ('approved','rejected')
  |     |     AND created_at < now() - 30 days
  |     |     AND documents_purged_at IS NULL
  |     |-- DELETE files from storage
  |     |-- UPDATE documents_purged_at = now()
```

### Bottom Nav (Etape 4a)
Un composant `BottomNav.tsx` affiche uniquement sur mobile (hidden md:), avec 5 boutons : Accueil, Parcourir, Vendre (+), Messages, Profil. Integre dans `Layout.tsx`.
