# Thrall — l'appli de ton IA locale

Appli de discussion façon ChatGPT pour ton Open WebUI (Thrall, ses 13 agents, la recherche web).
Un seul code pour **Windows** (Tauri) et **iPhone** (Capacitor).

## Ce que fait l'appli

- Connexion à ton Open WebUI (e-mail + mot de passe, ou clé API). Le jeton reste dans le coffre de l'appareil
  (Gestionnaire d'identifiants Windows / Trousseau iOS).
- Conversations multiples, **synchronisées avec Open WebUI** : les mêmes sur le PC, l'iPhone et le site.
  Recherche, épingler, renommer, supprimer.
- Réponse en direct (streaming), bouton Stop, Régénérer, Modifier le dernier message, Copier.
- Choix de l'agent ou du modèle (Thrall en premier par défaut).
- Bouton **Recherche** (recherche web via SearXNG).
- Pièces jointes : photos (appareil photo ou galerie sur iPhone, réduites avant envoi) et fichiers (PDF, texte… analysés par Open WebUI).
  Glisser-déposer et coller sur PC.
- Dictée : bouton micro (transcription par Open WebUI). Le micro du clavier iPhone et Win+H marchent aussi.
- Markdown, tableaux, code coloré avec bouton Copier, réflexion du modèle repliable.
- Thèmes **⚔ Horde** (lave) et **⚔ Alliance** (aurore), dans Réglages.

## Installer sur Windows

1. Sur GitHub, onglet **Releases** (ou **Actions › Windows › dernier run › Artifacts**).
2. Télécharge `Thrall_x.y.z_x64-setup.exe` et lance-le. Pas besoin d'être admin.
3. Windows SmartScreen peut dire « application non reconnue » (l'appli n'est pas signée) :
   clique **Informations complémentaires › Exécuter quand même**.

## Installer sur iPhone (gratuit, avec Sideloadly)

1. Sur le PC : installe **iTunes** (version du site Apple, pas celle du Microsoft Store) puis **Sideloadly** (sideloadly.io).
2. Télécharge `Thrall.ipa` (Releases ou Actions › iPhone › Artifacts).
3. Branche l'iPhone en USB, ouvre Sideloadly, glisse `Thrall.ipa`, mets ton identifiant Apple, clique **Start**.
4. Sur l'iPhone : **Réglages › Général › VPN et gestion de l'appareil** › ton identifiant › **Faire confiance**.
   Sur iOS 16 et plus, active aussi **Réglages › Confidentialité et sécurité › Mode développeur** (redémarrage).
5. L'appli expire au bout de **7 jours** : relance Sideloadly (ou active son « auto-refresh » en wifi).

Avec un compte **Apple Developer (99 €/an)**, on passe par TestFlight : plus d'expiration à 7 jours, mises à jour en un clic.

## Réglages côté serveur

- L'appli appelle `https://thrall-ia.duckdns.org` depuis les origines `http://tauri.localhost` (Windows)
  et `capacitor://localhost` (iPhone). Si `CORS_ALLOW_ORIGIN` est réglé dans Open WebUI, il doit les autoriser.
- Dictée : Open WebUI › Réglages admin › Audio › Speech-to-Text (Whisper local).
- Photos : il faut un modèle qui « voit » (ex. `qwen2.5vl:3b`) ; qwen3:8b ne lit pas les images.

## Pour les développeurs

```bash
npm install
npm run dev              # interface dans le navigateur
npm run tauri dev        # appli Windows (sur un PC avec Rust)
npm run ios:sync         # met à jour le projet iOS (ios/App)
```

Builds automatiques : `.github/workflows/windows.yml` et `ios.yml` (lancés à la main dans Actions, ou en poussant un tag `v0.1.0`).
