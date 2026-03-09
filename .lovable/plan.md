

# Refonte Économie V3 — Équilibre & Clarté

---

## Résumé des Changements

Tu as raison sur les 4 points. Cette refonte aligne parfaitement les **items**, **packs d'achat**, et **earn rates** pour une progression motivante sans points orphelins.

### Nouveaux Items de la Boutique

| Item | Points | Durée | Description |
|------|--------|-------|-------------|
| **Remonter en tête** | 50 pts | 48h | Top de catégorie pendant 48h |
| **Mise en vedette** | 100 pts | 48h | Homepage, grande carte pendant 48h |
| **Vendeur Actif** | 150 pts | 30j | Badge + 15% visibilité + 2 boosts inclus |
| **Vendeur Expert** | 300 pts | 30j | Badge Expert + 30% visibilité + 5 boosts + analytics |
| **+5 Annonces** | 75 pts | 30j | 5 slots supplémentaires |

→ VIP et Protection fusionnés en progression linéaire (150 → 300)

### Nouveaux Packs d'Achat

| Pack | Points | Prix IDR | Finalité |
|------|--------|----------|----------|
| Starter | 50 pts | Rp 25 000 | = 1 boost exact |
| Popular | 150 pts | Rp 59 000 | = 1 Vendeur Actif exact |
| Pro | 300 pts | Rp 99 000 | = 1 Vendeur Expert exact |
| Business | 650 pts | Rp 189 000 | = 2× Expert + boosts restants |

### Nouveaux Earn Rates

| Action | Avant | Après |
|--------|-------|-------|
| Deal conclu | 5 pts | **8 pts** |
| Avis 5★ reçu | 3 pts | **5 pts** |
| Signalement validé | 10 pts | 10 pts |
| Plafond mensuel | 150 pts | **200 pts** |

Un vendeur actif (10 deals + 8 avis/mois) gagne ~120 pts/mois → progression réaliste vers les items.

---

## Plan d'Implémentation

### 1. Base de données
- Migration pour mettre à jour la contrainte CHECK sur `user_addons.addon_type` :
  - Supprimer `vip`, `protection`
  - Ajouter `active_seller`, `expert_seller`
- Aucune nouvelle colonne requise

### 2. Edge Function `manage-points`
**Fichier**: `supabase/functions/manage-points/index.ts`

Modifier :
```typescript
const ADDON_COSTS = {
  boost: 50,           // était 40
  boost_premium: 100,  // était 80
  active_seller: 150,  // remplace vip (120)
  extra_listings: 75,  // était 90
  expert_seller: 300,  // remplace protection (150)
};

const DYNAMIC_REWARDS = {
  completed_deal: 8,      // était 5
  five_star_review: 5,    // était 3
  validated_report: 10,   // inchangé
};

const DYNAMIC_MONTHLY_CAP = 200; // était 150
```

Ajouter la logique des boosts inclus pour `active_seller` (2 boosts) et `expert_seller` (5 boosts) : créer automatiquement des addons de type `boost` avec `listing_id = null` (à sélectionner plus tard).

### 3. Edge Function `xendit-create-invoice`
**Fichier**: `supabase/functions/xendit-create-invoice/index.ts`

Modifier :
```typescript
const POINT_PACKS = {
  starter: { points: 50, price: 25000 },
  popular: { points: 150, price: 59000 },
  pro: { points: 300, price: 99000 },
  business: { points: 650, price: 189000 },
};
```

### 4. Frontend `PointsShop.tsx`
**Fichier**: `src/pages/PointsShop.tsx`

- Mettre à jour `ADDON_CONFIG` avec les nouveaux types (`active_seller`, `expert_seller`)
- Mettre à jour `POINT_PACKS` avec les nouveaux prix/points
- Ajuster les icônes et couleurs pour la progression linéaire

### 5. Page TrustBadges
**Fichier**: `src/pages/TrustBadges.tsx`

Mettre à jour :
- `DYNAMIC_REWARDS` avec les nouvelles valeurs
- `ADDONS` avec les nouveaux items et coûts
- Texte du plafond mensuel (200 pts)

### 6. Traductions (12 langues)
**Fichiers**: `src/i18n/translations/*.json`

Pour chaque langue :
- Supprimer les clés `points.addon.vip*` et `points.addon.protection*`
- Ajouter `points.addon.active_seller`, `points.addon.expert_seller`
- Mettre à jour les descriptions des packs
- Mettre à jour le texte du plafond mensuel

Nouvelles clés :
```json
{
  "points.addon.active_seller": "Vendeur Actif",
  "points.addon.active_sellerDesc": "Badge + 15% visibilité organique + 2 boosts inclus (30j)",
  "points.addon.expert_seller": "Vendeur Expert", 
  "points.addon.expert_sellerDesc": "Badge Expert + 30% visibilité + 5 boosts + analytics (30j)",
  "points.pack.starter": "Starter",
  "points.pack.starterDesc": "1 boost catégorie",
  "points.pack.popular": "Popular",
  "points.pack.popularDesc": "1 statut Vendeur Actif",
  "points.pack.pro": "Pro",
  "points.pack.proDesc": "1 statut Vendeur Expert",
  "points.pack.business": "Business",
  "points.pack.businessDesc": "2× Expert + boosts bonus"
}
```

---

## Fichiers Modifiés

| Fichier | Action |
|---------|--------|
| Migration SQL | Modifier contrainte addon_type |
| `manage-points/index.ts` | Nouveaux coûts, rewards, logique boosts inclus |
| `xendit-create-invoice/index.ts` | Nouveaux packs |
| `src/pages/PointsShop.tsx` | Nouveaux items et packs |
| `src/pages/TrustBadges.tsx` | Nouvelles valeurs explicatives |
| `src/i18n/translations/*.json` (12) | Nouvelles clés |

---

## Récapitulatif Narratif

**Message aux utilisateurs** :
> "Plus tu es actif et de confiance, plus tu gagnes de points. Les points te donnent une visibilité supplémentaire — ou tu peux en acheter si tu veux accélérer. Chaque pack correspond exactement à un avantage, sans surplus inutile."

