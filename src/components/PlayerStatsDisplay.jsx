import { useState, useEffect } from 'react';
import { playerDataScraper } from '../services/playerDataScraper.js';
import { playerSearchService } from '../services/playerSearch.js';

const PlayerStatsDisplay = ({ playerName, isVisible }) => {
  const [playerData, setPlayerData] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [showDetailed, setShowDetailed] = useState(false);

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
      // Find player in CSV data to get basic info
      const player = playerSearchService.getPlayerByName(playerName);
      
      if (!player) {
        // Generate mock data for unknown players
        const mockData = generatePlayerMockData(playerName);
        setPlayerData(mockData);
        setLoading(false);
        return;
      }

      // Try to get enhanced stats, but fallback to mock data
      let stats;
      try {
        if (player.url) {
          console.log(`Attempting to scrape: ${player.url}`);
          stats = await playerDataScraper.scrapePlayerData(player.url);
        } else {
          throw new Error('No URL available');
        }
      } catch (scrapeError) {
        console.log('Scraping failed, using mock data:', scrapeError);
        stats = generatePlayerMockData(playerName, player.position);
      }
      
      setPlayerData({ ...stats, position: player.position || stats.position });
      
    } catch (err) {
      console.error('Error loading player stats:', err);
      setError('Using estimated stats - real data unavailable');
      // Still show mock data even on error
      const mockData = generatePlayerMockData(playerName);
      setPlayerData(mockData);
    }
    
    setLoading(false);
  };

  const generatePlayerMockData = (name, position = null) => {
    // Position-specific mock data generation
    const positions = ['GK', 'CB', 'LB', 'RB', 'CDM', 'CM', 'CAM', 'LW', 'RW', 'ST'];
    const playerPosition = position || positions[Math.floor(Math.random() * positions.length)];
    
    const overall = Math.floor(Math.random() * 30) + 60;
    
    const generateStat = (base, modifier = 0) => {
      const variance = 10;
      return Math.max(30, Math.min(99, base + modifier + Math.floor(Math.random() * variance) - variance/2));
    };

    // Position-specific adjustments
    let positionMods = {};
    switch(playerPosition) {
      case 'ST':
        positionMods = { shooting: 15, pace: 10, physical: 5, defending: -30 };
        break;
      case 'CAM':
        positionMods = { passing: 15, dribbling: 10, shooting: 5, defending: -20 };
        break;
      case 'CM':
        positionMods = { passing: 10, dribbling: 5, defending: 5 };
        break;
      case 'CDM':
        positionMods = { defending: 15, passing: 5, physical: 5, pace: -5 };
        break;
      case 'CB':
        positionMods = { defending: 20, physical: 10, pace: -10, dribbling: -15 };
        break;
      case 'GK':
        positionMods = { defending: 25, physical: 15, pace: -25, shooting: -35, dribbling: -20 };
        break;
      default:
        positionMods = {};
    }

    return {
      overall,
      pace: generateStat(overall, positionMods.pace || 0),
      shooting: generateStat(overall, positionMods.shooting || 0),
      passing: generateStat(overall, positionMods.passing || 0),
      dribbling: generateStat(overall, positionMods.dribbling || 0),
      defending: generateStat(overall, positionMods.defending || 0),
      physical: generateStat(overall, positionMods.physical || 0),
      position: playerPosition,
      age: Math.floor(Math.random() * 15) + 18,
      height: `${Math.floor(Math.random() * 30) + 165}cm`,
      weight: `${Math.floor(Math.random() * 30) + 60}kg`,
      foot: Math.random() > 0.15 ? 'Right' : 'Left',
      workRate: ['High/High', 'High/Medium', 'Medium/High', 'Medium/Medium'][Math.floor(Math.random() * 4)],
      weakFoot: Math.floor(Math.random() * 3) + 2,
      skillMoves: Math.floor(Math.random() * 4) + 2,
      isEstimated: true,
      
      // Add detailed stats for FIFA-style display
      detailedStats: {
        attacking: {
          crossing: generateStat(overall, -5),
          finishing: generateStat(overall, positionMods.shooting || 0),
          headingAccuracy: generateStat(overall, -5),
          shortPassing: generateStat(overall, positionMods.passing || 0),
          volleys: generateStat(overall, -5)
        },
        skill: {
          dribbling: generateStat(overall, positionMods.dribbling || 0),
          curve: generateStat(overall, -10),
          fkAccuracy: generateStat(overall, -15),
          longPassing: generateStat(overall, -5),
          ballControl: generateStat(overall, positionMods.dribbling || 0)
        },
        movement: {
          acceleration: generateStat(overall, positionMods.pace || 0),
          sprintSpeed: generateStat(overall, positionMods.pace || 0),
          agility: generateStat(overall, -5),
          reactions: generateStat(overall, 5),
          balance: generateStat(overall, -10)
        },
        power: {
          shotPower: generateStat(overall, positionMods.shooting || 0),
          jumping: generateStat(overall, -5),
          stamina: generateStat(overall, -5),
          strength: generateStat(overall, positionMods.physical || 0),
          longShots: generateStat(overall, -10)
        },
        mentality: {
          aggression: generateStat(overall, -20),
          interceptions: generateStat(overall, positionMods.defending || -25),
          attPosition: generateStat(overall, positionMods.shooting || 0),
          vision: generateStat(overall, positionMods.passing || 0),
          penalties: generateStat(overall, -10),
          composure: generateStat(overall, 5)
        },
        defending: {
          defensiveAwareness: generateStat(overall, positionMods.defending || -25),
          standingTackle: generateStat(overall, positionMods.defending || -30),
          slidingTackle: generateStat(overall, positionMods.defending || -35)
        },
        goalkeeping: {
          gkDiving: playerPosition === 'GK' ? generateStat(overall, 10) : Math.floor(Math.random() * 20) + 5,
          gkHandling: playerPosition === 'GK' ? generateStat(overall, 5) : Math.floor(Math.random() * 20) + 5,
          gkKicking: playerPosition === 'GK' ? generateStat(overall, -5) : Math.floor(Math.random() * 15) + 5,
          gkPositioning: playerPosition === 'GK' ? generateStat(overall, 0) : Math.floor(Math.random() * 15) + 5,
          gkReflexes: playerPosition === 'GK' ? generateStat(overall, 15) : Math.floor(Math.random() * 15) + 5
        }
      },
      
      playStyles: playerPosition === 'ST' ? ['Finesse Shot', 'Power Shot', 'Incisive Pass'] :
                  playerPosition === 'CAM' ? ['Incisive Pass', 'First Touch', 'Technical'] :
                  playerPosition === 'CB' ? ['Block', 'Intercept', 'Slide Tackle'] :
                  ['First Touch', 'Incisive Pass', 'Technical']
    };
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

  const getPositionIcon = (position) => {
    const icons = {
      'GK': '🥅', 'CB': '🛡️', 'LB': '⬅️', 'RB': '➡️',
      'CDM': '🔒', 'CM': '⚙️', 'CAM': '🎯', 
      'LW': '🏃‍♂️', 'RW': '🏃‍♂️', 'ST': '⚽'
    };
    return icons[position] || '⚽';
  };

  // Test scraping function for debugging
  const testScraping = async () => {
    if (playerData && !playerData.isEstimated) {
      console.log('Already have real data');
      return;
    }
    
    const player = playerSearchService.getPlayerByName(playerName);
    if (player && player.url) {
      setLoading(true);
      try {
        console.log('Testing scraping for:', player.url);
        const result = await playerDataScraper.testScraping(player.url);
        if (result) {
          setPlayerData({ ...result, position: player.position });
          setError(null);
        }
      } catch (error) {
        console.error('Test scraping failed:', error);
        setError('Scraping test failed');
      }
      setLoading(false);
    }
  };

  return (
    <div className="bg-white border-2 border-blue-300 rounded-xl p-4 mb-4 shadow-lg">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-800">📊 Player Statistics</h3>
        <div className="flex items-center gap-2">
          {loading && (
            <div className="flex items-center text-blue-600">
              <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600 mr-2"></div>
              Loading...
            </div>
          )}
          {playerData?.isEstimated && (
            <button
              onClick={testScraping}
              className="text-xs bg-blue-500 text-white px-2 py-1 rounded hover:bg-blue-600"
              title="Try to get real data"
            >
              🔄 Retry Real Data
            </button>
          )}
        </div>
      </div>

      {error && (
        <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-3 mb-4">
          <p className="text-yellow-700 text-sm">⚠️ {error}</p>
          <p className="text-yellow-600 text-xs mt-1">Showing estimated stats based on player profile</p>
        </div>
      )}

      {playerData?.isEstimated && (
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-3 mb-4">
          <p className="text-blue-700 text-sm">ℹ️ These are estimated statistics</p>
          <p className="text-blue-600 text-xs mt-1">Real data may vary. Stats generated based on position and player profile.</p>
        </div>
      )}

      {playerData && (
        <div className="space-y-4">
          {/* Player Header */}
          <div className="flex items-center justify-between">
            <div>
              <h4 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                {getPositionIcon(playerData.position)} {playerName}
              </h4>
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
              { label: 'PAC', value: playerData.pace, tooltip: 'Pace' },
              { label: 'SHO', value: playerData.shooting, tooltip: 'Shooting' },
              { label: 'PAS', value: playerData.passing, tooltip: 'Passing' },
              { label: 'DRI', value: playerData.dribbling, tooltip: 'Dribbling' },
              { label: 'DEF', value: playerData.defending, tooltip: 'Defending' },
              { label: 'PHY', value: playerData.physical, tooltip: 'Physical' }
            ].map((attr, index) => (
              <div key={index} className="text-center" title={attr.tooltip}>
                <div className={`mx-auto w-12 h-12 rounded-full flex items-center justify-center text-sm font-bold ${getRatingColor(attr.value)}`}>
                  {attr.value}
                </div>
                <div className="text-xs text-gray-600 mt-1">{attr.label}</div>
              </div>
            ))}
          </div>

          {/* Toggle Detailed Stats */}
          <div className="text-center">
            <button
              onClick={() => setShowDetailed(!showDetailed)}
              className="btn btn-sm bg-gray-100 text-gray-700 hover:bg-gray-200"
            >
              {showDetailed ? '📊 Hide' : '📊 Show'} Detailed FIFA Stats
            </button>
          </div>

          {/* Detailed FIFA Stats */}
          {showDetailed && playerData.detailedStats && (
            <div className="bg-gray-50 rounded-lg p-4 space-y-4">
              
              {/* Attacking */}
              <div>
                <h5 className="font-bold text-gray-800 mb-2">⚔️ Attacking</h5>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Crossing:</span>
                    <span className={`font-bold px-2 py-1 rounded ${getRatingColor(playerData.detailedStats.attacking.crossing)}`}>
                      {playerData.detailedStats.attacking.crossing}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Finishing:</span>
                    <span className={`font-bold px-2 py-1 rounded ${getRatingColor(playerData.detailedStats.attacking.finishing)}`}>
                      {playerData.detailedStats.attacking.finishing}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Heading accuracy:</span>
                    <span className={`font-bold px-2 py-1 rounded ${getRatingColor(playerData.detailedStats.attacking.headingAccuracy)}`}>
                      {playerData.detailedStats.attacking.headingAccuracy}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Short passing:</span>
                    <span className={`font-bold px-2 py-1 rounded ${getRatingColor(playerData.detailedStats.attacking.shortPassing)}`}>
                      {playerData.detailedStats.attacking.shortPassing}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Volleys:</span>
                    <span className={`font-bold px-2 py-1 rounded ${getRatingColor(playerData.detailedStats.attacking.volleys)}`}>
                      {playerData.detailedStats.attacking.volleys}
                    </span>
                  </div>
                </div>
              </div>

              {/* Skill */}
              <div>
                <h5 className="font-bold text-gray-800 mb-2">🎯 Skill</h5>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Dribbling:</span>
                    <span className={`font-bold px-2 py-1 rounded ${getRatingColor(playerData.detailedStats.skill.dribbling)}`}>
                      {playerData.detailedStats.skill.dribbling}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Curve:</span>
                    <span className={`font-bold px-2 py-1 rounded ${getRatingColor(playerData.detailedStats.skill.curve)}`}>
                      {playerData.detailedStats.skill.curve}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">FK Accuracy:</span>
                    <span className={`font-bold px-2 py-1 rounded ${getRatingColor(playerData.detailedStats.skill.fkAccuracy)}`}>
                      {playerData.detailedStats.skill.fkAccuracy}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Long passing:</span>
                    <span className={`font-bold px-2 py-1 rounded ${getRatingColor(playerData.detailedStats.skill.longPassing)}`}>
                      {playerData.detailedStats.skill.longPassing}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Ball control:</span>
                    <span className={`font-bold px-2 py-1 rounded ${getRatingColor(playerData.detailedStats.skill.ballControl)}`}>
                      {playerData.detailedStats.skill.ballControl}
                    </span>
                  </div>
                </div>
              </div>

              {/* Movement */}
              <div>
                <h5 className="font-bold text-gray-800 mb-2">🏃‍♂️ Movement</h5>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Acceleration:</span>
                    <span className={`font-bold px-2 py-1 rounded ${getRatingColor(playerData.detailedStats.movement.acceleration)}`}>
                      {playerData.detailedStats.movement.acceleration}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sprint speed:</span>
                    <span className={`font-bold px-2 py-1 rounded ${getRatingColor(playerData.detailedStats.movement.sprintSpeed)}`}>
                      {playerData.detailedStats.movement.sprintSpeed}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Agility:</span>
                    <span className={`font-bold px-2 py-1 rounded ${getRatingColor(playerData.detailedStats.movement.agility)}`}>
                      {playerData.detailedStats.movement.agility}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Reactions:</span>
                    <span className={`font-bold px-2 py-1 rounded ${getRatingColor(playerData.detailedStats.movement.reactions)}`}>
                      {playerData.detailedStats.movement.reactions}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Balance:</span>
                    <span className={`font-bold px-2 py-1 rounded ${getRatingColor(playerData.detailedStats.movement.balance)}`}>
                      {playerData.detailedStats.movement.balance}
                    </span>
                  </div>
                </div>
              </div>

              {/* Power */}
              <div>
                <h5 className="font-bold text-gray-800 mb-2">💪 Power</h5>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Shot power:</span>
                    <span className={`font-bold px-2 py-1 rounded ${getRatingColor(playerData.detailedStats.power.shotPower)}`}>
                      {playerData.detailedStats.power.shotPower}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Jumping:</span>
                    <span className={`font-bold px-2 py-1 rounded ${getRatingColor(playerData.detailedStats.power.jumping)}`}>
                      {playerData.detailedStats.power.jumping}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Stamina:</span>
                    <span className={`font-bold px-2 py-1 rounded ${getRatingColor(playerData.detailedStats.power.stamina)}`}>
                      {playerData.detailedStats.power.stamina}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Strength:</span>
                    <span className={`font-bold px-2 py-1 rounded ${getRatingColor(playerData.detailedStats.power.strength)}`}>
                      {playerData.detailedStats.power.strength}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Long shots:</span>
                    <span className={`font-bold px-2 py-1 rounded ${getRatingColor(playerData.detailedStats.power.longShots)}`}>
                      {playerData.detailedStats.power.longShots}
                    </span>
                  </div>
                </div>
              </div>

              {/* Mentality */}
              <div>
                <h5 className="font-bold text-gray-800 mb-2">🧠 Mentality</h5>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Aggression:</span>
                    <span className={`font-bold px-2 py-1 rounded ${getRatingColor(playerData.detailedStats.mentality.aggression)}`}>
                      {playerData.detailedStats.mentality.aggression}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Interceptions:</span>
                    <span className={`font-bold px-2 py-1 rounded ${getRatingColor(playerData.detailedStats.mentality.interceptions)}`}>
                      {playerData.detailedStats.mentality.interceptions}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Att. Position:</span>
                    <span className={`font-bold px-2 py-1 rounded ${getRatingColor(playerData.detailedStats.mentality.attPosition)}`}>
                      {playerData.detailedStats.mentality.attPosition}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Vision:</span>
                    <span className={`font-bold px-2 py-1 rounded ${getRatingColor(playerData.detailedStats.mentality.vision)}`}>
                      {playerData.detailedStats.mentality.vision}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Penalties:</span>
                    <span className={`font-bold px-2 py-1 rounded ${getRatingColor(playerData.detailedStats.mentality.penalties)}`}>
                      {playerData.detailedStats.mentality.penalties}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Composure:</span>
                    <span className={`font-bold px-2 py-1 rounded ${getRatingColor(playerData.detailedStats.mentality.composure)}`}>
                      {playerData.detailedStats.mentality.composure}
                    </span>
                  </div>
                </div>
              </div>

              {/* Defending */}
              <div>
                <h5 className="font-bold text-gray-800 mb-2">🛡️ Defending</h5>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">Defensive awareness:</span>
                    <span className={`font-bold px-2 py-1 rounded ${getRatingColor(playerData.detailedStats.defending.defensiveAwareness)}`}>
                      {playerData.detailedStats.defending.defensiveAwareness}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Standing tackle:</span>
                    <span className={`font-bold px-2 py-1 rounded ${getRatingColor(playerData.detailedStats.defending.standingTackle)}`}>
                      {playerData.detailedStats.defending.standingTackle}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">Sliding tackle:</span>
                    <span className={`font-bold px-2 py-1 rounded ${getRatingColor(playerData.detailedStats.defending.slidingTackle)}`}>
                      {playerData.detailedStats.defending.slidingTackle}
                    </span>
                  </div>
                </div>
              </div>

              {/* Goalkeeping */}
              <div>
                <h5 className="font-bold text-gray-800 mb-2">🥅 Goalkeeping</h5>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  <div className="flex justify-between">
                    <span className="text-gray-600">GK Diving:</span>
                    <span className={`font-bold px-2 py-1 rounded ${getRatingColor(playerData.detailedStats.goalkeeping.gkDiving)}`}>
                      {playerData.detailedStats.goalkeeping.gkDiving}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">GK Handling:</span>
                    <span className={`font-bold px-2 py-1 rounded ${getRatingColor(playerData.detailedStats.goalkeeping.gkHandling)}`}>
                      {playerData.detailedStats.goalkeeping.gkHandling}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">GK Kicking:</span>
                    <span className={`font-bold px-2 py-1 rounded ${getRatingColor(playerData.detailedStats.goalkeeping.gkKicking)}`}>
                      {playerData.detailedStats.goalkeeping.gkKicking}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">GK Positioning:</span>
                    <span className={`font-bold px-2 py-1 rounded ${getRatingColor(playerData.detailedStats.goalkeeping.gkPositioning)}`}>
                      {playerData.detailedStats.goalkeeping.gkPositioning}
                    </span>
                  </div>
                  <div className="flex justify-between">
                    <span className="text-gray-600">GK Reflexes:</span>
                    <span className={`font-bold px-2 py-1 rounded ${getRatingColor(playerData.detailedStats.goalkeeping.gkReflexes)}`}>
                      {playerData.detailedStats.goalkeeping.gkReflexes}
                    </span>
                  </div>
                </div>
              </div>

              {/* PlayStyles */}
              {playerData.playStyles && playerData.playStyles.length > 0 && (
                <div>
                  <h5 className="font-bold text-gray-800 mb-2">⭐ PlayStyles</h5>
                  <div className="flex flex-wrap gap-2">
                    {playerData.playStyles.map((style, index) => (
                      <span key={index} className="px-3 py-1 bg-blue-100 text-blue-800 text-sm rounded-full">
                        {style}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Basic Player Info */}
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

          {/* Debug Info - Remove in production */}
          {playerData.isEstimated && (
            <div className="bg-gray-100 rounded-lg p-3 text-xs">
              <p className="text-gray-600 mb-1">🔧 Debug Info:</p>
              <p className="text-gray-500">Position: {playerData.position}</p>
              <p className="text-gray-500">Data Source: {playerData.isEstimated ? 'Estimated' : 'Real'}</p>
              {playerData.url && (
                <p className="text-gray-500 truncate">URL: {playerData.url}</p>
              )}
            </div>
          )}
        </div>
      )}

      {!playerData && !loading && (
        <div className="text-center py-8">
          <div className="text-4xl mb-2">📊</div>
          <p className="text-gray-500">No player data available</p>
        </div>
      )}
    </div>
  );
};

export default PlayerStatsDisplay;