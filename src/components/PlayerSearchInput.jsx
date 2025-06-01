import { useState, useEffect, useRef } from 'react';
import { playerSearchService } from '../services/playerSearch.js';

const PlayerSearchInput = ({ value, onChange, placeholder, disabled }) => {
  const [searchResults, setSearchResults] = useState([]);
  const [showDropdown, setShowDropdown] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
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
    } else {
      setSearchResults([]);
      setShowDropdown(false);
    }
  };

  const handlePlayerSelect = (player) => {
    onChange(player.name);
    setShowDropdown(false);
    setSearchResults([]);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Escape') {
      setShowDropdown(false);
    }
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
              <div className="text-xs text-blue-600 font-medium">
                {player.position}
              </div>
            </div>
          ))}
        </div>
      )}

      {showDropdown && searchResults.length === 0 && value.length >= 2 && !isLoading && (
        <div className="absolute z-50 w-full mt-1 bg-white border border-gray-300 rounded-lg shadow-lg">
          <div className="px-4 py-3 text-gray-500 text-center">
            No players found matching "{value}"
          </div>
        </div>
      )}
    </div>
  );
};

export default PlayerSearchInput;