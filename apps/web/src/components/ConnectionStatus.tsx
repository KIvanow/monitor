import { useHealth } from '../hooks/useHealth';

function ConnectionStatus() {
  const { health, loading, error } = useHealth();

  if (loading) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
        <div className="text-center text-gray-500">Loading...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
        <div className="text-center">
          <div className="text-red-500 text-lg font-semibold mb-2">Connection Error</div>
          <div className="text-gray-600 text-sm">{error}</div>
        </div>
      </div>
    );
  }

  if (!health) {
    return null;
  }

  const statusColor =
    health.status === 'connected'
      ? 'text-green-600'
      : health.status === 'disconnected'
        ? 'text-red-600'
        : 'text-orange-600';

  const statusBgColor =
    health.status === 'connected'
      ? 'bg-green-100'
      : health.status === 'disconnected'
        ? 'bg-red-100'
        : 'bg-orange-100';

  return (
    <div className="bg-white rounded-lg shadow-lg p-8 max-w-2xl w-full">
      <div className="text-center mb-6">
        <h1 className="text-3xl font-bold text-gray-800 mb-4">BetterDB Monitor</h1>
        <div className="flex items-center justify-center gap-2">
          <span className={`px-4 py-2 rounded-md ${statusBgColor} ${statusColor} font-semibold capitalize`}>
            {health.status}
          </span>
        </div>
      </div>

      <div className="border-t border-gray-200 pt-6">
        <h2 className="text-lg font-semibold text-gray-700 mb-4">Database Information</h2>

        <div className="space-y-3">
          <div className="flex justify-between">
            <span className="text-gray-600">Type:</span>
            <span className="font-medium text-gray-900 capitalize">{health.database.type}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">Version:</span>
            <span className="font-medium text-gray-900">
              {health.database.version || 'N/A'}
            </span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">Host:</span>
            <span className="font-medium text-gray-900">{health.database.host}</span>
          </div>

          <div className="flex justify-between">
            <span className="text-gray-600">Port:</span>
            <span className="font-medium text-gray-900">{health.database.port}</span>
          </div>
        </div>
      </div>

      {health.capabilities && (
        <div className="border-t border-gray-200 pt-6 mt-6">
          <h2 className="text-lg font-semibold text-gray-700 mb-4">Capabilities</h2>

          <div className="space-y-3">
            <div className="flex justify-between">
              <span className="text-gray-600">Command Log:</span>
              <span
                className={`font-medium ${health.capabilities.hasCommandLog ? 'text-green-600' : 'text-gray-400'}`}
              >
                {health.capabilities.hasCommandLog ? 'Available' : 'Not Available'}
              </span>
            </div>

            <div className="flex justify-between">
              <span className="text-gray-600">Slot Stats:</span>
              <span
                className={`font-medium ${health.capabilities.hasSlotStats ? 'text-green-600' : 'text-gray-400'}`}
              >
                {health.capabilities.hasSlotStats ? 'Available' : 'Not Available'}
              </span>
            </div>
          </div>
        </div>
      )}

      {health.error && (
        <div className="border-t border-gray-200 pt-6 mt-6">
          <div className="bg-red-50 border border-red-200 rounded-md p-4">
            <div className="text-red-800 text-sm font-medium">Error</div>
            <div className="text-red-700 text-sm mt-1">{health.error}</div>
          </div>
        </div>
      )}

      <div className="border-t border-gray-200 pt-4 mt-6">
        <div className="text-xs text-gray-500 text-center">Auto-refreshes every 5 seconds</div>
      </div>
    </div>
  );
}

export default ConnectionStatus;
