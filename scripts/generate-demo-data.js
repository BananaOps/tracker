#!/usr/bin/env node

/**
 * Script pour générer des données de démo pour le mode statique
 */

const fs = require('fs');
const path = require('path');

// Helpers
function randomItem(arr) {
  return arr[Math.floor(Math.random() * arr.length)];
}

function randomBool() {
  return Math.random() > 0.5;
}

function randomInt(min, max) {
  return Math.floor(Math.random() * (max - min + 1)) + min;
}

// Données de référence
const services = [
  'auth-service', 'payment-gateway', 'user-api', 'notification-service',
  'analytics-engine', 'search-service', 'inventory-manager', 'order-processor',
  'email-service', 'billing-service', 'reporting-api', 'cache-service'
];

const owners = ['alice', 'bob', 'charlie', 'diana', 'eve', 'frank', 'grace', 'henry'];
const environments = ['development', 'integration', 'tnr', 'uat', 'recette', 'preproduction', 'production'];
const priorities = ['p1', 'p2', 'p3', 'p4', 'p5'];
const statuses = {
  deployment: ['start', 'success', 'failure', 'warning'],
  operation: ['start', 'done', 'failure'],
  drift: ['open', 'close'],
  incident: ['open', 'close'],
  rpa_usage: ['success', 'failure']
};

const eventTypes = ['deployment', 'operation', 'drift', 'incident', 'rpa_usage'];
const catalogTypes = ['module', 'library', 'workflow', 'project', 'chart', 'package', 'container'];
const languages = ['golang', 'kotlin', 'java', 'terraform', 'helm', 'javascript', 'yaml', 'docker', 'python', 'typescript'];

// Générateurs
function generateUUID() {
  return 'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function(c) {
    const r = Math.random() * 16 | 0;
    const v = c === 'x' ? r : (r & 0x3 | 0x8);
    return v.toString(16);
  });
}

function generateDate(daysAgo) {
  const date = new Date();
  date.setDate(date.getDate() - daysAgo);
  return date.toISOString();
}

function generateMessage(type, service) {
  const messages = {
    deployment: [
      `Deploying version 2.${randomInt(0, 9)}.${randomInt(0, 20)} to ${service}`,
      `Rolling update of ${service} with new configuration`,
      `Hotfix deployment for ${service}`,
    ],
    operation: [
      `Scheduled maintenance on ${service}`,
      `Database migration for ${service}`,
      `Configuration update on ${service}`,
    ],
    drift: [
      `Configuration drift detected on ${service}`,
      `Unexpected changes found in ${service}`,
      `Manual modification detected on ${service}`,
    ],
    incident: [
      `Service degradation on ${service}`,
      `High error rate detected on ${service}`,
      `Performance issue on ${service}`,
    ],
    rpa_usage: [
      `RPA bot executed on ${service}`,
      `Automated task completed on ${service}`,
      `Scheduled RPA job on ${service}`,
    ]
  };
  return randomItem(messages[type] || [`Event on ${service}`]);
}

function generateChangelog(createdAt, owner) {
  const changelog = [
    {
      timestamp: createdAt,
      user: owner,
      changeType: 'created',
      comment: 'Event created'
    }
  ];

  // Ajouter quelques modifications aléatoires
  if (randomBool()) {
    const updateDate = new Date(createdAt);
    updateDate.setHours(updateDate.getHours() + randomInt(1, 24));
    changelog.push({
      timestamp: updateDate.toISOString(),
      user: randomItem(owners),
      changeType: 'updated',
      field: 'status',
      oldValue: 'start',
      newValue: 'success',
      comment: 'Status updated'
    });
  }

  return changelog;
}

