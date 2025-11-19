import { eventsApi } from '../lib/api'
import { EventType, Priority, Status } from '../types/api'

export async function createTestEventWithLinks() {
  try {
    console.log('Creating test event with links...')
    
    const event = await eventsApi.create({
      title: 'Test Event avec liens Jira et GitHub',
      attributes: {
        message: 'Cet événement de test contient des liens vers GitHub et Jira',
        source: 'manual_test',
        type: EventType.DEPLOYMENT,
        priority: Priority.P3,
        service: 'test-service',
        status: Status.SUCCESS,
      },
      links: {
        pullRequestLink: 'https://github.com/energypool/infra/pull/123',
        ticket: 'INFRA-286',
      },
    })
    
    console.log('✅ Test event created:', event)
    alert('Événement de test créé avec succès ! Rafraîchissez la page.')
    return event
  } catch (error) {
    console.error('❌ Error creating test event:', error)
    alert('Erreur lors de la création de l\'événement de test')
    return null
  }
}
