

# Plan: Notifications Push exhaustives pour toutes les etapes

## Analyse de l'existant

Notifications push actuellement en place :
1. **Nouveau message** (notify-whatsapp) -- push + WhatsApp
2. **Nouveau favori** (notify-favorite) -- push
3. **Alerte recherche sauvegardee** (notify-saved-searches) -- push + WhatsApp

Notifications **manquantes** identifiees :

## Nouvelles notifications a implementer

### 1. Deal closed -- notifier l'acheteur
Quand le vendeur ferme un deal, l'acheteur recoit une push notification l'invitant a confirmer.
- Declenchement : dans `Messages.tsx` apres le `close_deal`
- Push vers : `buyer_id`

### 2. Deal confirmed -- notifier le vendeur
Quand l'acheteur confirme le deal, le vendeur recoit une push.
- Declenchement : dans `Messages.tsx` apres `handleBuyerConfirm`
- Push vers : `seller_id`

### 3. Nouvelle conversation -- notifier le vendeur
Quand un acheteur demarre une conversation sur une annonce, le vendeur recoit une push.
- Declenchement : dans `ListingDetail.tsx` apres l'insert de conversation
- Push vers : `seller_id`

### 4. Listing expire -- notifier le vendeur
Quand une annonce est archivee automatiquement (30 jours), notifier le vendeur.
- Declenchement : dans `expire-listings` edge function
- Push vers : chaque `seller_id` des annonces expirees

### 5. Deal expire (auto-close 7j) -- notifier les 2 parties
Quand un deal non confirme est ferme automatiquement apres 7 jours.
- Declenchement : dans `close-expired-deals` edge function
- Push vers : `buyer_id` et `seller_id`

### 6. Rappel de confirmation de deal (J+3)
Un CRON job quotidien qui rappelle a l'acheteur de confirmer un deal ouvert depuis plus de 3 jours.
- Nouvelle edge function : `remind-deal-confirmation`
- Push vers : `buyer_id`

### 7. Nouvelle review recue -- notifier le vendeur
Quand un avis est laisse, notifier la personne evaluee.
- Declenchement : dans `Messages.tsx` apres `handleSubmitRating`
- Push vers : `reviewed_user_id`

## Implementation technique

### A. Nouvelle edge function : `notify-event`
Une edge function generique pour envoyer des notifications push pour tous les evenements transactionnels (deal close, deal confirm, new conversation, review, expiration, rappels). Elle accepte un `event_type` et route vers les bons templates traduits dans les 12 langues.

Parametres : `{ event_type, user_id, data: { listing_title, sender_name, conversation_id, ... } }`

Templates pre-traduits pour chaque `event_type` :
- `deal_closed` : "Le vendeur a cloture la transaction"
- `deal_confirmed` : "L'acheteur a confirme la transaction"
- `new_conversation` : "Nouveau message pour votre annonce"
- `listing_expired` : "Votre annonce a expire"
- `deal_expired` : "Transaction fermee automatiquement"
- `deal_reminder` : "N'oubliez pas de confirmer votre transaction"
- `new_review` : "Vous avez recu un nouvel avis"

### B. Modifications client (Messages.tsx, ListingDetail.tsx)
Ajouter des appels `supabase.functions.invoke('notify-event', ...)` apres chaque action :
- Close deal -> notifier acheteur
- Confirm deal -> notifier vendeur
- New conversation -> notifier vendeur
- Submit review -> notifier personne evaluee

### C. Modifications edge functions existantes
- `expire-listings` : ajouter appel send-push pour chaque annonce expiree
- `close-expired-deals` : ajouter appel send-push pour buyer + seller

### D. Nouvelle edge function CRON : `remind-deal-confirmation`
- Cherche les deals ouverts depuis > 3 jours, non confirmes
- Envoie une push de rappel a l'acheteur
- Planifie via pg_cron (1x par jour)

### E. Configuration
- Ajouter `[functions.notify-event]` et `[functions.remind-deal-confirmation]` dans `config.toml` avec `verify_jwt = false`
- Creer le CRON job via SQL insert

### F. Traductions (12 langues)
Ajouter toutes les cles de traduction pour les 7 nouveaux types de notification dans les 12 fichiers JSON i18n (utilise cote serveur dans les templates pre-traduits de l'edge function).