function generateEvent(index) {
  const type = randomItem(eventTypes);
  const service = randomItem(services);
  const environment = randomItem(environments);
  const owner = randomItem(owners);
  const daysAgo = randomInt(0, 90);
  const createdAt = generateDate(daysAgo);
  
  const event = {
    title: `${type.charAt(0).toUpperCase() + type.slice(1)} for ${service}`,
    attributes: {
      message: generateMessage(type, service),
      source: 'demo-generator',
      type: type,
      priority: randomItem(priorities),
      service: service,
      status: randomItem(statuses[type] || ['success']),
      environment: environment,
      impact: type === 'incident' ? true : randomBool(),
      owner: owner,
      stakeHolders: randomBool() ? [randomItem(owners), randomItem(owners)] : [],
      notification: randomBool(),
    },
    links: {},
    metadata: {
      id: generateUUID(),
      createdAt: createdAt,
    }
  };

  // Ajouter des liens aléatoires
  if (randomBool()) {
    event.links.pullRequestLink = `https://github.com/example/${service}/pull/${randomInt(100, 999)}`;
  }
  if (randomBool()) {
    event.links.ticket = `JIRA-${randomInt(1000, 9999)}`;
  }

  // Ajouter relatedId pour certains événements
  if (type === 'drift' || type === 'incident') {
    event.attributes.relatedId = generateUUID();
  }

  // Ajouter des dates pour les opérations
  if (type === 'operation') {
    event.attributes.startDate = createdAt;
    if (event.attributes.status === 'done') {
      const endDate = new Date(createdAt);
      endDate.setHours(endDate.getHours() + randomInt(1, 48));
      event.attributes.endDate = endDate.toISOString();
    }
  }

  // Ajouter un changelog
  event.changelog = generateChangelog(createdAt, owner);

  return event;
}

function generateCatalog(index) {
  const name = `${randomItem(['api', 'service', 'lib', 'tool', 'app'])}-${randomItem(services.map(s => s.split('-')[0]))}`;
  const type = randomItem(catalogTypes);
  const language = randomItem(languages);
  const owner = randomItem(owners);
  const createdAt = generateDate(randomInt(30, 365));

  return {
    name: name,
    type: type,
    languages: language,
    owner: owner,
    version: `${randomInt(1, 5)}.${randomInt(0, 20)}.${randomInt(0, 50)}`,
    link: `https://example.com/${name}`,
    description: `${type.charAt(0).toUpperCase() + type.slice(1)} for ${name} written in ${language}`,
    repository: `https://github.com/example/${name}`,
    createdAt: createdAt,
    updatedAt: generateDate(randomInt(0, 30))
  };
}

function generateLock(index) {
  const service = randomItem(services);
  const environment = randomItem(environments);
  const owner = randomItem(owners);
  const createdAt = generateDate(randomInt(0, 7)); // Locks récents

  return {
    id: generateUUID(),
    service: service,
    who: owner,
    createdAt: createdAt,
    environment: environment,
    resource: randomItem(['deployment', 'operation']),
    eventId: generateUUID()
  };
}

// Génération des données
console.log('🎲 Generating demo data...');

const events = Array.from({ length: 100 }, (_, i) => generateEvent(i));
const catalogs = Array.from({ length: 30 }, (_, i) => generateCatalog(i));
const locks = Array.from({ length: 5 }, (_, i) => generateLock(i));

const eventsData = {
  events: events,
  totalCount: events.length
};

const catalogsData = {
  catalogs: catalogs,
  totalCount: catalogs.length
};

const locksData = {
  locks: locks,
  totalCount: locks.length
};

const metadata = {
  lastUpdate: new Date().toISOString(),
  generatedBy: 'demo-generator',
  version: '1.0.0'
};

// Créer le dossier de sortie
const outputDir = path.join(__dirname, '..', 'web', 'public', 'static-data');
if (!fs.existsSync(outputDir)) {
  fs.mkdirSync(outputDir, { recursive: true });
}

// Écrire les fichiers
fs.writeFileSync(
  path.join(outputDir, 'events.json'),
  JSON.stringify(eventsData, null, 2)
);

fs.writeFileSync(
  path.join(outputDir, 'catalogs.json'),
  JSON.stringify(catalogsData, null, 2)
);

fs.writeFileSync(
  path.join(outputDir, 'locks.json'),
  JSON.stringify(locksData, null, 2)
);

fs.writeFileSync(
  path.join(outputDir, 'metadata.json'),
  JSON.stringify(metadata, null, 2)
);

console.log('✅ Demo data generated successfully!');
console.log(`   📊 Events: ${events.length}`);
console.log(`   📚 Catalogs: ${catalogs.length}`);
console.log(`   🔒 Locks: ${locks.length}`);
console.log(`   📁 Output: ${outputDir}`);
