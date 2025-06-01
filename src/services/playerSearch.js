import Papa from 'papaparse';

class PlayerSearchService {
  constructor() {
    this.players = [];
    this.isLoaded = false;
  }

  async loadPlayers() {
    if (this.isLoaded) return this.players;

    try {
      // Read the CSV file from public folder
      const response = await fetch('/combined_player_data.csv');
      const csvText = await response.text();
      
      const result = Papa.parse(csvText, {
        header: true,
        skipEmptyLines: true,
        dynamicTyping: true
      });

      this.players = result.data.map(player => ({
        id: player.player_id,
        name: player.full_name?.trim() || '',
        position: player.position?.trim() || '',
        url: player.url?.trim() || ''
      })).filter(player => player.name && player.position);

      this.isLoaded = true;
      console.log(`Loaded ${this.players.length} players from CSV`);
      return this.players;
    } catch (error) {
      console.error('Error loading player data:', error);
      return [];
    }
  }

  searchPlayers(query) {
    if (!query || query.length < 2) return [];
    
    const searchTerm = query.toLowerCase();
    return this.players
      .filter(player => 
        player.name.toLowerCase().includes(searchTerm)
      )
      .slice(0, 10) // Limit to 10 results
      .sort((a, b) => {
        // Prioritize exact matches at the start
        const aStartsWith = a.name.toLowerCase().startsWith(searchTerm);
        const bStartsWith = b.name.toLowerCase().startsWith(searchTerm);
        
        if (aStartsWith && !bStartsWith) return -1;
        if (!aStartsWith && bStartsWith) return 1;
        
        return a.name.localeCompare(b.name);
      });
  }

  getPlayerByName(name) {
    return this.players.find(player => 
      player.name.toLowerCase() === name.toLowerCase()
    );
  }
}

export const playerSearchService = new PlayerSearchService();