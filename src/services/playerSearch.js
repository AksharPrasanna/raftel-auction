import Papa from 'papaparse';
import { supabase } from './supabase.js';

class PlayerSearchService {
  constructor() {
    this.players = [];
    this.soldPlayers = new Set(); // Track sold players
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

      // Load sold players from database
      await this.loadSoldPlayers();

      this.isLoaded = true;
      console.log(`Loaded ${this.players.length} players from CSV`);
      console.log(`${this.soldPlayers.size} players already sold`);
      return this.players;
    } catch (error) {
      console.error('Error loading player data:', error);
      return [];
    }
  }

  async loadSoldPlayers() {
    try {
      // Get all teams and extract their players
      const { data: teams, error } = await supabase
        .from('teams')
        .select('players');

      if (error) {
        console.error('Error loading sold players:', error);
        return;
      }

      // Clear and rebuild sold players set
      this.soldPlayers.clear();
      
      teams?.forEach(team => {
        if (team.players && Array.isArray(team.players)) {
          team.players.forEach(player => {
            if (player.name) {
              this.soldPlayers.add(player.name.toLowerCase().trim());
            }
          });
        }
      });

      console.log(`Loaded ${this.soldPlayers.size} sold players:`, Array.from(this.soldPlayers));
    } catch (error) {
      console.error('Error loading sold players:', error);
    }
  }

  // Method to refresh sold players (call after each auction ends)
  async refreshSoldPlayers() {
    await this.loadSoldPlayers();
  }

  // Method to manually add a sold player (for immediate updates)
  addSoldPlayer(playerName) {
    if (playerName) {
      this.soldPlayers.add(playerName.toLowerCase().trim());
      console.log(`Added ${playerName} to sold players list`);
    }
  }

  // Method to check if a player is sold
  isPlayerSold(playerName) {
    return this.soldPlayers.has(playerName.toLowerCase().trim());
  }

  searchPlayers(query) {
    if (!query || query.length < 2) return [];
    
    const searchTerm = query.toLowerCase();
    return this.players
      .filter(player => {
        // Filter out sold players
        if (this.isPlayerSold(player.name)) {
          return false;
        }
        
        // Filter by search term
        return player.name.toLowerCase().includes(searchTerm);
      })
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
    const player = this.players.find(player => 
      player.name.toLowerCase() === name.toLowerCase()
    );
    
    // Return null if player is sold
    if (player && this.isPlayerSold(player.name)) {
      return null;
    }
    
    return player;
  }

  // Get statistics about available vs sold players
  getPlayerStats() {
    return {
      total: this.players.length,
      sold: this.soldPlayers.size,
      available: this.players.length - this.soldPlayers.size
    };
  }
}

export const playerSearchService = new PlayerSearchService();