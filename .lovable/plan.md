

## Diagnostic: Deadlock interne du client Supabase

### Cause racine identifiee

J'ai trouve la cause exacte en analysant les **logs reseau** : la connexion reussit (200 OK), `onAuthStateChange` fire correctement, `fetchProfile` est appele... mais **aucune requete HTTP vers la table `profiles` n'est jamais envoyee**.

Le profil existe bien en base (verifie par requete directe).

**Le probleme est un deadlock dans le client Supabase JS v2.** Voici la sequence exacte :

```text
1. handleLogin() → await signInWithPassword()     → OK (200)
2. Supabase interne: acquiert auth lock, fire onAuthStateChange(SIGNED_IN)
3. handleLogin() → await supabase.auth.getSession() ← DEADLOCK
   (tente d'acquerir le meme auth lock, deja tenu)
4. fetchProfile() → supabase.from('profiles').select()
   → interne: appelle getSession() pour le token
   → BLOQUE aussi derriere le lock
5. setLoading(false) jamais appele → bouton reste grise
6. navigate('/') jamais appele → reste sur /auth
7. Profile montre spinner infini car profile === null
```

Le meme probleme existe dans `handleSignup` (ligne 121).

---

### Plan de correction

#### 1. Corriger `Auth.tsx` — Supprimer les appels `getSession()` dans les handlers

`handleLogin` :
- Supprimer `await supabase.auth.getSession()` (ligne 76)
- Utiliser le resultat de `signInWithPassword` directement pour `logDevice`
- Supprimer `navigate('/')` — laisser le `useEffect` (ligne 28-30) gerer la redirection

`handleSignup` :
- Supprimer `await supabase.auth.getSession()` (ligne 121)
- Utiliser `signUpData.session` directement pour verifier l'auto-login

#### 2. Simplifier `AuthContext.tsx`

Le code actuel est correct dans sa structure (pas d'async dans onAuthStateChange, useEffect separe pour fetchProfile). Seul ajout :
- Ajouter un timeout de securite sur `fetchProfile` pour ne jamais bloquer indefiniment
- S'assurer que `setLoading(false)` est appele meme si `getSession()` echoue (via `.catch`)

#### 3. Verifier les pages protegees

Les pages Profile, Admin, MyListings, etc. utilisent deja le bon pattern (`useEffect` + `authLoading`). Pas de changement necessaire.

---

### Fichiers modifies

| Fichier | Modification |
|---------|-------------|
| `src/pages/Auth.tsx` | Supprimer `getSession()` dans handleLogin et handleSignup |
| `src/contexts/AuthContext.tsx` | Ajouter timeout securite sur fetchProfile |

### Resultat attendu

- La connexion redirige immediatement vers l'accueil
- Le profil charge correctement
- Le bouton "Se connecter" ne reste plus grise
- La deconnexion fonctionne
- L'app native ne boucle plus

