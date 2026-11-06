# Team T2 Collaborative Dashboard

Un tableau de bord collaboratif et interactif développé pour la **Team T2**. Cet outil permet à l'équipe de gérer ses projets, de suivre l'avancement, et de collaborer en temps réel avec un chat intégré et un système de "j'aime"/commentaires.

## 🚀 Fonctionnalités Principales

*   **Gestion de Projets:**
    *   Affichage des projets sous forme de carrousel ou de grille.
    *   Code couleur automatique pour le statut ("En cours", "En pause", "Clôturé").
    *   Barres de progression interactives (0-100%).
*   **Collaboration en Temps Réel:**
    *   **Chat d'équipe** intégré pour une communication fluide.
    *   Système de commentaires et de "likes" sur chaque projet.
    *   Résolution intelligente des conflits : l'architecture de sauvegarde par "diff" permet à plusieurs utilisateurs de modifier le tableau de bord simultanément sans écraser le travail des autres.
*   **Suivi de Charge de Travail (Workload):**
    *   Un curseur dans la barre latérale permet à chaque utilisateur de définir sa charge de travail (0-100%).
    *   Indicateur visuel dynamique : vert (<50%), jaune (50-80%), rouge (>80%).
*   **Accès Rapide aux Dossiers (Intranet/Q:):**
    *   Boutons permettant d'ouvrir directement les dossiers Windows associés aux projets depuis l'interface web (via un petit serveur Python local).
    *   Création intelligente : si un dossier existe mais pas le projet, l'application propose de le créer.
*   **Interface Moderne & Responsive:**
    *   Thème sombre/clair (Dark/Light mode).
    *   Menu latéral rétractable.
    *   UI/UX soignée avec Tailwind CSS, Framer Motion et Lucide Icons.

## 🛠️ Stack Technique

*   **Frontend :** React 19, TypeScript, Vite, Tailwind CSS v4, Framer Motion (Animations).
*   **Backend & Serveur Local :** Python 3 (HTTP Server natif, sans framework lourd).
*   **Base de Données :** Fichier `.json` centralisé sur le réseau partagé (avec mécanisme de lock/verrouillage de fichier pour garantir l'intégrité des données).
*   **Exécutable Windows :** `PyInstaller` (pour distribuer l'application facilement aux collaborateurs sans nécessiter l'installation de Python ou Node.js).

## 📦 Installation et Lancement (Développement)

Si vous souhaitez modifier ou tester le code source :

### Prérequis
*   Node.js (v18+)
*   Python (3.9+)

### Étapes

1.  **Cloner le dépôt :**
    ```bash
    git clone https://github.com/VOTRE-PSEUDO/NOM-DU-DEPOT.git
    cd NOM-DU-DEPOT
    ```

2.  **Installer les dépendances Frontend :**
    ```bash
    npm install
    ```

3.  **Compiler le Frontend :**
    *L'application React doit être compilée (build) car le serveur Python va servir le dossier `web` (le dossier `dist` est réservé à PyInstaller).*
    ```bash
    npm run build
    ```

4.  **Lancer le Serveur Python (Backend) :**
    ```bash
    python run_dashboard.py
    ```
    *L'application s'ouvrira automatiquement dans votre navigateur par défaut (ou Chrome/Edge en mode "App") à l'adresse `http://127.0.0.1:8000`.*

## 🔨 Créer l'Exécutable (Pour les utilisateurs finaux)

L'objectif est que les utilisateurs de la Team T2 n'aient qu'à double-cliquer sur un fichier `.exe`.

Le script `creer_exe.bat` compile le frontend (`npm run build` → dossier `web`) puis package `web` et `run_dashboard.py` en un seul fichier exécutable autonome.

1. Prérequis : Node.js et Python installés (le script lance lui-même `npm install` et `npm run build`).
2. Lancez `creer_exe.bat` (sur Windows) ou exécutez la commande PyInstaller correspondante.
3. Le fichier final se trouvera dans le dossier `dist/T2_dashboard.exe`.

## 🔒 Architecture de Sauvegarde (Anti-Conflits)

Pour éviter que les utilisateurs n'écrasent leurs modifications respectives sur le réseau (fichier `dashboard_data.json`), l'application utilise une architecture hybride :
*   **Verrous fichiers (File Locks) :** Le script Python pose un fichier `.lock` d'une durée de vie de quelques secondes lors des écritures.
*   **Mises à jour partielles (Partial Updates) :** Le frontend ne renvoie que l'entité modifiée (un projet spécifique ou un utilisateur spécifique) via des routes d'API dédiées (`/api/save-project`, `/api/save-user`), garantissant une "fusion" intelligente des données.

---
**Copyright © Olivier Schwickert**
