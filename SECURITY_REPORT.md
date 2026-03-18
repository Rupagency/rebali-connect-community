# 🔒 Rapport de Sécurité — Rebali Community

**Date :** 18 mars 2026  
**Statut global :** ✅ Sécurisé (avec 1 action manuelle restante)

---

## 1. Résumé exécutif

L'audit de sécurité complet a couvert les politiques RLS sur **28 tables**, **3 storage buckets**, les **Edge Functions**, et la configuration d'authentification. Trois findings ont été identifiés et traités.

| # | Finding | Sévérité | Statut |
|---|---------|----------|--------|
| 1 | Policy UPDATE permissive sur `business_pages` | Moyenne | ✅ Corrigé |
| 2 | Leaked password protection désactivée | Basse | ⚠️ Action manuelle requise |
| 3 | Vue `public_profiles` sans `security_invoker` | Basse | ✅ Faux positif confirmé |

---

## 2. Corrections appliquées

### 2.1 Hardening RLS — `messages` (UPDATE)

**Problème :** La policy UPDATE permettait de modifier tous les champs d'un message.  
**Correction :** Ajout d'une clause `WITH CHECK` verrouillant les champs immuables :
- `content`, `sender_id`, `conversation_id`, `from_role`, `created_at`
- Seul le champ `read` peut être modifié (mark-as-read)

### 2.2 Hardening RLS — `conversations` (UPDATE)

**Problème :** La policy UPDATE pour les participants ne protégeait pas les champs système.  
**Correction :** Clause `WITH CHECK` verrouillant **tous** les champs sensibles :
- `deal_closed`, `buyer_confirmed`, `deal_closed_by`, `deal_closed_at`, `buyer_confirmed_at`
- `buyer_phone`, `buyer_id`, `seller_id`, `listing_id`
- `unlocked`, `unlocked_at`, `relay_status`
- `buyer_short_code`, `seller_short_code`
- `total_msg_count`, `buyer_msg_count`, `seller_msg_count`

> Les opérations de deal (close/confirm) passent par des fonctions `SECURITY DEFINER` (`close_deal`, `confirm_deal`).

### 2.3 Hardening RLS — `profiles` (UPDATE)

**Problème :** Les utilisateurs pouvaient modifier leurs propres champs admin-only.  
**Correction :** Clause `WITH CHECK` verrouillant :
- `is_banned`, `is_verified_seller`, `trust_score`, `risk_level`
- `listing_limit_override`, `phone_verified`, `referral_code`, `referred_by`

### 2.4 Hardening RLS — `business_pages` (UPDATE)

**Problème :** Pas de `WITH CHECK` → transfert de propriété possible.  
**Correction :** Ajout `WITH CHECK` empêchant la modification de `user_id`.

### 2.5 Hardening RLS — `reviews` (UPDATE)

**Correction :** Clause `WITH CHECK` verrouillant :
- `reviewed_user_id`, `seller_id`, `conversation_id`, `listing_id`, `is_verified_purchase`

---

## 3. Edge Functions — Sécurité serveur

### Validation JWT (anti-spoofing)

Les Edge Functions critiques extraient l'ID utilisateur directement du JWT (`auth.uid()`) et **ignorent** tout `user_id` envoyé dans le body :

| Function | Protection |
|----------|-----------|
| `log-device` | JWT uid extraction |
| `send-otp` | JWT uid extraction |
| `verify-otp` | JWT uid extraction |
| `expire-addons` | Clé `SUPABASE_SERVICE_ROLE_KEY` requise |

### Validation de contenu

- **Trigger `check_message_content`** : Bloque URLs, numéros de téléphone, liens messagerie dans les messages
- **Fonction `validate_content`** : Nettoyage des prix indonésiens avant détection de patterns téléphoniques

---

## 4. Storage Buckets

| Bucket | Visibilité | SELECT | INSERT | UPDATE | DELETE |
|--------|-----------|--------|--------|--------|--------|
| `listings` | Public | ✅ Tous | ✅ Owner (auth.uid) | ✅ Owner | ✅ Owner |
| `avatars` | Public | ✅ Tous | ✅ Owner | ✅ Owner | ✅ Owner |
| `id-verifications` | **Privé** | ✅ Owner + Admin | ✅ Owner | ❌ Bloqué | ❌ Bloqué |

