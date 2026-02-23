

# Chat in-app comme canal principal, WhatsApp en notification

## Contexte actuel
- Le chat in-app existe deja (page `/messages`, table `messages`, realtime Supabase)
- Le CTA principal sur les annonces est "Contact WhatsApp" qui ouvre `wa.me` avec un token
- Le webhook `wa-webhook` relaie les messages dans les deux sens via Fonnte
- Un bouton secondaire "Envoyer un message" existe deja et cree une conversation in-app

## Nouvelle approche
WhatsApp devient un **canal de notification uniquement**. Les messages sont ecrits et lus dans l'app. WhatsApp sert juste a prevenir l'utilisateur qu'il a recu un message, avec un lien pour y repondre dans l'app.

## Stockage
100 000 messages texte = environ 20 Mo en base de donnees. Meme avec des centaines de milliers de messages, le cout reste negligeable (quelques centimes/mois sur Supabase). Pas de souci de stockage.

## Changements prevus

### 1. Page ListingDetail.tsx : inverser les CTA
- Le bouton principal devient **"Envoyer un message"** (chat in-app) au lieu de "Contact WhatsApp"
- Supprimer le bouton WhatsApp comme CTA principal
- Le bouton WhatsApp peut rester en option secondaire pour les utilisateurs qui le preferent, ou etre retire completement

### 2. Webhook wa-webhook/index.ts : mode notification
Quand un message est envoye dans le chat in-app, une notification WhatsApp est envoyee au destinataire :
- Format : "Vous avez recu un message sur Re-Bali pour [Titre annonce]. Repondez ici : https://rebali-connect-community.lovable.app/messages?conv=XXX"
- Le webhook garde sa logique existante pour les messages WhatsApp entrants (retrocompatibilite) mais le flux principal passe par l'app

### 3. Nouveau trigger ou logique de notification
Quand un message est insere dans la table `messages` via l'app, envoyer une notification WhatsApp au destinataire. Deux options :
- **Option A** : Un trigger de base de donnees qui appelle une edge function
- **Option B** : Appeler la notification depuis le frontend apres l'envoi du message (plus simple)

On choisira l'**Option B** : apres l'insertion d'un message dans `Messages.tsx`, appeler une nouvelle edge function `notify-whatsapp` qui envoie la notification.

### 4. Nouvelle edge function : notify-whatsapp
- Recoit : `conversation_id`, `sender_id`, `message_preview`
- Cherche le destinataire et son numero WhatsApp
- Envoie via Fonnte un message court avec lien vers la conversation
- Pas de relai du contenu complet (juste une notification)

### 5. Conserver la retrocompatibilite du webhook
Le webhook `wa-webhook` existant continue de fonctionner pour les messages WhatsApp entrants. Si quelqu'un repond par WhatsApp, le message est quand meme insere dans la table `messages` et visible dans le chat in-app. Cela permet une transition en douceur.

---

## Details techniques

### Fichiers modifies

| Fichier | Modification |
|---|---|
| `src/pages/ListingDetail.tsx` | Inverser les CTA : "Envoyer un message" devient principal, WhatsApp devient secondaire ou supprime |
| `src/pages/Messages.tsx` | Apres envoi d'un message, appeler `notify-whatsapp` pour notifier le destinataire |
| `supabase/functions/notify-whatsapp/index.ts` | Nouvelle edge function : envoie une notification WhatsApp avec lien vers le chat |
| `supabase/config.toml` | Ajouter la config pour la nouvelle edge function |

### Format de la notification WhatsApp

```
Nouveau message Re-Bali pour "Surfboard 6'2" :
"Bonjour, est-elle encore disponible ?"

Repondez ici : https://rebali-connect-community.lovable.app/messages?conv=XXX
```

### Avantages
- Plus besoin de codes #A, #B, #C
- UX naturelle : on lit et repond dans l'app
- WhatsApp reste utile comme notification push
- Pas de probleme de routage multi-conversations
- Stockage negligeable

