
# Ajout d'un rappel anti-arnaque dans les messages WhatsApp

## Objectif
Ajouter un petit texte de prevention a la fin de chaque message relaye par WhatsApp, rappelant aux acheteurs et vendeurs que :
- Les transactions se font sous leur seule responsabilite
- Re-Bali est une plateforme de mise en relation uniquement
- Conseils basiques anti-scam (verifier avant de payer, se rencontrer en lieu sur, etc.)

## Modification

**Fichier** : `supabase/functions/wa-webhook/index.ts`

Dans la fonction `handleRelay`, au moment de l'envoi du message relaye (ligne 375-376), ajouter un footer de prevention apres le contenu du message :

```
📦 Re-Bali (Titre de l'annonce):
[message]

---
⚠️ Re-Bali ne gere aucune transaction. Acheteur et vendeur sont seuls responsables. Ne payez jamais avant d'avoir vu l'article. Rencontrez-vous dans un lieu public.
```

Le texte sera court, professionnel et bilingue (anglais/francais) ou en anglais uniquement pour rester concis. Il sera ajoute uniquement aux messages relayes entre acheteur et vendeur, pas aux messages systeme (unlock, blocked, etc.).

## Details techniques

- Modifier la constante `prefix` et ajouter un `suffix` de prevention a la ligne 376
- Le suffix sera une constante definie en haut du fichier pour faciliter la maintenance
- Les messages systeme (unlock, ban, blocked content) ne seront pas affectes
- Le message d'unlock conservera son format actuel sans le disclaimer (c'est deja un message systeme)
