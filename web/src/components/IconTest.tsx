import { FontAwesomeIcon } from '@fortawesome/react-fontawesome'
import { faRocket, faWrench, faCodeBranch, faFire } from '@fortawesome/free-solid-svg-icons'

export default function IconTest() {
  return (
    <div className="p-4 bg-white rounded-lg shadow">
      <h3 className="text-lg font-bold mb-4">Test des icônes Font Awesome</h3>
      <div className="space-y-2">
        <div className="flex items-center space-x-2">
          <FontAwesomeIcon icon={faRocket} className="w-5 h-5 text-blue-600" />
          <span>Rocket (Déploiement)</span>
        </div>
        <div className="flex items-center space-x-2">
          <FontAwesomeIcon icon={faWrench} className="w-5 h-5 text-purple-600" />
          <span>Wrench (Opération)</span>
        </div>
        <div className="flex items-center space-x-2">
          <FontAwesomeIcon icon={faCodeBranch} className="w-5 h-5 text-yellow-600" />
          <span>Code Branch (Drift)</span>
        </div>
        <div className="flex items-center space-x-2">
          <FontAwesomeIcon icon={faFire} className="w-5 h-5 text-red-600" />
          <span>Fire (Incident)</span>
        </div>
      </div>
    </div>
  )
}
