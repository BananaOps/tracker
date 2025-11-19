// Utilitaire pour tester l'API et voir les données brutes
export async function testEventsApi() {
  try {
    const response = await fetch('/api/v1alpha1/events/list?per_page=5')
    const data = await response.json()
    
    console.log('📡 Test API - Réponse brute:', data)
    
    if (data.events && data.events.length > 0) {
      console.log('📊 Premier événement:', data.events[0])
      console.log('📊 Type du premier événement:', {
        'attributes.type': data.events[0].attributes?.type,
        'typeof': typeof data.events[0].attributes?.type,
      })
      
      // Afficher tous les types
      data.events.forEach((event: any, index: number) => {
        console.log(`Event ${index + 1}:`, {
          title: event.title,
          type: event.attributes?.type,
          typeof: typeof event.attributes?.type,
        })
      })
    } else {
      console.log('⚠️ Aucun événement trouvé')
    }
    
    return data
  } catch (error) {
    console.error('❌ Erreur lors du test API:', error)
    return null
  }
}

// Appeler cette fonction depuis la console du navigateur :
// import { testEventsApi } from './utils/testApi'
// testEventsApi()
