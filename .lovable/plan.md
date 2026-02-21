

# Refonte complete de l'espace Profil utilisateur

## Objectif
Transformer la page profil actuelle (un simple formulaire basique) en un espace utilisateur professionnel digne d'une vraie marketplace, avec tableau de bord personnel, avatar, statistiques, securite renforcee et navigation structuree.

---

## Ce qui existe aujourd'hui
- Un formulaire minimaliste dans une seule Card : nom, telephone, WhatsApp, type de compte, langue
- Aucun avatar uploadable
- Aucune statistique personnelle
- Aucune validation des champs
- Pas de changement de mot de passe
- Pas de suppression de compte
- Pas de lien vers le profil public

---

## Nouvelles fonctionnalites

### 1. En-tete profil avec avatar
- Photo de profil uploadable (clic sur l'avatar pour changer)
- Upload vers le bucket Storage `avatars` (a creer)
- Nom d'affichage, badge Pro/Particulier, membre depuis, note moyenne
- Lien "Voir mon profil public" vers `/seller/{id}`

### 2. Tableau de bord personnel (statistiques)
- Cartes en haut : annonces actives, annonces vendues, vues totales, note moyenne
- Donnees lues depuis `listings` et `reviews`

### 3. Formulaire ameliore (section "Informations")
- Validation Zod sur tous les champs (nom requis, format telephone, longueur max)
- Nom d'affichage (obligatoire, 2-50 caracteres)
- Telephone (format international, optionnel)
- WhatsApp (format international, optionnel)
- Type de compte (Private/Business)
- Langue preferee

### 4. Section Securite
- Bouton "Changer le mot de passe" (envoie un email de reset via `resetPasswordForEmail`)
- Bouton "Supprimer mon compte" avec confirmation (archive les annonces puis supprime le profil -- note : la suppression complete du compte auth necessite un appel admin, on archivera les annonces et bannira le profil comme solution)
- Email affiche en lecture seule (depuis `user.email`)

### 5. Section "Mes avis recus"
- Liste des derniers avis recus en tant que vendeur
- Note moyenne avec etoiles

---

## Plan technique

### Migration SQL
1. Creer le bucket Storage `avatars` (public)
2. Ajouter les policies RLS sur `storage.objects` pour le bucket avatars :
   - SELECT public (tout le monde peut voir les avatars)
   - INSERT/UPDATE/DELETE pour le proprietaire uniquement (`auth.uid()::text = owner_id::text`)

### Fichiers a modifier/creer

**`src/pages/Profile.tsx`** -- Refonte complete :
- Layout en sections avec Tabs ou sections verticales
- Section header avec avatar upload
- Section statistiques (cards)
- Section informations personnelles (formulaire avec validation Zod)
- Section securite (changement mdp, suppression compte)
- Section avis recus

**Aucun nouveau composant externe** -- tout avec les composants UI existants (Card, Avatar, Badge, Button, Input, Tabs, Dialog, etc.)

### Validation et securite
- Validation client avec Zod : `display_name` (2-50 chars), `phone` et `whatsapp` (regex format international optionnel), `user_type` enum
- `encodeURIComponent` pour tout parametre passe en URL
- Pas de `dangerouslySetInnerHTML`
- Les updates passent par RLS (policy existante "Users can update their own profile")

### Traductions
- Ajout de nouvelles cles dans `fr.json` et `en.json` pour : avatar upload, statistiques du profil, section securite, changement de mot de passe, suppression de compte, avis recus

### Aucune nouvelle dependance
- Zod est deja installe
- Les composants Avatar, Dialog, Separator sont deja disponibles

