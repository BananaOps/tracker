import EventLinks from './EventLinks'

export default function LinksTest() {
  const testLinks = {
    pullRequestLink: 'https://github.com/energypool/infra/pull/123',
    ticket: 'INFRA-286',
  }

  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-bold mb-4">Test des liens</h3>
      
      <div className="space-y-4">
        <div>
          <p className="text-sm text-gray-600 mb-2">Liens de test :</p>
          <EventLinks links={testLinks} source="github_actions" />
        </div>

        <div className="text-xs text-gray-500 space-y-1">
          <p>PR Link: {testLinks.pullRequestLink}</p>
          <p>Ticket: {testLinks.ticket}</p>
          <p>VITE_JIRA_URL: {import.meta.env.VITE_JIRA_URL || 'non défini'}</p>
        </div>

        <div className="border-t pt-4">
          <p className="text-sm font-medium mb-2">Résultat attendu :</p>
          <p className="text-sm text-gray-600">🐙 PR #123   🎫 INFRA-286</p>
        </div>
      </div>
    </div>
  )
}
