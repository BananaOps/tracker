# Guide d'utilisation - Drifts et RPA

## 🔄 Création de Drifts

### Qu'est-ce qu'un drift ?

Un **drift** (dérive) est une différence détectée entre l'état attendu d'une ressource et son état réel. Cela peut survenir suite à :
- Une modification manuelle non documentée
- Une mise à jour non planifiée
- Une divergence de configuration
- Un changement externe non contrôlé

### Quand créer un drift ?

Créez un drift lorsque vous détectez :
- ✅ Une différence entre le code Infrastructure as Code (Terraform, CloudFormation) et l'état réel
- ✅ Une configuration modifiée manuellement dans la console
- ✅ Un paramètre qui ne correspond plus à la baseline
- ✅ Une ressource créée/modifiée en dehors du processus standard

### Formulaire de création de drift

#### Champs obligatoires
- **Titre** : Description courte du drift
  - Exemple : "Drift détecté sur la configuration du load balancer"
  
- **Service concerné** : Nom du service ou de la ressource
  - Exemple : `load-balancer`, `database-prod`, `api-gateway`
  
- **Description** : Détails de la dérive
  - Décrivez ce qui a changé
  - Quelle est la différence entre attendu et réel
  - Impact potentiel

- **Source de détection** : Outil ayant détecté le drift
  - Exemples : `terraform_drift`, `cloudformation_drift`, `manual_detection`, `aws_config`

#### Champs optionnels
- **Environnement** : Development, Integration, UAT, Production, etc.
- **Priorité** : P1 (critique) à P5 (très faible)
- **Statut** : 
  - `Ouvert` : Drift détecté, pas encore traité
  - `En cours` : Correction en cours
  - `Résolu` : Drift corrigé
  - `Fermé` : Drift accepté ou fermé
- **Impact** : Cochez si le drift affecte le service
- **Owner** : Équipe ou personne responsable
- **Ticket** : Référence du ticket de suivi

### Exemple de drift

```
Titre: Drift détecté sur le Security Group du load balancer
Service: load-balancer-prod
Environnement: Production
Priorité: P1
Statut: Ouvert
Source: terraform_drift
Impact: ✓ Oui

Description:
Le Security Group sg-12345 du load balancer a été modifié manuellement.
- Attendu: Ports 80, 443 ouverts uniquement
- Réel: Port 8080 ajouté manuellement
- Risque: Exposition non autorisée d'un port

Owner: team-platform
Ticket: SEC-789
```

### Workflow recommandé

1. **Détection** : Outil automatique ou détection manuelle
2. **Création** : Enregistrer le drift dans Tracker
3. **Analyse** : Évaluer l'impact et la priorité
4. **Correction** : 
   - Soit corriger l'infrastructure (revenir à l'état attendu)
   - Soit mettre à jour le code IaC (accepter le changement)
5. **Résolution** : Marquer le drift comme résolu
6. **Documentation** : Documenter la décision prise

---

## 🤖 Création d'opérations RPA

### Qu'est-ce qu'une opération RPA ?

**RPA** (Robotic Process Automation) désigne l'automatisation de processus métier répétitifs via des robots logiciels. Une opération RPA peut être :
- Un traitement automatique de documents
- Une synchronisation de données
- Un workflow automatisé
- Un script d'automatisation métier

### Quand créer une opération RPA ?

Créez une opération RPA pour tracker :
- ✅ L'exécution d'un robot RPA
- ✅ Un traitement automatique planifié
- ✅ Une synchronisation de données automatisée
- ✅ Un workflow d'automatisation métier
- ✅ Un script d'automatisation récurrent

### Formulaire de création d'opération RPA

#### Champs obligatoires
- **Nom de l'opération** : Description de l'automatisation
  - Exemple : "Traitement automatique des factures", "Synchronisation clients SAP"
  
- **Service / Robot RPA** : Nom du robot ou service
  - Exemple : `rpa-invoice-processor`, `rpa-sap-sync`, `automation-bot-01`
  
- **Description** : Détails de l'opération
  - Nombre d'éléments traités
  - Durée d'exécution
  - Résultats obtenus
  - Erreurs éventuelles

- **Source / Plateforme** : Outil RPA utilisé
  - Exemples : `uipath`, `automation_anywhere`, `blue_prism`, `power_automate`, `custom_script`

