

## Analyse de l'existant et plan d'action

### Ce qui existe deja

| Feature | Statut |
|---------|--------|
| **Partage social** | Boutons WhatsApp + Facebook + Copier lien deja presents sur ListingDetail |
| **OG dynamique** | Edge function `og-listing` operationnelle avec detection de bots |
| **Rate limiting** | Implemente sur OTP (3/15min), Xendit (5/h, 20/j), OTP daily limits |
| **NotificationBell** | Existe mais ne montre que les `search_notifications` (alertes de recherche) |
| **Push notifications** | Infrastructure PWA en place (VAPID, service worker, edge function) |

### Ce qui manque reellement

1. **Emails transactionnels** — Reporte a plus tard (config Resend)
2. **Analytics / evenements** — Aucun tracking de retention
3. **Centre de notifications enrichi** — Le bell ne montre que les recherches sauvegardees, pas les messages, deals, badges
4. **Landing page / Waitlist** — Rien n'existe
5. **Page FAQ** — Rien n'existe

### Plan d'implementation (par priorite de lancement)

---

### 1. Page FAQ multilingue

- Creer `src/pages/FAQ.tsx` avec un composant Accordion (Radix)
- Sections : Fonctionnement, Securite, Paiements, Verification, Compte
- Ajouter les traductions dans les 12 fichiers i18n
- Ajouter la route `/faq` dans App.tsx et un lien dans le Footer

### 2. Centre de notifications in-app enrichi

Actuellement le `NotificationBell` ne query que `search_notifications`. Il faut l'enrichir pour inclure :
- **Messages non lus** : query `messages` via `conversations` (deja un RPC `get_total_unread_messages`)
- **Deals conclus** : query `conversations` ou `deal_closed = true AND buyer_confirmed = true`
- **Badges gagnes** : query `user_addons` recents

Approche : modifier `NotificationBell.tsx` pour combiner plusieurs sources en une liste unifiee triee par date, avec des icones distinctes par type (MessageCircle, Handshake, Award).

### 3. Analytics / tracking evenements

Creer une table `analytics_events` pour tracker les evenements cles :
- `signup`, `listing_created`, `deal_closed`, `message_sent`, `search`
- Colonnes : `id`, `event_type`, `user_id`, `metadata (jsonb)`, `created_at`
- Ajouter un helper `trackEvent()` cote client
- Ajouter un widget dashboard dans la page Admin avec des compteurs par jour (Recharts)

Migration SQL :
```sql
CREATE TABLE public.analytics_events (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  event_type text NOT NULL,
  user_id uuid REFERENCES auth.users(id) ON DELETE SET NULL,
  metadata jsonb DEFAULT '{}',
  created_at timestamptz NOT NULL DEFAULT now()
);
ALTER TABLE public.analytics_events ENABLE ROW LEVEL SECURITY;
CREATE POLICY "Admins can view analytics" ON public.analytics_events
  FOR SELECT TO authenticated USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Authenticated can insert events" ON public.analytics_events
  FOR INSERT TO authenticated WITH CHECK (user_id = auth.uid());
CREATE INDEX idx_analytics_event_type ON public.analytics_events(event_type, created_at);
```

### 4. Landing page "Coming Soon" / Waitlist

- Creer `src/pages/ComingSoon.tsx` avec :
  - Compteur a rebours (date du 1er avril)
  - Champ email pour inscription waitlist
  - Teaser visuel avec le branding Re-Bali
- Table `waitlist` : `id`, `email`, `created_at`
- Route `/coming-soon` optionnellement utilisable comme page d'accueil temporaire

### 5. Partage social — deja fait

Les boutons WhatsApp, Facebook et Copier le lien sont deja presents sur `ListingDetail.tsx`. Pas d'action necessaire. L'OG dynamique est aussi en place via `og-listing`.

### 6. Rate limiting — deja en place

Le rate limiting est deja implemente sur les fonctions critiques (OTP, paiements). Pour les messages, la validation de contenu (`check_message_content` trigger) et le compteur de messages par conversation servent de protection anti-spam.

---

### Ordre d'implementation suggere

1. Page FAQ (rapide, fort impact UX)
2. Centre de notifications enrichi (retention)
3. Analytics events (mesure du lancement)
4. Landing page Coming Soon (buzz pre-lancement)

### Fichiers a creer/modifier

| Action | Fichier |
|--------|---------|
| Creer | `src/pages/FAQ.tsx` |
| Creer | `src/pages/ComingSoon.tsx` |
| Modifier | `src/components/NotificationBell.tsx` |
| Modifier | `src/App.tsx` (routes) |
| Modifier | `src/components/Footer.tsx` (lien FAQ) |
| Modifier | `src/pages/Admin.tsx` (widget analytics) |
| Creer | `src/lib/analytics.ts` (helper trackEvent) |
| Modifier | 12 fichiers i18n (traductions FAQ) |
| Migration | Table `analytics_events` + table `waitlist` |

