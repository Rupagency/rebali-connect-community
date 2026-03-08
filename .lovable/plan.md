

# Ajouter le type d'annonce : Vente / Location

Actuellement, toutes les annonces sont implicitement des "ventes". Il faut ajouter un champ `listing_type` (vente ou location) pour les categories qui s'y pretent.

---

## Categories concernees par la location

| Categorie | Sous-categories location |
|-----------|------------------------|
| Immobilier | locations, colocations, bureaux_commerces, locations_saisonnieres (vacances) |
| Vehicules | toutes (location de voiture/moto) |
| Materiel pro | toutes (location de materiel) |
| Electronique | toutes (location possible) |
| Vacances | locations_saisonnieres |

**Approche** : Plutot que de limiter par sous-categorie, on ajoute un selecteur "Vente / Location" visible pour les categories ou la location fait sens. Pour `immobilier` et `vacances`, certaines sous-categories impliquent automatiquement la location.

---

## Plan technique

### 1. Migration DB : Ajouter `listing_type` a la table `listings`

```sql
ALTER TABLE public.listings 
  ADD COLUMN listing_type text NOT NULL DEFAULT 'sale';
```

Valeurs possibles : `sale`, `rent`. Pas d'enum pour rester flexible.

### 2. Mise a jour `src/lib/constants.ts`

- Ajouter `LISTING_TYPES = ['sale', 'rent'] as const`
- Ajouter `CATEGORIES_WITH_RENTAL` : liste des categories ou le choix vente/location apparait (`immobilier`, `vehicules`, `materiel_pro`, `electronique`, `maison_jardin`)
- Ajouter `SUBCATEGORIES_FORCE_RENT` : sous-categories qui forcent automatiquement `listing_type = 'rent'` (`locations`, `colocations`, `locations_saisonnieres`)
- Ajouter `SUBCATEGORIES_FORCE_SALE` : sous-categories qui forcent `sale` (`ventes_immobilieres`)

### 3. Mise a jour `src/pages/CreateListing.tsx`

- Ajouter `listing_type` au state du formulaire (defaut `sale`)
- Auto-detection : si la sous-categorie est dans `SUBCATEGORIES_FORCE_RENT`, forcer `rent` ; si dans `SUBCATEGORIES_FORCE_SALE`, forcer `sale`
- Pour les autres sous-categories des categories eligibles, afficher un selecteur **Vente / Location** dans l'etape Details
- Quand `listing_type = 'rent'` : le label "Prix" devient "Prix / mois" (ou "Loyer")
- Sauvegarder `listing_type` dans l'insert/update

### 4. Mise a jour `src/components/ListingCard.tsx`

- Afficher un badge "Location" (ou icone) quand `listing_type === 'rent'`
- Afficher "/mois" apres le prix pour les locations

### 5. Mise a jour `src/pages/Browse.tsx`

- Ajouter un filtre "Vente / Location / Tous" dans les filtres
- Filtrer les resultats par `listing_type`

### 6. Mise a jour `src/pages/ListingDetail.tsx`

- Afficher le type d'annonce (Vente ou Location)
- Adapter l'affichage du prix ("/mois" pour location)

### 7. i18n (12 langues)

Ajouter les cles suivantes dans chaque fichier de traduction :
- `listingType.sale` / `listingType.rent`
- `createListing.listingTypeLabel`
- `createListing.rentPriceLabel` (Loyer mensuel)
- `filters.listingType` / `filters.allTypes`
- `listing.perMonth`
- `listing.rental` (badge)

---

## Fichiers a modifier

| Fichier | Action |
|---------|--------|
| `supabase/migrations/...` | Ajouter colonne `listing_type` |
| `src/lib/constants.ts` | Constantes LISTING_TYPES, CATEGORIES_WITH_RENTAL, etc. |
| `src/pages/CreateListing.tsx` | Selecteur vente/location + auto-detection + label prix adapte |
| `src/components/ListingCard.tsx` | Badge "Location" + "/mois" |
| `src/components/ListingCardSmall.tsx` | Idem |
| `src/pages/Browse.tsx` | Filtre listing_type |
| `src/pages/ListingDetail.tsx` | Affichage type + prix adapte |
| 12 fichiers `src/i18n/translations/*.json` | Nouvelles cles |