> Les documents d'identité sont purgés automatiquement par l'Edge Function `purge-expired-docs` (service_role).

---

## 5. Tables sans accès client (service_role only)

Ces tables n'ont aucune policy INSERT/UPDATE/DELETE côté client — toutes les mutations passent par des fonctions `SECURITY DEFINER` ou des Edge Functions avec `service_role` :

| Table | Opérations bloquées |
|-------|-------------------|
| `phone_verifications` | INSERT, UPDATE, DELETE |
| `point_transactions` | INSERT, UPDATE, DELETE |
| `pro_boost_purchases` | INSERT, UPDATE, DELETE |
| `trust_scores` | INSERT, UPDATE, DELETE |
| `user_addons` | INSERT, UPDATE, DELETE |
| `user_devices` | INSERT, UPDATE, DELETE |
| `risk_events` | INSERT, UPDATE, DELETE |
| `referrals` | INSERT, UPDATE, DELETE |

---

## 6. Fonctions SECURITY DEFINER

Toutes les fonctions sensibles utilisent `SECURITY DEFINER` avec `SET search_path = public` :

| Fonction | Usage |
|----------|-------|
| `has_role` | Vérification rôle admin/moderator (anti-récursion RLS) |
| `close_deal` | Fermeture de deal (seller only) |
| `confirm_deal` | Confirmation acheteur |
| `check_listing_limit` | Trigger limite d'annonces |
| `auto_moderate_reports` | Archivage auto après 3 signalements scam/24h |
| `validate_content` | Filtre anti-contact dans messages |
| `increment_views` | Compteur de vues |
| `get_total_unread_messages` | Compteur non-lus |
| `get_completed_deals_count` | Stats agrégées publiques |

---

## 7. Protection des données personnelles (PII)

- **Vue `public_profiles`** : Expose uniquement `id`, `display_name`, `avatar_url`, `created_at`, `is_verified_seller`, `phone_verified`, `user_type`
  - Configurée avec `security_invoker = true`
  - Exclut : `phone`, `whatsapp`, `risk_level`, `trust_score`, `is_banned`, `referral_code`
- **Table `profiles`** : SELECT restreint à `auth.uid() = id` ou admin
- **Table `id_verifications`** : Documents chiffrés, purge automatique, accès admin uniquement

---

## 8. Protections anti-abus

| Mesure | Détail |
|--------|--------|
| Limite d'annonces | 3 (< 7 jours) → 5 (privé) → 20/∞ (pro) |
| Numéro unique | Un téléphone par compte |
| Device fingerprint | Empreinte + IP stockées à l'inscription |
| Device ban | Blocage matériel en cas de fraude |
| Auto-modération | 3 signalements scam/24h → archivage + risk_level = high |
| Rate limit send-otp | 3/15min + 10/jour/user + 5/jour/phone |
| Rate limit send-contact | 5/15min par IP + validation inputs (email, longueur, catégorie) |
| Content filter | URLs, téléphones, liens messagerie bloqués dans messages |
| Duplicate image | Hash d'image pour détecter les annonces copiées |

---

## 9. Action manuelle restante

### ⚠️ Activer "Leaked Password Protection"

**Où :** Supabase Dashboard → Authentication → Settings → Security  
**Impact :** Empêche l'utilisation de mots de passe compromis connus (base HaveIBeenPwned)  
**Risque actuel :** Bas — les utilisateurs peuvent choisir des mots de passe faibles/compromis

---

## 10. Recommandations futures

1. **Rate limiting** sur les Edge Functions exposées (send-otp, send-contact)
2. **Audit logging** des actions admin sensibles (déjà en place via `admin_logs`)
3. **Rotation des secrets** (VAPID keys, SMTP credentials) selon un calendrier régulier
4. **Monitoring** des risk_events pour alertes temps réel
