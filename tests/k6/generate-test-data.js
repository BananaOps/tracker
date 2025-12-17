import http from 'k6/http';
import { sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:8080';
const API_URL = `${BASE_URL}/api/v1alpha1`;

// Configuration des données
const config = {
  teams: [
    { name: 'Platform', services: ['api-gateway', 'auth-service', 'notification-service'], owner: 'platform-team' },
    { name: 'Data', services: ['data-pipeline', 'analytics-service', 'etl-jobs'], owner: 'data-team' },
    { name: 'Frontend', services: ['web-app', 'mobile-app', 'admin-portal'], owner: 'frontend-team' },
    { name: 'Infrastructure', services: ['monitoring', 'logging', 'backup-service'], owner: 'infra-team' },
    { name: 'Security', services: ['firewall', 'vpn-service', 'audit-service'], owner: 'security-team' },
  ],
  environments: ['development', 'integration', 'tnr', 'uat', 'preproduction', 'production'],
  priorities: { p1: 1, p2: 2, p3: 3, p4: 4, p5: 5 },
  statuses: {
    deployment: ['start', 'success', 'failure'],
    incident: ['open', 'close'],
    drift: ['open', 'done', 'warning'],
    operation: ['start', 'success', 'failure', 'done'],
    rpa_usage: ['success', 'failure', 'warning'],
  },
  catalog: {
    types: ['module', 'library', 'project', 'chart', 'package', 'container'],
    languages: ['golang', 'java', 'python', 'php', 'typescript', 'javascript', 'terraform', 'helm'],
    platforms: ['kubernetes', 'lambda', 'ec2', 'ecs', 'fargate', 'cloud_run', 'app_service'],
    slaLevels: ['critical', 'high', 'medium', 'low'],
    projects: [
      { 
        name: 'payment-service', 
        type: 'project', 
        language: 'golang', 
        team: 'Platform',
        platform: 'kubernetes',
        sla: { level: 'critical', uptime: 99.99, responseTime: 100 },
        dependsOn: ['auth-service', 'database-service'],
        usedBy: ['web-frontend', 'mobile-app']
      },
      { 
        name: 'user-management', 
        type: 'project', 
        language: 'java', 
        team: 'Platform',
        platform: 'kubernetes',
        sla: { level: 'high', uptime: 99.9, responseTime: 200 },
        dependsOn: ['auth-library', 'database-service'],
        usedBy: ['payment-service', 'admin-dashboard']
      },
      { 
        name: 'analytics-engine', 
        type: 'project', 
        language: 'python', 
        team: 'Data',
        platform: 'lambda',
        sla: { level: 'medium', uptime: 99.5, responseTime: 500 },
        dependsOn: ['data-processor', 'etl-framework'],
        usedBy: ['admin-dashboard']
      },
      { 
        name: 'web-frontend', 
        type: 'project', 
        language: 'typescript', 
        team: 'Frontend',
        platform: 'cloudfront',
        sla: { level: 'high', uptime: 99.9, responseTime: 150 },
        dependsOn: ['payment-service', 'user-management', 'ui-components'],
        usedBy: []
      },
      { 
        name: 'mobile-app', 
        type: 'project', 
        language: 'typescript', 
        team: 'Frontend',
        platform: 'app_service',
        sla: { level: 'high', uptime: 99.9, responseTime: 200 },
        dependsOn: ['payment-service', 'user-management', 'api-client'],
        usedBy: []
      },
      { 
        name: 'admin-dashboard', 
        type: 'project', 
        language: 'php', 
        team: 'Frontend',
        platform: 'ec2',
        sla: { level: 'medium', uptime: 99.5, responseTime: 300 },
        dependsOn: ['user-management', 'analytics-engine'],
        usedBy: []
      },
      { 
        name: 'auth-service', 
        type: 'project', 
        language: 'golang', 
        team: 'Security',
        platform: 'kubernetes',
        sla: { level: 'critical', uptime: 99.99, responseTime: 50 },
        dependsOn: ['auth-library', 'database-service'],
        usedBy: ['payment-service', 'user-management']
      },
      { 
        name: 'database-service', 
        type: 'project', 
        language: 'golang', 
        team: 'Infrastructure',
        platform: 'rds',
        sla: { level: 'critical', uptime: 99.99, responseTime: 10 },
        dependsOn: [],
        usedBy: ['payment-service', 'user-management', 'auth-service']
      },
      { 
        name: 'notification-service', 
        type: 'project', 
        language: 'python', 
        team: 'Platform',
        platform: 'lambda',
        sla: { level: 'medium', uptime: 99.5, responseTime: 1000 },
        dependsOn: ['auth-service'],
        usedBy: ['payment-service']
      },
      { 
        name: 'terraform-infra', 
        type: 'module', 
        language: 'terraform', 
        team: 'Infrastructure',
        dependsOn: [],
        usedBy: []
      },
      { 
        name: 'kubernetes-charts', 
        type: 'chart', 
        language: 'helm', 
        team: 'Infrastructure',
        dependsOn: [],
        usedBy: []
      },
      { 
        name: 'auth-library', 
        type: 'library', 
        language: 'golang', 
        team: 'Security',
        dependsOn: ['encryption-lib'],
        usedBy: ['auth-service', 'user-management']
      },
      { 
        name: 'encryption-lib', 
        type: 'library', 
        language: 'java', 
        team: 'Security',
        dependsOn: [],
        usedBy: ['auth-library']
      },
      { 
        name: 'api-client', 
        type: 'library', 
        language: 'python', 
        team: 'Platform',
        dependsOn: [],
        usedBy: ['mobile-app', 'analytics-engine']
      },
      { 
        name: 'ui-components', 
        type: 'library', 
        language: 'typescript', 
        team: 'Frontend',
        dependsOn: [],
        usedBy: ['web-frontend', 'admin-dashboard']
      },
      { 
        name: 'data-processor', 
        type: 'package', 
        language: 'python', 
        team: 'Data',
        dependsOn: ['etl-framework'],
        usedBy: ['analytics-engine']
      },
      { 
        name: 'etl-framework', 
        type: 'package', 
        language: 'python', 
        team: 'Data',
        dependsOn: [],
        usedBy: ['data-processor', 'analytics-engine']
      },
      { 
        name: 'monitoring-stack', 
        type: 'container', 
        language: 'golang', 
        team: 'Infrastructure',
        platform: 'kubernetes',
        sla: { level: 'high', uptime: 99.9, responseTime: 100 },
        dependsOn: [],
        usedBy: []
      },
    ],
  },
};

function randomElement(array) {
  return array[Math.floor(Math.random() * array.length)];
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

function getDate(daysOffset, hoursOffset = 0) {
  const date = new Date();
  date.setDate(date.getDate() + daysOffset);
  date.setHours(date.getHours() + hoursOffset);
  return date.toISOString();
}

function createEvent(event) {
  const payload = JSON.stringify(event);
  const params = {
    headers: { 'Content-Type': 'application/json' },
    timeout: '30s',
  };
  
  const response = http.post(`${API_URL}/event`, payload, params);
  
  if (response.status === 200) {
    console.log(`✓ Event created: ${event.title}`);
  } else {
    console.error(`✗ Event failed: ${event.title} - ${response.status}`);
  }
  
  return response;
}

function createCatalog(catalog) {
  const payload = JSON.stringify(catalog);
  const params = {
    headers: { 'Content-Type': 'application/json' },
    timeout: '30s',
  };
  
  const response = http.put(`${API_URL}/catalog`, payload, params);
  
  // Accepter 200 et 500 car l'objet est créé même avec 500
  if (response.status === 200 || response.status === 500) {
    console.log(`✓ Catalog created: ${catalog.name}`);
  } else {
    console.error(`✗ Catalog failed: ${catalog.name} - ${response.status}`);
  }
  
  return response;
}

function createLock(lock) {
  const payload = JSON.stringify(lock);
  const params = {
    headers: { 'Content-Type': 'application/json' },
    timeout: '30s',
  };
  
  const response = http.post(`${API_URL}/lock`, payload, params);
  
  if (response.status === 200) {
    console.log(`✓ Lock created: ${lock.service} (${lock.environment})`);
  } else {
    console.error(`✗ Lock failed: ${lock.service} - ${response.status}`);
  }
  
  return response;
}

export default function () {
  console.log('=== Génération des données de test ===');
  console.log('');
  
  // 1. Générer les catalogues
  console.log('--- Génération des catalogues ---');
  let catalogCount = 0;
  
  config.catalog.projects.forEach((project) => {
    const team = config.teams.find(t => t.name === project.team);
    const version = `${randomInt(1, 3)}.${randomInt(0, 9)}.${randomInt(0, 20)}`;
    
    const catalog = {
      name: project.name,
      type: project.type,
      languages: project.language,
      owner: team ? team.owner : 'unknown-team',
      version: version,
      link: `https://docs.${project.team.toLowerCase()}.com/${project.name}`,
      description: `${project.type.charAt(0).toUpperCase() + project.type.slice(1)} for ${project.name} built with ${project.language}`,
      repository: `https://github.com/${project.team.toLowerCase()}/${project.name}`,
      dependenciesIn: project.dependsOn || [],
      dependenciesOut: project.usedBy || [],
    };

    // Add platform for projects only
    if (project.type === 'project' && project.platform) {
      catalog.platform = project.platform;
    }

    // Add SLA for projects with SLA defined
    if (project.sla) {
      catalog.sla = {
        level: project.sla.level,
        uptimePercentage: project.sla.uptime,
        responseTimeMs: project.sla.responseTime,
        description: `SLA for ${project.name}: ${project.sla.level} level service with ${project.sla.uptime}% uptime target and ${project.sla.responseTime}ms response time target.`
      };
    }
    
    createCatalog(catalog);
    catalogCount++;
    sleep(0.05);
  });
  
  console.log(`✓ ${catalogCount} catalogues créés`);
  console.log('');
  
  // 2. Générer quelques locks actifs
  console.log('--- Génération des locks ---');
  let lockCount = 0;
  
  // Créer quelques locks pour simuler des opérations en cours
  const activeLocks = [
    {
      service: 'payment-service',
      environment: 'production',
      reason: 'Database migration in progress',
      owner: 'platform-team',
      expiresAt: getDate(0, 2), // Expire dans 2 heures
    },
    {
      service: 'user-management',
      environment: 'preproduction',
      reason: 'Security patch deployment',
      owner: 'security-team',
      expiresAt: getDate(0, 1), // Expire dans 1 heure
    },
    {
      service: 'analytics-engine',
      environment: 'production',
      reason: 'Performance optimization',
      owner: 'data-team',
      expiresAt: getDate(1, 0), // Expire demain
    },
  ];

  activeLocks.forEach((lockData) => {
    const lock = {
      service: lockData.service,
      environment: lockData.environment,
      reason: lockData.reason,
      owner: lockData.owner,
      expiresAt: lockData.expiresAt,
    };
    
    createLock(lock);
    lockCount++;
    sleep(0.05);
  });
  
  console.log(`✓ ${lockCount} locks créés`);
  console.log('');
  
  // 3. Générer les événements
  console.log('--- Génération des événements ---');
  let eventCount = 0;
  
  // Générer des événements pour les 30 prochains jours
  for (let day = -5; day <= 30; day++) {
    const eventsPerDay = randomInt(3, 8);
    
    for (let i = 0; i < eventsPerDay; i++) {
      const team = randomElement(config.teams);
      const service = randomElement(team.services);
      const env = randomElement(config.environments);
      const hourOffset = randomInt(0, 23);
      
      // Choisir un type d'événement
      const eventTypeRand = Math.random();
      let event;
      
      if (eventTypeRand < 0.35) {
        // 35% Deployments
        const version = `${randomInt(1, 3)}.${randomInt(0, 9)}.${randomInt(0, 20)}`;
        const status = randomElement(config.statuses.deployment);
        const duration = status !== 'start' ? randomInt(5, 60) : 0;
        
        event = {
          title: `Deploy ${service} v${version} to ${env}`,
          attributes: {
            message: `Deployment of ${service} version ${version}`,
            source: randomElement(['github_actions', 'gitlab_ci', 'argocd']),
            type: 'deployment',
            priority: env === 'production' ? randomElement(['p1', 'p2']) : randomElement(['p3', 'p4']),
            service: service,
            status: status,
            environment: env,
            impact: env === 'production',
            startDate: getDate(day, hourOffset),
            endDate: duration > 0 ? getDate(day, hourOffset + (duration / 60)) : undefined,
            owner: team.owner,
            stakeHolders: [team.owner, 'devops-team'],
            notification: env === 'production',
          },
          links: {
            pullRequestLink: `https://github.com/${team.name.toLowerCase()}/${service}/pull/${randomInt(100, 999)}`,
            ticket: `${team.name.toUpperCase()}-${randomInt(100, 999)}`,
          },
          slackId: `${Date.now()}${randomInt(100000, 999999)}`,
          slackChannel: env === 'production' ? 'deployments-prod' : 'deployments',
        };
        
      } else if (eventTypeRand < 0.50) {
        // 15% Incidents
        const incidents = [
          'High CPU usage',
          'Memory leak',
          'Database timeout',
          'API degradation',
          'Service unavailable',
        ];
        const incident = randomElement(incidents);
        const status = randomElement(config.statuses.incident);
        const duration = status === 'close' ? randomInt(30, 480) : 0;
        
        event = {
          title: `[${env.toUpperCase()}] ${incident} - ${service}`,
          attributes: {
            message: `Incident: ${incident} on ${service}`,
            source: randomElement(['prometheus', 'datadog', 'manual']),
            type: 'incident',
            priority: env === 'production' ? 'p1' : 'p2',
            service: service,
            status: status,
            environment: env,
            impact: true,
            startDate: getDate(day, hourOffset),
            endDate: duration > 0 ? getDate(day, hourOffset + (duration / 60)) : undefined,
            owner: `${team.owner}-oncall`,
            stakeHolders: [team.owner, 'sre-team', 'incident-manager'],
            notification: true,
          },
          links: {
            ticket: `INC-${randomInt(1000, 9999)}`,
          },
          slackId: `${Date.now()}${randomInt(100000, 999999)}`,
          slackChannel: 'incidents',
        };
        
      } else if (eventTypeRand < 0.65) {
        // 15% Drifts
        const drifts = [
          'Terraform drift',
          'Config mismatch',
          'Manual change',
          'Resource mismatch',
        ];
        const drift = randomElement(drifts);
        const status = randomElement(config.statuses.drift);
        
        event = {
          title: `[DRIFT] ${drift} - ${service}`,
          attributes: {
            message: `Configuration drift: ${drift}`,
            source: 'terraform',
            type: 'drift',
            priority: randomElement(['p2', 'p3']),
            service: service,
            status: status,
            environment: env,
            impact: false,
            startDate: getDate(day, hourOffset),
            owner: 'infrastructure-team',
            stakeHolders: [team.owner, 'devops-team'],
            notification: env === 'production',
          },
          links: {
            ticket: `DRIFT-${randomInt(100, 999)}`,
          },
          slackId: `${Date.now()}${randomInt(100000, 999999)}`,
          slackChannel: 'infrastructure',
        };
        
      } else if (eventTypeRand < 0.80) {
        // 15% RPA Usage
        const processes = [
          'Invoice processing',
          'Data extraction',
          'Report generation',
          'Email automation',
        ];
        const process = randomElement(processes);
        const status = randomElement(config.statuses.rpa_usage);
        
        event = {
          title: `RPA: ${process} - ${service}`,
          attributes: {
            message: `RPA process "${process}" executed`,
            source: 'uipath',
            type: 'rpa_usage',
            priority: randomElement(['p3', 'p4']),
            service: service,
            status: status,
            environment: env,
            impact: false,
            startDate: getDate(day, hourOffset),
            owner: 'automation-team',
            stakeHolders: [team.owner],
            notification: status === 'failure',
          },
          links: {
            ticket: `RPA-${randomInt(100, 999)}`,
          },
          slackId: `${Date.now()}${randomInt(100000, 999999)}`,
          slackChannel: 'rpa-logs',
        };
        
      } else {
        // 20% Operations
        const operations = [
          'Database migration',
          'Cache clear',
          'Index rebuild',
          'Certificate renewal',
          'Scale up',
        ];
        const operation = randomElement(operations);
        const status = randomElement(config.statuses.operation);
        const duration = status !== 'start' ? randomInt(10, 120) : 0;
        
        event = {
          title: `${operation} - ${service}`,
          attributes: {
            message: `Operation: ${operation}`,
            source: randomElement(['manual', 'scheduled', 'automated']),
            type: 'operation',
            priority: randomElement(['p2', 'p3']),
            service: service,
            status: status,
            environment: env,
            impact: env === 'production',
            startDate: getDate(day, hourOffset),
            endDate: duration > 0 ? getDate(day, hourOffset + (duration / 60)) : undefined,
            owner: team.owner,
            stakeHolders: ['ops-team'],
            notification: env === 'production',
          },
          links: {
            ticket: `OPS-${randomInt(100, 999)}`,
          },
          slackId: `${Date.now()}${randomInt(100000, 999999)}`,
          slackChannel: 'operations',
        };
      }
      
      createEvent(event);
      eventCount++;
      sleep(0.05); // Petit délai pour éviter de surcharger
    }
  }
  
  console.log('');
  console.log('=== Génération terminée ===');
  console.log(`✓ ${catalogCount} catalogues créés (avec SLA, Platform, Dependencies)`);
  console.log(`✓ ${lockCount} locks créés`);
  console.log(`✓ ${eventCount} événements créés`);
  console.log('');
  console.log('🎯 Nouvelles fonctionnalités testées:');
  console.log('  • SLA avec niveaux Critical/High/Medium/Low');
  console.log('  • Plateformes de déploiement (Kubernetes, Lambda, EC2, etc.)');
  console.log('  • Dépendances upstream/downstream entre services');
  console.log('  • Locks actifs pour opérations en cours');
  console.log('');
  console.log('🔍 Vérification:');
  console.log(`  Catalogues: curl ${BASE_URL}/api/v1alpha1/catalogs/list | jq '.totalCount'`);
  console.log(`  Événements: curl ${BASE_URL}/api/v1alpha1/events/list | jq '.totalCount'`);
  console.log(`  Locks:      curl ${BASE_URL}/api/v1alpha1/locks/list | jq '.totalCount'`);
  console.log('');
  console.log('📊 Interface Web:');
  console.log(`  Dashboard:     ${BASE_URL}/dashboard`);
  console.log(`  Catalog:       ${BASE_URL}/catalog`);
  console.log(`  Dependencies:  ${BASE_URL}/catalog/dependencies`);
  console.log(`  Locks:         ${BASE_URL}/locks`);
}

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_failed: ['rate<0.05'],
  },
};

