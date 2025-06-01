import { useState, useEffect } from 'react';
import { playerSearchService } from '../services/playerSearch.js';

const PlayerStatsDisplay = ({ playerName, isVisible }) => {
  const [playerData, setPlayerData] = useState(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isVisible && playerName) {
      loadPlayerData();
    }
  }, [playerName, isVisible]);

  const loadPlayerData = async () => {
    if (!playerName) return;

    setLoading(true);
    
    try {
      // Get player data from CSV
      const player = playerSearchService.getPlayerByName(playerName);
      
      if (player) {
        setPlayerData(player);
        console.log('Player data loaded:', player);
      } else {
        console.log('No data found for player:', playerName);
        setPlayerData(null);
      }
      
    } catch (err) {
      console.error('Error loading player data:', err);
      setPlayerData(null);
    }
    
    setLoading(false);
  };

  const handleViewStats = () => {
    if (playerData?.url) {
      window.open(playerData.url, '_blank', 'noopener,noreferrer');
    }
  };

  if (!isVisible || !playerName) return null;

  const getPositionIcon = (position) => {
    const icons = {
      'GK': '🥅', 'CB': '🛡️', 'LB': '⬅️', 'RB': '➡️',
      'CDM': '🔒', 'CM': '⚙️', 'CAM': '🎯', 
      'LW': '🏃‍♂️', 'RW': '🏃‍♂️', 'ST': '⚽'
    };
    return icons[position] || '⚽';
  };

  return (
    <div className="bg-white border-2 border-blue-300 rounded-xl p-4 mb-4 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800">📊 Player Information</h3>
        {loading && (
          <div className="flex items-center text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            Loading...
          </div>
        )}
      </div>

      {playerData ? (
        <div className="space-y-4">
          {/* Player Header */}
          <div className="text-center">
            <h4 className="text-2xl font-bold text-gray-800 flex items-center justify-center gap-2">
              {getPositionIcon(playerData.position)} {playerName}
            </h4>
            <p className="text-lg text-gray-600 mt-1">{playerData.position}</p>
          </div>

          {/* View Stats Button */}
          <div className="text-center">
            {playerData.url ? (
              <button
                onClick={handleViewStats}
                className="btn btn-primary flex items-center justify-center gap-2 mx-auto"
              >
                <span>🔗</span>
                <span>View Detailed Stats</span>
                <span>↗️</span>
              </button>
            ) : (
              <div className="text-gray-500 text-sm">
                No stats URL available for this player
              </div>
            )}
          </div>

          {/* Info Message */}
          <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 text-center">
            <p className="text-blue-700 text-sm">
              📈 Click the button above to view comprehensive FIFA stats, ratings, and player details in a new tab
            </p>
          </div>
        </div>
      ) : (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">❓</div>
          <h4 className="text-lg font-bold text-gray-700 mb-2">{playerName}</h4>
          <p className="text-gray-500 text-sm">Player not found in database</p>
          <div className="mt-4 bg-yellow-50 border border-yellow-200 rounded-lg p-3">
            <p className="text-yellow-700 text-sm">
              💡 This player may still be valid for nomination, but detailed stats are not available in our database
            </p>
          </div>
        </div>
      )}

      {!playerData && !loading && (
        <div className="text-center">
          <div className="text-4xl mb-2">📋</div>
          <p className="text-gray-500">Player information will appear here</p>
        </div>
      )}
    </div>
  );
};

export default PlayerStatsDisplay;