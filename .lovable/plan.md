

# Systeme "Deal Conclu" + Avis Verifies

## Resume

Quand un vendeur clique sur "Deal conclu" dans une conversation, l'annonce passe en statut "sold" (vendu), toutes les autres conversations pour cette annonce sont fermees, et seul l'acheteur concerne peut laisser un avis -- sous conditions strictes.

## Flux utilisateur

```text
Conversation active entre vendeur et acheteur
  -> Vendeur clique "Deal conclu" (toujours visible)
  -> Confirmation dialog
  -> L'annonce passe en statut "sold"
  -> L'annonce disparait des resultats de recherche
  -> Toutes les autres conversations pour cette annonce sont marquees "closed"
  -> Un message systeme apparait dans chaque conversation fermee
  -> L'acheteur peut laisser un avis SI :
     1. Les deux comptes (vendeur + acheteur) ont plus de 7 jours
     2. La conversation contient des vrais messages texte des deux cotes (pas juste le premier message auto)
     3. La conversation a un deal_closed = true avec cet acheteur
```

## Conditions pour le rating

| Condition | Raison |
|-----------|--------|
| `deal_closed = true` sur la conversation | Preuve que le vendeur confirme la transaction |
| Compte acheteur > 7 jours | Empeche les comptes jetables crees pour fake rating |
| Compte vendeur > 7 jours | Empeche un nouveau vendeur de se fake-noter via un complice |
| Messages texte des deux cotes | Un vrai echange a eu lieu (pas juste un contact initial sans reponse) |

## Plan technique

### 1. Migration base de donnees

**Nouveau statut listing** : Ajouter `'sold'` au type enum `listing_status` pour distinguer "vendu" de "archive".

**Table `conversations`** -- 3 nouvelles colonnes :
- `deal_closed` (boolean, default false)
- `deal_closed_at` (timestamptz, nullable)
- `deal_closed_by` (uuid, nullable)

**Table `reviews`** -- 2 nouvelles colonnes :
- `conversation_id` (uuid, nullable, UNIQUE) -- lie l'avis a une conversation, empeche les doublons
- `is_verified_purchase` (boolean, default false)

**RLS `reviews` INSERT** -- remplacer la politique actuelle par une qui verifie :
- `auth.uid() = reviewer_id AND reviewer_id != seller_id`
- Il existe une conversation qualifiante :
  - `deal_closed = true`
  - `buyer_id = auth.uid()`
  - Les deux profils (acheteur et vendeur) ont `created_at < now() - 7 days`
  - Il existe au moins 1 message du buyer ET 1 message du seller dans cette conversation

### 2. Bouton "Deal conclu" dans Messages.tsx

- Visible uniquement par le **vendeur** (`activeConv.seller_id === user.id`)
- Toujours visible tant que `deal_closed` est false
- Au clic, dialog de confirmation avec nom de l'acheteur et annonce
- Actions a la confirmation :
  1. Update conversation : `deal_closed = true, deal_closed_at = now(), deal_closed_by = user.id`
  2. Update listing : `status = 'sold'`
  3. Fermer toutes les AUTRES conversations pour ce listing (update `relay_status = 'closed'`)
  4. Inserer un message systeme dans la conversation active ("Deal conclu")
  5. Inserer un message systeme dans les conversations fermees ("Ce produit a ete vendu")
  6. Invalider les queries

### 3. Affichage dans la conversation

- Si `deal_closed = true` : bandeau vert "Deal conclu le [date]"
- Si `relay_status = 'closed'` et pas deal_closed : bandeau gris "Ce produit a ete vendu par le vendeur"
- Conversation fermee : input desactive, message explicatif

### 4. SellerProfile.tsx -- Avis conditionnes

- Le bouton "Laisser un avis" apparait uniquement si :
  - L'utilisateur est connecte et n'est pas le vendeur
  - Une conversation avec `deal_closed = true` existe ou il est buyer
  - Son compte a plus de 7 jours
  - Le compte vendeur a plus de 7 jours
  - Des messages des deux cotes existent
  - Pas encore d'avis pour cette conversation
- Messages explicatifs selon la condition non remplie
- Badge "Acheteur verifie" (CheckCircle vert) sur les avis avec `is_verified_purchase = true`

### 5. Traductions

Nouvelles cles en.json / fr.json :
- `messages.dealClosed`, `messages.dealClosedConfirm`, `messages.dealClosedSuccess`
- `messages.dealClosedBanner`, `messages.productSold`
- `messages.conversationClosed`
- `seller.verifiedPurchase`, `seller.reviewRequiresDeal`
- `seller.accountTooNew`, `seller.noExchangeYet`, `seller.alreadyReviewed`

## Fichiers concernes

| Fichier | Action |
|---------|--------|
| Migration SQL | Enum `listing_status` + colonnes conversations/reviews + RLS |
| `src/pages/Messages.tsx` | Bouton "Deal conclu", bandeau statut, blocage input conversations fermees |
| `src/pages/SellerProfile.tsx` | Logique avis conditionnes + badge "Acheteur verifie" |
| `src/i18n/translations/en.json` | Nouvelles cles |
| `src/i18n/translations/fr.json` | Traductions |

## Securite

- Le vendeur seul peut marquer un deal (verifie client + RLS serveur)
- Seul l'acheteur du deal peut noter (RLS enforce via `buyer_id = auth.uid()`)
- Comptes < 7 jours bloques au niveau RLS (impossible de contourner cote client)
- Echange reel requis (messages des deux cotes verifie en RLS)
- Un seul avis par conversation (contrainte UNIQUE)
- Les politiques UPDATE/DELETE sur reviews restent inchangees

