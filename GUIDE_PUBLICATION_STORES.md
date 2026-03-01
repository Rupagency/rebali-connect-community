# Guide complet — Publication Re-Bali sur iOS & Android (Mac)

## Prérequis à installer

```bash
# 1. Homebrew (gestionnaire de paquets Mac)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# 2. Node.js (si pas déjà installé)
brew install node

# 3. Xcode (depuis le Mac App Store — ~12 Go, c'est long)
#    Chercher "Xcode" dans l'App Store et installer

# 4. Après installation de Xcode, accepter la licence et installer les outils CLI
sudo xcode-select --switch /Applications/Xcode.app/Contents/Developer
sudo xcodebuild -license accept

# 5. CocoaPods (gestionnaire de dépendances iOS)
brew install cocoapods

# 6. Android Studio
brew install --cask android-studio
```

---

## Étape 1 — Cloner le projet et installer

```bash
git clone <URL_DU_REPO> rebali-connect-community
cd rebali-connect-community
npm install
```

Créer le fichier `.env` à la racine du projet avec les variables d'environnement
(demander le contenu à l'admin du projet, ne jamais le partager en clair).

---

## Étape 2 — Build + Sync

```bash
npm run build:mobile
```

Cette commande build le projet web et synchronise les fichiers vers les projets natifs iOS et Android.

---

## Étape 3A — Publication iOS (App Store)

### Ouvrir dans Xcode

```bash
npm run cap:open:ios
```

### Configurer le signing

1. Cliquer sur le projet **App** dans le panneau gauche de Xcode
2. Aller dans l'onglet **Signing & Capabilities**
3. Cocher **Automatically manage signing**
4. Sélectionner l'équipe (il faut un **compte Apple Developer** à 99$/an)
   - Créer un compte sur https://developer.apple.com/programs/
5. Le Bundle Identifier sera `com.rebali.app`

### Ajouter les icônes

1. Dans Xcode, ouvrir `Assets.xcassets` > `AppIcon`
2. Glisser les icônes aux bonnes tailles :
   - **1024x1024** — App Store
   - **180x180** — iPhone (3x)
   - **120x120** — iPhone (2x)
   - **167x167** — iPad Pro
   - **152x152** — iPad
3. Ou utiliser un générateur automatique : https://www.appicon.co/

### Tester sur simulateur

1. Sélectionner un iPhone dans la barre du haut (ex: "iPhone 15")
2. Cliquer le bouton **Play** (ou `Cmd + R`)
3. Vérifier que tout fonctionne correctement

### Archiver et uploader

1. Sélectionner **Any iOS Device** comme destination (pas un simulateur)
2. Menu **Product** > **Archive**
3. Une fois archivé, cliquer **Distribute App**
4. Choisir **App Store Connect**
5. Suivre les étapes et uploader

### Configurer sur App Store Connect

1. Aller sur https://appstoreconnect.apple.com
2. Créer une nouvelle app
3. Remplir les informations :
   - Nom de l'app
   - Description
   - Catégorie (Shopping / Lifestyle)
   - Screenshots (voir section Checklist ci-dessous)
   - URL politique de confidentialité : `https://re-bali.com/privacy`
4. Sélectionner le build uploadé depuis Xcode
5. Soumettre pour review

> **Délai review Apple** : 1 à 3 jours en général

---

## Étape 3B — Publication Android (Google Play)

### Ouvrir dans Android Studio

```bash
npm run cap:open:android
```

### Première ouverture

- Attendre la **sync Gradle** (peut prendre quelques minutes la première fois)
- Si Android Studio demande de mettre à jour le SDK, accepter

### Tester sur émulateur

1. Menu **Tools** > **Device Manager**
2. Créer un appareil virtuel (ex: Pixel 7, API 34)
3. Cliquer le bouton **Play** vert
4. Vérifier que tout fonctionne

### Générer la clé de signature

```bash
keytool -genkey -v -keystore rebali-release.keystore -alias rebali -keyalg RSA -keysize 2048 -validity 10000
```

> **IMPORTANT** : Sauvegarder le fichier `rebali-release.keystore` et le mot de passe
> dans un endroit sûr (gestionnaire de mots de passe). S'il est perdu, impossible
> de mettre à jour l'app sur le Play Store.

### Générer le build signé (AAB)

1. Menu **Build** > **Generate Signed Bundle / APK**
2. Choisir **Android App Bundle**
3. Sélectionner le keystore créé à l'étape précédente
4. Renseigner le mot de passe et l'alias (`rebali`)
5. Choisir **release**
6. Le fichier `.aab` sera généré dans `android/app/release/`

### Publier sur Google Play Console

1. Créer un compte sur https://play.google.com/console (25$ paiement unique)
2. Créer une nouvelle app
3. Remplir la fiche store :
   - Nom de l'app
   - Description courte (max 80 caractères)
   - Description longue (max 4000 caractères)
   - Icône 512x512
   - Screenshots
   - URL politique de confidentialité : `https://re-bali.com/privacy`
4. Section **Release** > **Production** > Uploader le fichier `.aab`
5. Remplir le questionnaire de contenu (classification PEGI, politique de confidentialité)
6. Soumettre pour review

> **Délai review Google** : quelques heures à 7 jours

---

## Checklist — Éléments à préparer

| Élément                          | iOS                              | Android                     |
|----------------------------------|----------------------------------|-----------------------------|
| Compte développeur               | Apple Developer (99$/an)         | Google Play Console (25$)   |
| Icône app                        | 1024x1024 PNG sans transparence  | 512x512 PNG                 |
| Screenshots téléphone            | 6.7" et 5.5" (iPhone)           | Téléphone                   |
| Screenshots tablette             | iPad (optionnel mais recommandé) | Tablette 7" (optionnel)     |
| URL politique de confidentialité | Obligatoire                      | Obligatoire                 |
| Description courte               | Sous-titre (max 30 car.)        | Max 80 caractères           |
| Description longue               | Max 4000 caractères              | Max 4000 caractères         |
| Catégorie                        | Shopping / Lifestyle             | Shopping / Lifestyle        |

---

## Commandes utiles au quotidien

```bash
# Build complet + sync vers iOS et Android
npm run build:mobile

# Sync sans rebuild (si seule la config native a changé)
npm run cap:sync

# Ouvrir dans Xcode
npm run cap:open:ios

# Ouvrir dans Android Studio
npm run cap:open:android

# Dev local (web uniquement)
npm run dev
```

---

## Mise à jour de l'app après modification du code

1. Faire les modifications dans le code source
2. Lancer `npm run build:mobile`
3. Dans Xcode : Product > Archive > Distribute
4. Dans Android Studio : Build > Generate Signed Bundle > Upload sur Play Console
5. Soumettre la nouvelle version pour review

---

## Informations techniques

- **App ID** : `com.rebali.app`
- **Répertoire web** : `dist/`
- **Config Capacitor** : `capacitor.config.ts`
- **Projet Android** : `android/`
- **Projet iOS** : `ios/`
