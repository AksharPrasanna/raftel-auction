const UserPanel = ({ user, onLogout }) => {
    const playersNeeded = 16 - (user.players?.length || 0);
    const maxBid = playersNeeded > 1 ? user.budget - (playersNeeded - 1) : user.budget;
  
    return (
      <div className="card">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-2xl font-bold text-gray-800">{user.name}</h2>
          <button
            onClick={onLogout}
            className="text-sm text-red-600 hover:text-red-800 font-medium transition-colors"
          >
            🚪 Logout
          </button>
        </div>
        
        <div className="space-y-4 mb-6">
          <div className="card-gradient card-blue">
            <h3 className="text-sm opacity-90 mb-1">Total Budget</h3>
            <div className="text-2xl font-bold">€100M</div>
          </div>
          <div className="card-gradient card-green">
            <h3 className="text-sm opacity-90 mb-1">Remaining Budget</h3>
            <div className="text-2xl font-bold">€{user.budget}M</div>
          </div>
          <div className="card-gradient card-purple">
            <h3 className="text-sm opacity-90 mb-1">Max Next Bid</h3>
            <div className="text-2xl font-bold">€{Math.max(0, maxBid)}M</div>
            {playersNeeded > 1 && (
              <p className="text-xs opacity-75 mt-1">
                (Save for {playersNeeded - 1} more players)
              </p>
            )}
          </div>
        </div>
  
        <div>
          <h3 className="text-xl font-bold text-gray-800 mb-4">Your Squad ({user.players?.length || 0}/16)</h3>
          
          {/* Progress Bar */}
          <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
            <div 
              className="bg-blue-500 h-2 rounded-full transition-all duration-300"
              style={{ width: `${((user.players?.length || 0) / 16) * 100}%` }}
            ></div>
          </div>
  
          <div className="space-y-2 max-h-64 overflow-y-auto custom-scrollbar">
            {user.players?.length > 0 ? (
              user.players.map((player, index) => (
                <div key={index} className="bg-gray-50 p-3 rounded-lg border-l-4 border-green-500">
                  <div className="flex justify-between items-center">
                    <h4 className="font-semibold text-gray-800">{player.name}</h4>
                    <span className="text-green-600 font-bold">€{player.price}M</span>
                  </div>
                  <p className="text-xs text-gray-500 mt-1">Player #{index + 1}</p>
                </div>
              ))
            ) : (
              <div className="text-center py-12">
                <div className="text-6xl mb-4">⚽</div>
                <h4 className="text-lg font-semibold text-gray-600 mb-2">No Players Yet</h4>
                <p className="text-gray-500 text-sm">Start bidding to build your squad!</p>
              </div>
            )}
          </div>
  
          {/* Squad Stats */}
          {user.players?.length > 0 && (
            <div className="mt-4 p-3 bg-blue-50 rounded-lg">
              <div className="flex items-center justify-between text-sm">
                <span className="text-blue-700">Squad Completion:</span>
                <span className="font-semibold text-blue-800">
                  {Math.round(((user.players?.length || 0) / 16) * 100)}%
                </span>
              </div>
              {playersNeeded > 0 && (
                <p className="text-xs text-blue-600 mt-1">
                  {playersNeeded} more players needed
                </p>
              )}
            </div>
          )}
        </div>
      </div>
    );
  };
  
  export default UserPanel;