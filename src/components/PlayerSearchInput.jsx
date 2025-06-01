import { useState, useEffect, useRef } from 'react';
import { playerSearchService } from '../services/playerSearch.js';

const PlayerSearchInput = ({ value, onChange, placeholder, disabled }) => {
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [soldPlayerSearched, setSoldPlayerSearched] = useState(false);
  const inputRef = useRef(null);
  const dropdownRef = useRef(null);

  useEffect(() => {
    // Load player data on component mount
    const initializePlayerData = async () => {
      setIsLoading(true);
      await playerSearchService.loadPlayers();
      setIsLoading(false);
    };
    
    initializePlayerData();
  }, []);

  useEffect(() => {
    // Close dropdown when clicking outside
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setShowDropdown(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleInputChange = (e) => {
    const query = e.target.value;
    onChange(query);

    if (query.length >= 2) {
      const results = playerSearchService.searchPlayers(query);
      setSearchResults(results);
      setShowDropdown(true);
      
      // Check if user searched for a sold player
      if (results.length === 0 && query.length >= 3) {
        // Check if there would be results if we didn't filter sold players
        const allPlayers = playerSearchService.players || [];
        const wouldHaveResults = allPlayers.some(player => 
          player.name.toLowerCase().includes(query.toLowerCase())
        );
        setSoldPlayerSearched(wouldHaveResults);
      } else {
        setSoldPlayerSearched(false);
      }
    } else {
      setSearchResults([]);
      setShowDropdown(false);
      setSoldPlayerSearched(false);
    }
  };

  const handlePlayerSelect = (player) => {
    onChange(player.name);
    setShowDropdown(false);
    setSearchResults([]);
    setSoldPlayerSearched(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowDropdown(false);
    }
  };

  const getPlayerStats = () => {
    return playerSearchService.getPlayerStats();
  };

  return (
    <div className="relative" ref={dropdownRef}>
      <input
        ref={inputRef}
        type="text"
        value={value}
        onChange={handleInputChange}
        onKeyDown={handleKeyDown}
        placeholder={isLoading ? "Loading players..." : placeholder}
        disabled={disabled || isLoading}
        className="w-full p-3 border-2 border-gray-300 rounded-lg focus:border-blue-500 focus:outline-none transition-colors"
        autoComplete="off"
      />
      
      {isLoading && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2">
          <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-500"></div>
        </div>
      )}

      {/* Show available player count */}
      {!isLoading && value.length < 2 && (
        <div className="absolute right-3 top-1/2 transform -translate-y-1/2 text-xs text-gray-400">
          {(() => {
            const stats = getPlayerStats();
            return `${stats.available} available`;
          })()}
        </div>
      )}

      {/* Search results dropdown */}
      {showDropdown && searchResults.length > 0 && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg max-h-60 overflow-y-auto">
          {searchResults.map((player, index) => (
            <div
              key={player.id || index}
              onClick={() => handlePlayerSelect(player)}
              className="px-4 py-3 hover:bg-blue-50 cursor-pointer border-b border-gray-100 last:border-b-0 flex justify-between items-center"
            >
              <div>
                <div className="font-semibold text-gray-800">{player.name}</div>
                <div className="text-sm text-gray-500">{player.position}</div>
              </div>
              <div className="text-xs text-green-600 font-medium bg-green-100 px-2 py-1 rounded">
                Available
              </div>
            </div>
          ))}
        </div>
      )}

      {/* No results / sold player message */}
      {showDropdown && searchResults.length === 0 && value.length >= 2 && !isLoading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
          {soldPlayerSearched ? (
            <div className="px-4 py-3 text-center">
              <div className="text-red-600 font-semibold text-sm mb-1">
                🚫 Player Already Sold
              </div>
              <div className="text-gray-500 text-xs">
                "{value}" has already been purchased by another team
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Try searching for a different player
              </div>
            </div>
          ) : (
            <div className="px-4 py-3 text-center">
              <div className="text-gray-600 font-semibold text-sm mb-1">
                🔍 No available players found
              </div>
              <div className="text-gray-500 text-xs">
                No players matching "{value}" are available for nomination
              </div>
              <div className="text-xs text-gray-400 mt-1">
                Try a different name or check spelling
              </div>
            </div>
          )}
        </div>
      )}

      {/* Player statistics summary when not searching */}
      {!isLoading && !showDropdown && value.length === 0 && (
        <div className="mt-2 text-xs text-gray-500 flex justify-between items-center">
          <span>
            {(() => {
              const stats = getPlayerStats();
              return `${stats.available} players available to nominate`;
            })()}
          </span>
          <span className="text-gray-400">
            {(() => {
              const stats = getPlayerStats();
              return `${stats.sold} already sold`;
            })()}
          </span>
        </div>
      )}

      {/* Show search hint when user starts typing */}
      {!isLoading && value.length === 1 && (
        <div className="mt-2 text-xs text-gray-400 text-center">
          Type at least 2 characters to search...
        </div>
      )}
    </div>
  );
};

export default PlayerSearchInput;