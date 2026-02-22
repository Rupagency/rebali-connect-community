
# Traduction automatique des messages WhatsApp relaye

## Probleme
Quand un acheteur envoie un message en francais a un vendeur indonesien, le vendeur recoit le message en francais. Le message devrait etre traduit dans la langue preferee du destinataire.

## Solution
Modifier la fonction `wa-webhook` (edge function) pour :
1. Recuperer la langue preferee (`preferred_lang`) du destinataire depuis son profil
2. Detecter la langue du message envoye (via la langue preferee de l'expediteur)
3. Si les langues different, traduire le message avant de le relayer via Fonnte

## Modifications

### `supabase/functions/wa-webhook/index.ts`

**Ajouter une fonction `translateText`** -- La meme que celle deja utilisee dans `translate-listing/index.ts`, qui utilise l'API gratuite Google Translate :
```
async function translateText(text, targetLang, sourceLang): Promise<string>
```

**Modifier `handleRelay`** pour :
- Recuperer le profil du destinataire (deja fait partiellement) et en extraire `preferred_lang`
- Recuperer le `preferred_lang` de l'expediteur aussi
- Si les deux langues sont differentes, appeler `translateText(message, recipientLang, senderLang)` avant d'envoyer
- Le message original est toujours sauvegarde tel quel dans la table `messages`
- Seul le message envoye via Fonnte est traduit

**Traduire aussi le suffixe anti-arnaque** -- Le `SAFETY_SUFFIX` sera traduit dans la langue du destinataire. On ajoutera un objet avec les traductions pre-definies du disclaimer dans les 12 langues.

### Pas de changement cote frontend
Tout se passe dans l'edge function. Le selecteur de langue de l'app influence deja `preferred_lang` dans le profil utilisateur.

## Details techniques

Dans la fonction `handleRelay`, les profils de l'acheteur et du vendeur sont deja recuperes pour obtenir le numero de telephone. On va simplement ajouter `preferred_lang` aux champs selectionnes.

Le flux sera :
1. L'acheteur envoie "Bonjour, cet article est-il disponible ?" (preferred_lang = fr)
2. Le webhook recupere le profil du vendeur (preferred_lang = id)
3. Le message est traduit en indonesien via Google Translate
4. Le vendeur recoit : "Halo, apakah barang ini tersedia?" + disclaimer en indonesien
5. Le message original en francais est sauvegarde dans la base de donnees

Le `SAFETY_SUFFIX` sera remplace par un objet `SAFETY_SUFFIXES` contenant les 12 traductions pre-ecrites pour eviter un appel API supplementaire a chaque message.
