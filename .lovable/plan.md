
# Chiffrement des documents d'identite + Suppression apres retention

## Contexte

Les documents d'identite (KTP/passeport + selfie) sont actuellement stockes en clair dans le bucket prive `id-verifications`. Bien que les RLS limitent l'acces aux admins, les fichiers restent vulnerables en cas de compromission du storage. L'objectif est de chiffrer les fichiers avant upload et de ne les dechiffrer que quand l'admin a besoin de les consulter.

## Architecture

Le chiffrement se fait cote serveur via une edge function pour que la cle secrete ne transite jamais cote client :

1. Le client envoie le fichier brut a une edge function `encrypt-document`
2. L'edge function chiffre le fichier avec AES-256-GCM en utilisant un secret `VAULT_ENCRYPTION_KEY`
3. Le fichier chiffre est uploade dans le bucket `id-verifications`
4. Pour la consultation admin, une edge function `decrypt-document` dechiffre et renvoie le fichier

## 1. Secret de chiffrement

Ajouter un secret `VAULT_ENCRYPTION_KEY` dans les secrets Supabase Edge Functions. Ce sera une cle AES-256 (32 bytes en base64).

## 2. Edge Function `encrypt-upload`

Recoit le fichier + metadata (user_id, type document/selfie, document_type), chiffre avec AES-256-GCM, uploade dans le bucket, et insere dans `id_verifications`.

- Authentification requise (verifie le JWT)
- Verifie que le user_id du JWT correspond
- Genere un IV aleatoire, stocke IV+ciphertext ensemble
- Limite la taille a 5MB

## 3. Edge Function `decrypt-document`

Reservee aux admins : recoit le storage_path, telecharge le fichier chiffre, dechiffre, et renvoie le contenu en reponse.

- Verifie que l'appelant a le role `admin`
- Telecharge depuis le bucket prive avec le service role
- Dechiffre et retourne le fichier avec le bon Content-Type

## 4. Modification de Profile.tsx

Remplacer l'upload direct au bucket par un appel a `supabase.functions.invoke('encrypt-upload')` avec les fichiers en FormData.

## 5. Modification de Admin.tsx

La section verification qui affiche les documents doit appeler `decrypt-document` pour obtenir les images dechiffrees au lieu de lire directement depuis le storage.

## 6. Politique de retention (optionnel futur)

Ajouter une colonne `documents_purged_at` dans `id_verifications`. Apres approbation/rejet, un cron ou une action manuelle pourra supprimer les fichiers du storage et marquer la date de purge. Cela n'est pas implemente dans cette iteration mais la structure le permet.

---

## Details techniques

| Fichier | Modification |
|---|---|
| `supabase/functions/encrypt-upload/index.ts` | Nouvelle edge function : chiffre + upload + insert |
| `supabase/functions/decrypt-document/index.ts` | Nouvelle edge function : dechiffre + retourne le fichier |
| `supabase/config.toml` | Ajouter les 2 fonctions avec `verify_jwt = false` |
| `src/pages/Profile.tsx` | Remplacer l'upload direct par appel a `encrypt-upload` |
| `src/pages/Admin.tsx` | Charger les images via `decrypt-document` au lieu du storage direct |

### Format du fichier chiffre

Le fichier stocke dans le bucket contiendra :
- 12 premiers bytes : IV (Initialization Vector)
- Reste : ciphertext AES-256-GCM (inclut le tag d'authentification)

### Secret requis

`VAULT_ENCRYPTION_KEY` : cle AES-256 encodee en base64 (32 bytes = 44 caracteres en base64). Generee une fois et ajoutee dans les secrets Supabase.

### Flux upload (Profile)

```text
Client                    encrypt-upload              Supabase Storage
  |                            |                            |
  |-- POST fichier + meta ---->|                            |
  |                            |-- chiffre AES-256-GCM ---->|
  |                            |-- upload blob chiffre ---->|
  |                            |-- insert id_verifications  |
  |<--- 200 OK ---------------|                            |
```

### Flux consultation (Admin)

```text
Admin                    decrypt-document             Supabase Storage
  |                            |                            |
  |-- POST storage_path ------>|                            |
  |                            |-- verifie role admin       |
  |                            |-- telecharge blob -------->|
  |                            |<-- blob chiffre -----------|
  |                            |-- dechiffre AES-256-GCM    |
  |<--- image dechiffree -----|                            |
```
