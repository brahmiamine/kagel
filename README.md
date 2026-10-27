# Kagel — minuteur de Kegel

Application Next.js + TypeScript dédiée aux séances guidées de contraction et de relaxation. 100 % statique, sans compte ni serveur. Installable en PWA.

## Fonctionnalités

- 3 programmes et 8 séances prédéfinies (durées et répétitions personnalisables)
- Minuteur fiable même après retour d'un onglet en arrière-plan
- Démarrer, pause, reprendre, passer une phase, réinitialiser
- Signal sonore, vibration selon le navigateur, progression en direct, compteur manuel
- Réglages mémorisés dans le navigateur (migration automatique de l'ancien format localStorage)
- Responsive, mode hors ligne après une première visite en ligne
- Icônes 192/512 px, icône iOS, splash screen iOS et écran de lancement Android via manifest

**Précaution :** les exercices décrits sont indicatifs, pas un programme médical. Arrêtez en cas de douleur et demandez conseil à un professionnel de santé.

## Démarrer en local

Node.js 22 ou plus récent :

    npm install
    npm run dev

Tester et construire :

    npm test
    npm run build
    npm run typecheck

Le site statique se trouve dans le répertoire out/. Les images PWA et le manifest sont générés par scripts/generate-pwa-assets.mjs avant le build.

## GitLab Pages

1. Importer ou mirrorer ce dépôt GitHub dans un projet GitLab.
2. Activer GitLab CI/CD et Pages sur ce projet ; vérifier que les runners sont disponibles.
3. Pousser le code sur la branche par défaut du dépôt GitLab.
4. La tâche deploy-pages construit Next.js et publie automatiquement out/ sur GitLab Pages.
5. Retrouver l'URL exacte dans **Deploy > Pages**.

La configuration détecte automatiquement le chemin de CI_PAGES_URL, que GitLab Pages serve le projet sur le domaine racine, un sous-chemin /kagel ou un domaine personnalisé. Si nécessaire, définir NEXT_PUBLIC_BASE_PATH manuellement au build (`/kagel` ou chaîne vide).

### PWA

- Android / Chrome : menu « Installer l'application ».
- iOS / Safari : Partager > Sur l'écran d'accueil.
- Android utilise les icônes du manifest pour l'écran de lancement ; iOS utilise les images apple-touch-startup-image aux tailles compatibles.
- L'accès hors ligne nécessite au moins une première visite connectée, et dépend des capacités du navigateur.

**Important :** le dépôt source est sur GitHub ; le fichier .gitlab-ci.yml ne déclenche pas un déploiement GitLab tant qu'aucun dépôt GitLab n'est relié et que son pipeline n'a pas tourné.