#### Champs optionnels
- **Environnement** : Development, Integration, Production, etc.
- **Statut** : Démarré, Succès, Échec, Terminé
- **Priorité** : P1 à P5
- **Dates** : Date de début et de fin d'exécution
- **Owner** : Équipe responsable du robot
- **Parties prenantes** : Équipes impactées ou intéressées
- **Ticket** : Référence de suivi
- **Lien** : URL vers les logs ou dashboard RPA

### Exemple d'opération RPA

```
Nom: Traitement automatique des factures fournisseurs
Service: rpa-invoice-processor
Environnement: Production
Statut: Succès
Priorité: P3
Source: uipath

Description:
Traitement automatique de 247 factures fournisseurs
- Durée: 45 minutes
- Factures traitées: 247/250
- Factures en erreur: 3 (format invalide)
- Montant total: 1,234,567 €

Date début: 2024-11-19 02:00:00
Date fin: 2024-11-19 02:45:00

Owner: team-automation
Parties prenantes: finance-team, operations-team
Ticket: RPA-456
Lien: https://dashboard.rpa.example.com/execution/12345
```

### Types d'opérations RPA courantes

#### 1. Traitement de documents
- Extraction de données de factures
- Traitement de commandes
- Validation de documents

#### 2. Synchronisation de données
- Synchronisation ERP ↔ CRM
- Import/Export de données
- Mise à jour de bases de données

#### 3. Workflows métier
- Validation de processus
- Approbations automatiques
- Notifications et alertes

#### 4. Reporting
- Génération de rapports
- Consolidation de données
- Envoi de tableaux de bord

### Workflow recommandé

1. **Planification** : Définir le robot et son planning
2. **Exécution** : Le robot s'exécute automatiquement
3. **Tracking** : Créer l'opération dans Tracker
4. **Monitoring** : Suivre les statistiques et tendances
5. **Optimisation** : Analyser les performances et améliorer

---

## 📊 Statistiques et suivi

### Dashboard Drifts
- **Total drifts** : Nombre total de drifts détectés
- **Non résolus** : Drifts en attente de traitement
- **Résolus** : Drifts corrigés ou acceptés
- **Par service** : Répartition des drifts
- **Par environnement** : Où les drifts sont détectés

### Dashboard RPA
- **Total opérations** : Nombre d'exécutions RPA
- **Ce mois** : Opérations du mois en cours
- **Services actifs** : Nombre de robots actifs
- **Par service** : Répartition des opérations
- **Tendances** : Évolution dans le temps

---

## 🎯 Bonnes pratiques

### Pour les Drifts

1. **Détection proactive**
   - Mettre en place des scans automatiques (Terraform, CloudFormation)
   - Configurer des alertes sur les modifications manuelles
   - Auditer régulièrement les configurations

2. **Priorisation**
   - P1 : Impact production, sécurité critique
   - P2 : Impact fonctionnel, à corriger rapidement
   - P3 : Dérive mineure, à planifier
   - P4-P5 : Cosmétique, backlog

3. **Résolution**
   - Toujours documenter la décision (corriger ou accepter)
   - Mettre à jour le code IaC si le changement est accepté
   - Communiquer aux équipes concernées

### Pour les opérations RPA

1. **Tracking systématique**
   - Enregistrer chaque exécution importante
   - Documenter les erreurs et anomalies
   - Suivre les métriques de performance

2. **Monitoring**
   - Surveiller les taux de succès
   - Identifier les tendances
   - Détecter les dégradations de performance

3. **Amélioration continue**
   - Analyser les échecs récurrents
   - Optimiser les robots peu performants
   - Partager les bonnes pratiques

---

## 🔗 Intégration avec les outils

### Drifts
- **Terraform** : `terraform plan -detailed-exitcode`
- **CloudFormation** : AWS Config, CloudFormation Drift Detection
- **Ansible** : `ansible-playbook --check --diff`
- **Pulumi** : `pulumi preview`

### RPA
- **UiPath** : Orchestrator API
- **Automation Anywhere** : Control Room API
- **Blue Prism** : Blue Prism API
- **Power Automate** : Power Automate API
- **Scripts custom** : Webhooks, API REST

---

## 📞 Support

Pour toute question sur l'utilisation des drifts ou du RPA :
- Documentation API : http://localhost:8080/docs
- Issues GitHub : https://github.com/BananaOps/tracker/issues
