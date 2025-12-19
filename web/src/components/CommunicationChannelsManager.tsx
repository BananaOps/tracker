import { useState } from 'react'
import { CommunicationType, type CommunicationChannel } from '../types/api'
import { Plus, Trash2, Mail, MessageSquare } from 'lucide-react'
import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faSlack, faDiscord, faTelegram, faMicrosoft } from '@fortawesome/free-brands-svg-icons'
import { faComments } from '@fortawesome/free-solid-svg-icons'

interface CommunicationChannelsManagerProps {
  channels: CommunicationChannel[]
  onChange: (channels: CommunicationChannel[]) => void
}

export default function CommunicationChannelsManager({ 
  channels, 
  onChange 
}: CommunicationChannelsManagerProps) {
  const [newChannel, setNewChannel] = useState<Partial<CommunicationChannel>>({
    type: CommunicationType.SLACK,
    name: '',
    url: '',
    description: ''
  })

  const addChannel = () => {
    if (!newChannel.name || !newChannel.url || !newChannel.type) return

    const channel: CommunicationChannel = {
      type: newChannel.type,
      name: newChannel.name,
      url: newChannel.url,
      description: newChannel.description || ''
    }

    onChange([...channels, channel])
    setNewChannel({
      type: CommunicationType.SLACK,
      name: '',
      url: '',
      description: ''
    })
  }

  const removeChannel = (index: number) => {
    onChange(channels.filter((_, i) => i !== index))
  }

  const getCommunicationChannelIcon = (type: CommunicationType) => {
    switch (type) {
      case CommunicationType.SLACK:
        return <FontAwesomeIcon icon={faSlack} className="w-4 h-4" />
      case CommunicationType.TEAMS:
        return <FontAwesomeIcon icon={faMicrosoft} className="w-4 h-4" />
      case CommunicationType.EMAIL:
        return <Mail className="w-4 h-4" />
      case CommunicationType.DISCORD:
        return <FontAwesomeIcon icon={faDiscord} className="w-4 h-4" />
      case CommunicationType.MATTERMOST:
        return <FontAwesomeIcon icon={faComments} className="w-4 h-4" />
      case CommunicationType.TELEGRAM:
        return <FontAwesomeIcon icon={faTelegram} className="w-4 h-4" />
      default:
        return <FontAwesomeIcon icon={faComments} className="w-4 h-4" />
    }
  }

  const getCommunicationChannelColor = (type: CommunicationType): string => {
    switch (type) {
      case CommunicationType.SLACK:
        return 'bg-purple-200 text-purple-900 dark:bg-purple-800 dark:text-purple-100 border border-purple-300 dark:border-purple-600'
      case CommunicationType.TEAMS:
        return 'bg-blue-200 text-blue-900 dark:bg-blue-800 dark:text-blue-100 border border-blue-300 dark:border-blue-600'
      case CommunicationType.EMAIL:
        return 'bg-red-200 text-red-900 dark:bg-red-800 dark:text-red-100 border border-red-300 dark:border-red-600'
      case CommunicationType.DISCORD:
        return 'bg-indigo-200 text-indigo-900 dark:bg-indigo-800 dark:text-indigo-100 border border-indigo-300 dark:border-indigo-600'
      case CommunicationType.MATTERMOST:
        return 'bg-cyan-200 text-cyan-900 dark:bg-cyan-800 dark:text-cyan-100 border border-cyan-300 dark:border-cyan-600'
      case CommunicationType.TELEGRAM:
        return 'bg-sky-200 text-sky-900 dark:bg-sky-800 dark:text-sky-100 border border-sky-300 dark:border-sky-600'
      default:
        return 'bg-gray-200 text-gray-900 dark:bg-gray-700 dark:text-gray-100 border border-gray-300 dark:border-gray-600'
    }
  }

  const getCommunicationChannelLabel = (type: CommunicationType): string => {
    switch (type) {
      case CommunicationType.SLACK:
        return 'Slack'
      case CommunicationType.TEAMS:
        return 'Microsoft Teams'
      case CommunicationType.EMAIL:
        return 'Email'
      case CommunicationType.DISCORD:
        return 'Discord'
      case CommunicationType.MATTERMOST:
        return 'Mattermost'
      case CommunicationType.TELEGRAM:
        return 'Telegram'
      default:
        return 'Communication'
    }
  }

  const getPlaceholderUrl = (type: CommunicationType): string => {
    switch (type) {
      case CommunicationType.SLACK:
        return 'https://yourteam.slack.com/channels/channel-name'
      case CommunicationType.TEAMS:
        return 'https://teams.microsoft.com/l/channel/...'
      case CommunicationType.EMAIL:
        return 'mailto:team@company.com'
      case CommunicationType.DISCORD:
        return 'https://discord.gg/invite-code'
      case CommunicationType.MATTERMOST:
        return 'https://mattermost.company.com/channels/channel-name'
      case CommunicationType.TELEGRAM:
        return 'https://t.me/channel_name'
      default:
        return 'https://...'
    }
  }

  return (
    <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg">
      <div className="p-6 border-b border-gray-200 dark:border-gray-700">
        <h3 className="text-lg font-semibold text-gray-900 dark:text-gray-100 flex items-center space-x-2">
          <MessageSquare className="w-5 h-5" />
          <span>Communication Channels</span>
        </h3>
        <p className="mt-1 text-sm text-gray-500 dark:text-gray-400">
          Add communication channels for this service (Slack, Teams, Email, etc.)
        </p>
      </div>
      <div className="p-6 space-y-4">
        {/* Existing Channels */}
        {channels.length > 0 && (
          <div className="space-y-2">
            <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Current Channels</label>
            <div className="space-y-2">
              {channels.map((channel, index) => (
                <div key={index} className="flex items-center justify-between p-3 border border-gray-200 dark:border-gray-700 rounded-lg">
                  <div className="flex items-center space-x-3">
                    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${getCommunicationChannelColor(channel.type)}`}>
                      <div className="flex items-center space-x-1">
                        {getCommunicationChannelIcon(channel.type)}
                        <span>{getCommunicationChannelLabel(channel.type)}</span>
                      </div>
                    </span>
                    <div>
                      <div className="font-medium text-sm text-gray-900 dark:text-gray-100">{channel.name}</div>
                      {channel.description && (
                        <div className="text-xs text-gray-500 dark:text-gray-400">{channel.description}</div>
                      )}
                    </div>
                  </div>
                  <div className="flex items-center space-x-2">
                    <a
                      href={channel.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-blue-600 hover:text-blue-700 dark:text-blue-400 dark:hover:text-blue-300"
                    >
                      Open
                    </a>
                    <button
                      onClick={() => removeChannel(index)}
                      className="p-2 text-gray-400 hover:text-red-500 hover:bg-red-50 dark:hover:bg-red-900/20 rounded-lg transition-colors"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Add New Channel */}
        <div className="space-y-4 p-4 border border-dashed border-gray-300 dark:border-gray-600 rounded-lg">
          <label className="text-sm font-medium text-gray-700 dark:text-gray-300">Add New Channel</label>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <label htmlFor="channel-type" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Type</label>
              <select
                id="channel-type"
                value={newChannel.type}
                onChange={(e) => setNewChannel(prev => ({ 
                  ...prev, 
                  type: e.target.value as CommunicationType,
                  url: '' // Reset URL when type changes
                }))}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
              >
                <option value={CommunicationType.SLACK}>Slack</option>
                <option value={CommunicationType.TEAMS}>Microsoft Teams</option>
                <option value={CommunicationType.EMAIL}>Email</option>
                <option value={CommunicationType.DISCORD}>Discord</option>
                <option value={CommunicationType.MATTERMOST}>Mattermost</option>
                <option value={CommunicationType.TELEGRAM}>Telegram</option>
              </select>
            </div>

            <div className="space-y-2">
              <label htmlFor="channel-name" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Name</label>
              <input
                type="text"
                id="channel-name"
                placeholder="e.g., #general, Support Team"
                value={newChannel.name}
                onChange={(e) => setNewChannel(prev => ({ ...prev, name: e.target.value }))}
                className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
              />
            </div>
          </div>

          <div className="space-y-2">
            <label htmlFor="channel-url" className="block text-sm font-medium text-gray-700 dark:text-gray-300">URL</label>
            <input
              type="url"
              id="channel-url"
              placeholder={getPlaceholderUrl(newChannel.type || CommunicationType.SLACK)}
              value={newChannel.url}
              onChange={(e) => setNewChannel(prev => ({ ...prev, url: e.target.value }))}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          <div className="space-y-2">
            <label htmlFor="channel-description" className="block text-sm font-medium text-gray-700 dark:text-gray-300">Description (Optional)</label>
            <input
              type="text"
              id="channel-description"
              placeholder="Brief description of this communication channel"
              value={newChannel.description}
              onChange={(e) => setNewChannel(prev => ({ ...prev, description: e.target.value }))}
              className="block w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md shadow-sm focus:outline-none focus:ring-blue-500 focus:border-blue-500 dark:bg-gray-700 dark:text-gray-100"
            />
          </div>

          <button
            onClick={addChannel}
            disabled={!newChannel.name || !newChannel.url || !newChannel.type}
            className="w-full btn-primary flex items-center justify-center space-x-2 disabled:opacity-50 disabled:cursor-not-allowed"
          >
            <Plus className="w-4 h-4" />
            <span>Add Channel</span>
          </button>
        </div>
      </div>
    </div>
  )
}
