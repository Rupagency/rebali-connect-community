
# Routage des reponses vendeur avec plusieurs conversations

## Probleme

Quand un vendeur a plusieurs acheteurs en meme temps, tous les messages arrivent dans la meme conversation WhatsApp (celle avec le numero Re-Bali). Quand le vendeur repond, le systeme prend simplement la conversation **la plus recente** (`ORDER BY updated_at DESC LIMIT 1`), ce qui peut envoyer la reponse au mauvais acheteur.

## Solution : identifiant de conversation dans chaque message

Chaque message envoye au vendeur inclura un **code court de conversation** (ex: `#A`, `#B`, `#C`). Le vendeur devra prefixer sa reponse avec ce code pour indiquer a qui il repond.

### Comment ca marche pour le vendeur

**Message recu :**
```
[#A] Re-Bali (Surfboard 6'2):
Bonjour, est-elle encore disponible ?
```

**Le vendeur repond :**
```
#A Oui elle est dispo, on peut se voir demain
```

Si le vendeur repond **sans code** et a **plusieurs conversations actives**, il recoit un message d'aide :
```
Vous avez plusieurs conversations actives. Prefixez votre reponse avec le code :
#A - Surfboard 6'2 (Marie)
#B - Scooter Yamaha (John)
```

### Details techniques

#### 1. Nouvelle colonne `short_code` sur la table `conversations`

Ajouter une colonne `short_code TEXT` qui stocke un code court unique par vendeur (ex: `A`, `B`, `C`...). Ce code est attribue automatiquement a la creation de la conversation.

#### 2. Modification de `wa-webhook/index.ts`

**A. Attribution du short_code** : a la creation d'une conversation, assigner la prochaine lettre disponible pour ce vendeur (A, B, C... jusqu'a Z, puis AA, AB...).

**B. Prefixe dans les messages envoyes au vendeur** : le format passe de :
```
Re-Bali (Titre):
message
```
a :
```
[#A] Re-Bali (Titre):
message
```

**C. Parsing de la reponse vendeur** : quand un vendeur repond, chercher un `#X` au debut du message pour identifier la conversation cible.

**D. Gestion du cas sans code** :
- Si le vendeur a **une seule** conversation active : router automatiquement (pas de changement)
- Si le vendeur a **plusieurs** conversations actives et pas de code : envoyer la liste des conversations avec leurs codes

#### 3. Cote acheteur

Aucun changement. L'acheteur continue d'envoyer ses messages normalement avec le token `RB|L=...|B=...|`.

## Fichiers modifies

| Fichier | Modification |
|---|---|
| `supabase/functions/wa-webhook/index.ts` | Ajout du parsing `#X`, attribution de short_code, prefixe `[#X]` dans les messages, gestion multi-conversations |
| Migration SQL | Ajout colonne `short_code` sur `conversations` |

## Risques et limites

- Si le vendeur oublie le code, il recoit un rappel (pas de message perdu)
- Les conversations deja existantes recevront un code a la prochaine interaction
- Pas d'impact sur le flux acheteur
