import { useState, useEffect } from 'react';
import { playerDataScraper } from '../services/playerDataScraper.js';
import { playerSearchService } from '../services/playerSearch.js';

const PlayerStatsDisplay = ({ playerName, isVisible }) => {
  const [playerData, setPlayerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  useEffect(() => {
    if (isVisible && playerName) {
      loadPlayerStats();
    }
  }, [playerName, isVisible]);

  const loadPlayerStats = async () => {
    if (!playerName) return;

    setLoading(true);
    setError(null);
    
    try {
      // Find player in CSV data to get URL
      const player = playerSearchService.getPlayerByName(playerName);
      
      if (!player || !player.url) {
        setError('Player URL not found in database');
        setLoading(false);
        return;
      }

      // Scrape player data from URL
      const stats = await playerDataScraper.scrapePlayerData(player.url);
      setPlayerData({ ...stats, position: player.position });
      
    } catch (err) {
      console.error('Error loading player stats:', err);
      setError('Failed to load player statistics');
    }
    
    setLoading(false);
  };

  if (!isVisible || !playerName) return null;

  const getRatingColor = (rating) => {
    if (rating >= 85) return 'text-green-600 bg-green-100';
    if (rating >= 75) return 'text-yellow-600 bg-yellow-100';
    if (rating >= 65) return 'text-orange-600 bg-orange-100';
    return 'text-red-600 bg-red-100';
  };

  const getOverallColor = (rating) => {
    if (rating >= 90) return 'bg-gradient-to-r from-yellow-400 to-yellow-600';
    if (rating >= 85) return 'bg-gradient-to-r from-green-500 to-green-600';
    if (rating >= 80) return 'bg-gradient-to-r from-blue-500 to-blue-600';
    if (rating >= 75) return 'bg-gradient-to-r from-purple-500 to-purple-600';
    if (rating >= 70) return 'bg-gradient-to-r from-gray-500 to-gray-600';
    return 'bg-gradient-to-r from-red-500 to-red-600';
  };

  return (
    <div className="bg-white border-2 border-blue-300 rounded-xl p-4 mb-4 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800">📊 Player Statistics</h3>
        {loading && (
          <div className="flex items-center text-blue-600">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
            Loading stats...
          </div>
        )}
      </div>

      {error && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-3 mb-4">
          <p className="text-red-700 text-sm">⚠️ {error}</p>
          <p className="text-red-600 text-xs mt-1">Showing estimated stats based on player profile</p>
        </div>
      )}

      {playerData && (
        <div className="space-y-4">
          {/* Player Header */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xl font-bold text-gray-800">{playerName}</h4>
              <p className="text-gray-600">{playerData.position}</p>
            </div>
            <div className={`${getOverallColor(playerData.overall)} text-white px-4 py-2 rounded-lg text-center`}>
              <div className="text-2xl font-bold">{playerData.overall}</div>
              <div className="text-xs">OVERALL</div>
            </div>
          </div>

          {/* Main Attributes */}
          <div className="grid grid-cols-3 gap-3">
            {[
              { label: 'PAC', value: playerData.pace },
              { label: 'SHO', value: playerData.shooting },
              { label: 'PAS', value: playerData.passing },
              { label: 'DRI', value: playerData.dribbling },
              { label: 'DEF', value: playerData.defending },
              { label: 'PHY', value: playerData.physical }
            ].map((attr, index) => (
              <div key={index} className="text-center">
                <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${getRatingColor(attr.value)}`}>
                  {attr.value}
                </div>
                <div className="text-xs text-gray-600 mt-1">{attr.label}</div>
              </div>
            ))}
          </div>

          {/* Additional Info */}
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div className="space-y-2">
              {playerData.age && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Age:</span>
                  <span className="font-semibold">{playerData.age}</span>
                </div>
              )}
              {playerData.height && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Height:</span>
                  <span className="font-semibold">{playerData.height}</span>
                </div>
              )}
              {playerData.weight && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Weight:</span>
                  <span className="font-semibold">{playerData.weight}</span>
                </div>
              )}
            </div>
            <div className="space-y-2">
              {playerData.foot && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Preferred Foot:</span>
                  <span className="font-semibold">{playerData.foot}</span>
                </div>
              )}
              {playerData.weakFoot && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Weak Foot:</span>
                  <span className="font-semibold">{'⭐'.repeat(playerData.weakFoot)}</span>
                </div>
              )}
              {playerData.skillMoves && (
                <div className="flex justify-between">
                  <span className="text-gray-600">Skill Moves:</span>
                  <span className="font-semibold">{'⭐'.repeat(playerData.skillMoves)}</span>
                </div>
              )}
            </div>
          </div>

          {playerData.workRate && (
            <div className="text-center bg-gray-50 rounded-lg p-2">
              <span className="text-gray-600 text-sm">Work Rate: </span>
              <span className="font-semibold text-sm">{playerData.workRate}</span>
            </div>
          )}
        </div>
      )}
    </div>
  );
};

export default PlayerStatsDisplay;