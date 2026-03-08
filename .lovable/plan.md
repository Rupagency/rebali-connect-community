

# Phase 2 : Affichage Vente/Location (ListingCard, Browse, ListingDetail)

Les traductions sont deja en place dans les 12 langues. Il reste a afficher le type d'annonce dans les composants d'affichage et a ajouter le filtre dans Browse.

---

## 1. `src/components/ListingCard.tsx`
- Ajouter `listing_type?: string` dans l'interface
- Afficher un badge "Location" (couleur distincte, ex. violet/indigo) quand `listing_type === 'rent'`
- Ajouter "/mois" apres le prix pour les locations

## 2. `src/components/ListingCardSmall.tsx`
- Meme logique : badge + suffixe "/mois"

## 3. `src/pages/Browse.tsx`
- Ajouter un state `listingType` (defaut `'all'`)
- Ajouter un Select filtre "Vente / Location / Tous" dans la barre de filtres
- Passer `listing_type` dans la query Supabase (`.eq('listing_type', ...)` si pas `all`)
- Ajouter `listing_type` dans le queryKey et les params URL
- Integrer dans `clearFilters` et `hasFilters`

## 4. `src/pages/ListingDetail.tsx`
- Afficher le type (badge "Location" ou "Vente") dans la section titre/prix
- Afficher "/mois" apres le prix si `listing_type === 'rent'`

---

## Fichiers modifies
| Fichier | Changement |
|---------|-----------|
| `src/components/ListingCard.tsx` | Badge + suffixe prix |
| `src/components/ListingCardSmall.tsx` | Badge + suffixe prix |
| `src/pages/Browse.tsx` | Filtre listing_type + query |
| `src/pages/ListingDetail.tsx` | Badge + suffixe prix |

Aucune migration DB ni modification i18n necessaire (deja fait).

