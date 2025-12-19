import http from 'k6/http';
import { sleep } from 'k6';

const BASE_URL = __ENV.BASE_URL || 'http://127.0.0.1:8080';
const API_URL = `${BASE_URL}/api/v1alpha1`;

// Configuration des données
const config = {
  teams: [
    { name: 'Platform', services: ['payment-service', 'user-management', 'api-gateway', 'notification-service'], owner: 'platform-team' },
    { name: 'Data', services: ['analytics-engine', 'data-warehouse', 'etl-jobs'], owner: 'data-team' },
    { name: 'Frontend', services: ['web-frontend', 'mobile-app', 'admin-dashboard'], owner: 'frontend-team' },
    { name: 'Infrastructure', services: ['database-service', 'monitoring', 'logging', 'backup-service'], owner: 'infra-team' },
    { name: 'Security', services: ['auth-service', 'firewall', 'vpn-service', 'audit-service'], owner: 'security-team' },
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
    platforms: [
      'kubernetes', 'lambda', 'ec2', 'ecs', 'fargate', 'cloud_run', 'app_service',
      'step_functions', 'event_bridge', 'rds', 'dynamodb', 's3', 'cloudfront',
      'api_gateway', 'cloudwatch', 'on_premise', 'hybrid', 'multi_cloud'
    ],
    slaLevels: ['critical', 'high', 'medium', 'low'],
    // Deliverables with versions (packages, charts, containers, modules)
    deliverables: [
      {
        name: 'auth-library',
        type: 'library',
        language: 'golang',
        team: 'Security',
        versions: ['1.0.0', '1.1.0', '1.2.0', '2.0.0', '2.1.0'],
        latestVersion: '2.1.0',
        referenceVersion: '2.0.0'
      },
      {
        name: 'encryption-lib',
        type: 'library',
        language: 'java',
        team: 'Security',
        versions: ['0.9.0', '1.0.0', '1.1.0', '1.2.0'],
        latestVersion: '1.2.0',
        referenceVersion: '1.1.0'
      },
      {
        name: 'api-client',
        type: 'library',
        language: 'python',
        team: 'Platform',
        versions: ['3.0.0', '3.1.0', '3.2.0', '4.0.0'],
        latestVersion: '4.0.0',
        referenceVersion: '3.2.0'
      },
      {
        name: 'ui-components',
        type: 'library',
        language: 'typescript',
        team: 'Frontend',
        versions: ['2.0.0', '2.1.0', '2.2.0', '2.3.0'],
        latestVersion: '2.3.0',
        referenceVersion: '2.2.0'
      },
      {
        name: 'data-processor',
        type: 'package',
        language: 'python',
        team: 'Data',
        versions: ['1.5.0', '1.6.0', '1.7.0', '2.0.0'],
        latestVersion: '2.0.0',
        referenceVersion: '1.7.0'
      },
      {
        name: 'etl-framework',
        type: 'package',
        language: 'python',
        team: 'Data',
        versions: ['0.8.0', '0.9.0', '1.0.0', '1.1.0'],
        latestVersion: '1.1.0',
        referenceVersion: '1.0.0'
      },
      {
        name: 'terraform-infra',
        type: 'module',
        language: 'terraform',
        team: 'Infrastructure',
        versions: ['1.0.0', '1.1.0', '1.2.0'],
        latestVersion: '1.2.0',
        referenceVersion: '1.1.0'
      },
      {
        name: 'kubernetes-charts',
        type: 'chart',
        language: 'helm',
        team: 'Infrastructure',
        versions: ['0.5.0', '0.6.0', '0.7.0', '1.0.0'],
        latestVersion: '1.0.0',
        referenceVersion: '0.7.0'
      },
      {
        name: 'monitoring-stack',
        type: 'container',
        language: 'golang',
        team: 'Infrastructure',
        versions: ['2.0.0', '2.1.0', '2.2.0', '3.0.0'],
        latestVersion: '3.0.0',
        referenceVersion: '2.2.0'
      },
      {
        name: 'nginx-proxy',
        type: 'container',
        language: 'docker',
        team: 'Infrastructure',
        versions: ['1.20.0', '1.21.0', '1.22.0', '1.23.0'],
        latestVersion: '1.23.0',
        referenceVersion: '1.22.0'
      }
    ],
    projects: [
      { 
        name: 'payment-service', 
        type: 'project', 
        language: 'golang', 
        team: 'Platform',
        platform: 'kubernetes',
        sla: { level: 'critical', uptime: 99.99, responseTime: 100 },
        dependsOn: ['auth-service', 'database-service'],
        usedBy: ['web-frontend', 'mobile-app'],
        usedDeliverables: [
          { name: 'auth-library', type: 'library', versionUsed: '2.0.0', description: 'Authentication and authorization' },
          { name: 'kubernetes-charts', type: 'chart', versionUsed: '0.7.0', description: 'Helm charts for deployment' },
          { name: 'monitoring-stack', type: 'container', versionUsed: '2.2.0', description: 'Monitoring and observability' }
        ],
        communicationChannels: [
          { type: 'slack', name: '#payment-alerts', url: 'https://company.slack.com/channels/payment-alerts', description: 'Payment service alerts and notifications' },
          { type: 'email', name: 'Payment Team', url: 'mailto:payment-team@company.com', description: 'Payment team contact' }
        ]
      },
      { 
        name: 'user-management', 
        type: 'project', 
        language: 'java', 
        team: 'Platform',
        platform: 'kubernetes',
        sla: { level: 'high', uptime: 99.9, responseTime: 200 },
        dependsOn: ['auth-library', 'database-service'],
        usedBy: ['payment-service', 'admin-dashboard'],
        usedDeliverables: [
          { name: 'auth-library', type: 'library', versionUsed: '1.2.0', description: 'User authentication' },
          { name: 'encryption-lib', type: 'library', versionUsed: '1.1.0', description: 'Data encryption' },
          { name: 'kubernetes-charts', type: 'chart', versionUsed: '0.6.0', description: 'Deployment charts' }
        ],
        communicationChannels: [
          { type: 'teams', name: 'User Management Team', url: 'https://teams.microsoft.com/l/channel/user-mgmt', description: 'Microsoft Teams channel for user management' },
          { type: 'slack', name: '#user-support', url: 'https://company.slack.com/channels/user-support', description: 'User support channel' }
        ]
      },
      { 
        name: 'analytics-engine', 
        type: 'project', 
        language: 'python', 
        team: 'Data',
        platform: 'lambda',
        sla: { level: 'medium', uptime: 99.5, responseTime: 500 },
        dependsOn: ['data-processor', 'etl-framework'],
        usedBy: ['admin-dashboard'],
        usedDeliverables: [
          { name: 'data-processor', type: 'package', versionUsed: '1.7.0', description: 'Data processing pipeline' },
          { name: 'etl-framework', type: 'package', versionUsed: '1.0.0', description: 'ETL operations' },
          { name: 'api-client', type: 'library', versionUsed: '3.2.0', description: 'API communication' }
        ],
        communicationChannels: [
          { type: 'discord', name: 'Data Team', url: 'https://discord.gg/data-team', description: 'Data team Discord server' },
          { type: 'email', name: 'Data Analytics', url: 'mailto:data-analytics@company.com', description: 'Data analytics team' }
        ]
      },
      { 
        name: 'web-frontend', 
        type: 'project', 
        language: 'typescript', 
        team: 'Frontend',
        platform: 'cloudfront',
        sla: { level: 'high', uptime: 99.9, responseTime: 150 },
        dependsOn: ['payment-service', 'user-management', 'ui-components'],
        usedBy: [],
        usedDeliverables: [
          { name: 'ui-components', type: 'library', versionUsed: '2.2.0', description: 'Reusable UI components' },
          { name: 'api-client', type: 'library', versionUsed: '3.1.0', description: 'Frontend API client' }
        ],
        communicationChannels: [
          { type: 'slack', name: '#frontend-team', url: 'https://company.slack.com/channels/frontend-team', description: 'Frontend development team' },
          { type: 'mattermost', name: 'Web Development', url: 'https://mattermost.company.com/channels/web-dev', description: 'Web development discussions' }
        ]
      },
      { 
        name: 'mobile-app', 
        type: 'project', 
        language: 'typescript', 
        team: 'Frontend',
        platform: 'app_service',
        sla: { level: 'high', uptime: 99.9, responseTime: 200 },
        dependsOn: ['payment-service', 'user-management', 'api-client'],
        usedBy: [],
        usedDeliverables: [
          { name: 'api-client', type: 'library', versionUsed: '4.0.0', description: 'Mobile API client' },
          { name: 'ui-components', type: 'library', versionUsed: '2.1.0', description: 'Mobile UI components' }
        ],
        communicationChannels: [
          { type: 'telegram', name: 'Mobile Dev Team', url: 'https://t.me/mobile_dev_team', description: 'Mobile development team chat' },
          { type: 'email', name: 'Mobile Support', url: 'mailto:mobile-support@company.com', description: 'Mobile app support' }
        ]
      },
      { 
        name: 'admin-dashboard', 
        type: 'project', 
        language: 'php', 
        team: 'Frontend',
        platform: 'ec2',
        sla: { level: 'medium', uptime: 99.5, responseTime: 300 },
        dependsOn: ['user-management', 'analytics-engine'],
        usedBy: [],
        usedDeliverables: [
          { name: 'ui-components', type: 'library', versionUsed: '2.0.0', description: 'Admin UI components' },
          { name: 'nginx-proxy', type: 'container', versionUsed: '1.21.0', description: 'Reverse proxy' }
        ]
      },
      { 
        name: 'auth-service', 
        type: 'project', 
        language: 'golang', 
        team: 'Security',
        platform: 'kubernetes',
        sla: { level: 'critical', uptime: 99.99, responseTime: 50 },
        dependsOn: ['auth-library', 'database-service'],
        usedBy: ['payment-service', 'user-management'],
        usedDeliverables: [
          { name: 'auth-library', type: 'library', versionUsed: '2.1.0', description: 'Core authentication library' },
          { name: 'encryption-lib', type: 'library', versionUsed: '1.2.0', description: 'Encryption utilities' },
          { name: 'kubernetes-charts', type: 'chart', versionUsed: '1.0.0', description: 'Latest deployment charts' }
        ]
      },
      { 
        name: 'database-service', 
        type: 'project', 
        language: 'golang', 
        team: 'Infrastructure',
        platform: 'rds',
        sla: { level: 'critical', uptime: 99.99, responseTime: 10 },
        dependsOn: [],
        usedBy: ['payment-service', 'user-management', 'auth-service'],
        usedDeliverables: [
          { name: 'terraform-infra', type: 'module', versionUsed: '1.1.0', description: 'Infrastructure as code' },
          { name: 'monitoring-stack', type: 'container', versionUsed: '3.0.0', description: 'Database monitoring' }
        ]
      },
      { 
        name: 'notification-service', 
        type: 'project', 
        language: 'python', 
        team: 'Platform',
        platform: 'lambda',
        sla: { level: 'medium', uptime: 99.5, responseTime: 1000 },
        dependsOn: ['auth-service'],
        usedBy: ['payment-service'],
        usedDeliverables: [
          { name: 'api-client', type: 'library', versionUsed: '3.0.0', description: 'Notification API client' }
        ]
      },
      { 
        name: 'api-gateway', 
        type: 'project', 
        language: 'golang', 
        team: 'Platform',
        platform: 'api_gateway',
        sla: { level: 'critical', uptime: 99.99, responseTime: 25 },
        dependsOn: ['auth-service'],
        usedBy: ['web-frontend', 'mobile-app'],
        usedDeliverables: [
          { name: 'auth-library', type: 'library', versionUsed: '2.0.0', description: 'Gateway authentication' },
          { name: 'nginx-proxy', type: 'container', versionUsed: '1.22.0', description: 'Load balancing' }
        ]
      },
      { 
        name: 'data-warehouse', 
        type: 'project', 
        language: 'python', 
        team: 'Data',
        platform: 's3',
        sla: { level: 'high', uptime: 99.9, responseTime: 200 },
        dependsOn: ['analytics-engine'],
        usedBy: [],
        usedDeliverables: [
          { name: 'etl-framework', type: 'package', versionUsed: '0.9.0', description: 'Data transformation' },
          { name: 'terraform-infra', type: 'module', versionUsed: '1.0.0', description: 'S3 infrastructure' }
        ]
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

function updateVersions(name, versions) {
  const payload = JSON.stringify(versions);
  const params = {
    headers: { 'Content-Type': 'application/json' },
    timeout: '30s',
  };
  
  const response = http.put(`${API_URL}/catalog/${name}/versions`, payload, params);
  
  if (response.status === 200) {
    console.log(`✓ Versions updated: ${name} (${versions.availableVersions?.length || 0} versions)`);
  } else {
    console.error(`✗ Versions failed: ${name} - ${response.status}`);
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
  
  // 1. Générer les deliverables (libraries, packages, charts, containers, modules)
  console.log('--- Génération des deliverables ---');
  let deliverableCount = 0;
  
  config.catalog.deliverables.forEach((deliverable) => {
    const team = config.teams.find(t => t.name === deliverable.team);
    const version = deliverable.versions[deliverable.versions.length - 1]; // Use latest version as current
    
    const catalog = {
      name: deliverable.name,
      type: deliverable.type,
      languages: deliverable.language,
      owner: team ? team.owner : 'unknown-team',
      version: version,
      link: `https://docs.${deliverable.team.toLowerCase()}.com/${deliverable.name}`,
      description: `${deliverable.type.charAt(0).toUpperCase() + deliverable.type.slice(1)} ${deliverable.name} built with ${deliverable.language}`,
      repository: `https://github.com/${deliverable.team.toLowerCase()}/${deliverable.name}`,
      dependenciesIn: [],
      dependenciesOut: [],
    };
    
    createCatalog(catalog);
    deliverableCount++;
    sleep(0.05);
    
    // Update versions for this deliverable
    const versionData = {
      availableVersions: deliverable.versions,
      latestVersion: deliverable.latestVersion,
      referenceVersion: deliverable.referenceVersion
    };
    
    updateVersions(deliverable.name, versionData);
    sleep(0.05);
  });
  
  console.log(`✓ ${deliverableCount} deliverables créés avec versions`);
  console.log('');

  // 2. Générer les projets
  console.log('--- Génération des projets ---');
  let projectCount = 0;
  
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

    // Add used deliverables for projects
    if (project.usedDeliverables && project.usedDeliverables.length > 0) {
      catalog.usedDeliverables = project.usedDeliverables.map(ud => ({
        name: ud.name,
        type: ud.type,
        versionUsed: ud.versionUsed,
        description: ud.description
      }));
    }
    
    createCatalog(catalog);
    projectCount++;
    sleep(0.05);
  });
  
  console.log(`✓ ${projectCount} projets créés avec usedDeliverables`);
  console.log('');
  
  // 3. Générer quelques locks actifs
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
    {
      service: 'api-gateway',
      environment: 'production',
      reason: 'Load balancer configuration update',
      owner: 'platform-team',
      expiresAt: getDate(0, 4), // Expire dans 4 heures
    },
    {
      service: 'auth-service',
      environment: 'integration',
      reason: 'Authentication library upgrade',
      owner: 'security-team',
      expiresAt: getDate(0, 6), // Expire dans 6 heures
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
  
  // 4. Générer les événements
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
  console.log(`✓ ${deliverableCount} deliverables créés avec gestion de versions`);
  console.log(`✓ ${projectCount} projets créés avec usedDeliverables`);
  console.log(`✓ ${lockCount} locks créés`);
  console.log(`✓ ${eventCount} événements créés`);
  console.log('');
  console.log('🎯 Nouvelles fonctionnalités testées:');
  console.log('  • SLA avec niveaux Critical/High/Medium/Low');
  console.log('  • Plateformes étendues (19 plateformes multi-cloud)');
  console.log('  • Dépendances upstream/downstream entre services');
  console.log('  • Gestion de versions pour deliverables (availableVersions, latestVersion, referenceVersion)');
  console.log('  • UsedDeliverables pour projets avec versions utilisées');
  console.log('  • Version compliance tracking');
  console.log('  • Locks actifs pour opérations en cours');
  console.log('');
  console.log('🔍 Vérification:');
  console.log(`  Catalogues: curl ${BASE_URL}/api/v1alpha1/catalogs/list | jq '.totalCount'`);
  console.log(`  Événements: curl ${BASE_URL}/api/v1alpha1/events/list | jq '.totalCount'`);
  console.log(`  Locks:      curl ${BASE_URL}/api/v1alpha1/locks/list | jq '.totalCount'`);
  console.log(`  Compliance: curl ${BASE_URL}/api/v1alpha1/catalog/version-compliance | jq '.summary'`);
  console.log('');
  console.log('📊 Interface Web:');
  console.log(`  Dashboard:          ${BASE_URL}/dashboard`);
  console.log(`  Catalog:            ${BASE_URL}/catalog`);
  console.log(`  Dependencies:       ${BASE_URL}/catalog/dependencies`);
  console.log(`  Version Compliance: ${BASE_URL}/catalog/version-compliance`);
  console.log(`  Locks:              ${BASE_URL}/locks`);
}

export const options = {
  vus: 1,
  iterations: 1,
  thresholds: {
    http_req_failed: ['rate<0.05'],
  },
};

