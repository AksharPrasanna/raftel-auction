class PlayerDataScraper {
    constructor() {
      this.cache = new Map();
      this.loadingPlayers = new Set();
      this.corsProxies = [
        'https://api.allorigins.win/get?url=',
        'https://corsproxy.io/?',
        'https://cors-anywhere.herokuapp.com/',
        'https://api.codetabs.com/v1/proxy?quest='
      ];
    }
  
    async scrapePlayerData(url) {
      if (!url) return this.generateMockData();
      
      // Check cache first
      if (this.cache.has(url)) {
        return this.cache.get(url);
      }
  
      // Prevent multiple requests for same player
      if (this.loadingPlayers.has(url)) {
        return new Promise((resolve) => {
          const checkCache = () => {
            if (this.cache.has(url)) {
              resolve(this.cache.get(url));
            } else {
              setTimeout(checkCache, 100);
            }
          };
          checkCache();
        });
      }
  
      this.loadingPlayers.add(url);
  
      try {
        console.log(`Attempting to scrape FIFA stats from: ${url}`);
        
        // Try multiple CORS proxies
        let playerData = null;
        for (let i = 0; i < this.corsProxies.length; i++) {
          try {
            playerData = await this.tryProxy(this.corsProxies[i], url);
            if (playerData && playerData.overall > 0) {
              console.log(`Successfully scraped FIFA data using proxy ${i + 1}`);
              break;
            }
          } catch (error) {
            console.log(`Proxy ${i + 1} failed:`, error.message);
            continue;
          }
        }
  
        // If all proxies fail, generate mock data
        if (!playerData || playerData.overall <= 0) {
          console.log('All proxies failed or no valid data, generating mock data');
          playerData = this.generateMockData();
          playerData.isEstimated = true;
        }
        
        // Cache the result
        this.cache.set(url, playerData);
        
        return playerData;
      } catch (error) {
        console.error('Error scraping player data:', error);
        
        // Return mock data if scraping fails
        const mockData = this.generateMockData();
        mockData.isEstimated = true;
        this.cache.set(url, mockData);
        return mockData;
      } finally {
        this.loadingPlayers.delete(url);
      }
    }
  
    async tryProxy(proxyUrl, targetUrl) {
      const timeout = 15000; // 15 second timeout
      
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), timeout);
      
      try {
        let fetchUrl;
        if (proxyUrl.includes('allorigins.win')) {
          fetchUrl = `${proxyUrl}${encodeURIComponent(targetUrl)}`;
        } else {
          fetchUrl = `${proxyUrl}${targetUrl}`;
        }
        
        console.log(`Trying to fetch: ${fetchUrl}`);
        
        const response = await fetch(fetchUrl, {
          signal: controller.signal,
          headers: {
            'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36'
          }
        });
        
        clearTimeout(timeoutId);
        
        if (!response.ok) {
          throw new Error(`HTTP ${response.status}: ${response.statusText}`);
        }
  
        let html;
        if (proxyUrl.includes('allorigins.win')) {
          const data = await response.json();
          html = data.contents;
        } else {
          html = await response.text();
        }
        
        if (!html || html.length < 100) {
          throw new Error('Invalid or empty response');
        }
        
        // Parse the HTML to extract FIFA player data
        return this.parseFIFAPlayerHTML(html);
        
      } catch (error) {
        clearTimeout(timeoutId);
        throw error;
      }
    }
  
    parseFIFAPlayerHTML(html) {
      try {
        console.log('Parsing FIFA player HTML...');
        
        // Create a temporary DOM element to parse HTML
        const parser = new DOMParser();
        const doc = parser.parseFromString(html, 'text/html');
        
        // Log some of the HTML to debug
        console.log('HTML snippet:', html.substring(0, 500));
        
        // Try different approaches to detect FIFA data
        const playerData = this.extractFIFAStats(doc, html);
        
        // Validate the extracted data
        if (!playerData || !playerData.overall || playerData.overall < 30) {
          console.log('No valid FIFA stats found, generating mock data');
          return this.generateMockData();
        }
        
        console.log('Successfully parsed FIFA stats:', playerData);
        return playerData;
      } catch (error) {
        console.error('Error parsing FIFA HTML:', error);
        return this.generateMockData();
      }
    }
  
    extractFIFAStats(doc, html) {
      // Method 1: Try JSON-LD or script tags with player data
      const jsonData = this.extractFromJSON(doc, html);
      if (jsonData) return jsonData;
      
      // Method 2: Try FIFA-specific selectors
      const fifaData = this.extractFromFIFASelectors(doc);
      if (fifaData) return fifaData;
      
      // Method 3: Try EA Sports selectors
      const eaData = this.extractFromEASelectors(doc);
      if (eaData) return eaData;
      
      // Method 4: Try FUTBIN/FUTWIZ selectors
      const futData = this.extractFromFutSelectors(doc);
      if (futData) return futData;
      
      // Method 5: Try generic FIFA stat patterns
      const genericData = this.extractFromGenericPatterns(doc, html);
      if (genericData) return genericData;
      
      return null;
    }
  
    extractFromJSON(doc, html) {
      try {
        // Look for JSON-LD structured data
        const jsonLdScripts = doc.querySelectorAll('script[type="application/ld+json"]');
        for (const script of jsonLdScripts) {
          try {
            const data = JSON.parse(script.textContent);
            if (data.aggregateRating || data.ratingValue) {
              // Extract ratings from structured data
              return this.parseStructuredData(data);
            }
          } catch (e) {
            continue;
          }
        }
        
        // Look for inline JavaScript with player data
        const scriptTags = doc.querySelectorAll('script');
        for (const script of scriptTags) {
          const content = script.textContent || '';
          
          // Look for FIFA player data patterns
          if (content.includes('overall') || content.includes('pace') || content.includes('shooting')) {
            const extracted = this.extractFromScriptContent(content);
            if (extracted) return extracted;
          }
        }
        
        // Look for JSON data in HTML comments or data attributes
        const jsonMatches = html.match(/\{[^}]*"overall"[^}]*\}|\{[^}]*"pace"[^}]*\}/g);
        if (jsonMatches) {
          for (const match of jsonMatches) {
            try {
              const data = JSON.parse(match);
              if (data.overall) return this.normalizePlayerData(data);
            } catch (e) {
              continue;
            }
          }
        }
      } catch (error) {
        console.log('JSON extraction failed:', error);
      }
      return null;
    }
  
    extractFromScriptContent(content) {
      try {
        // Look for common FIFA stat patterns in JavaScript
        const patterns = [
          /overall["\s]*:["\s]*(\d+)/i,
          /pace["\s]*:["\s]*(\d+)/i,
          /shooting["\s]*:["\s]*(\d+)/i,
          /passing["\s]*:["\s]*(\d+)/i,
          /dribbling["\s]*:["\s]*(\d+)/i,
          /defending["\s]*:["\s]*(\d+)/i,
          /physical["\s]*:["\s]*(\d+)/i
        ];
        
        const stats = {};
        const statNames = ['overall', 'pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical'];
        
        patterns.forEach((pattern, index) => {
          const match = content.match(pattern);
          if (match) {
            stats[statNames[index]] = parseInt(match[1]);
          }
        });
        
        if (Object.keys(stats).length >= 3) {
          return this.normalizePlayerData(stats);
        }
      } catch (error) {
        console.log('Script content extraction failed:', error);
      }
      return null;
    }
  
    extractFromFIFASelectors(doc) {
      try {
        // FIFA 23/24 specific selectors
        const selectors = {
          overall: [
            '[data-testid="overall-rating"]',
            '.player-overall-rating',
            '.overall-rating',
            '[data-cy="player-overall"]',
            '.player-rating-overall'
          ],
          pace: [
            '[data-testid="pace"]',
            '[data-attribute="pace"]',
            '.pace-rating',
            '[title*="Pace"]',
            '.stat-pace'
          ],
          shooting: [
            '[data-testid="shooting"]',
            '[data-attribute="shooting"]', 
            '.shooting-rating',
            '[title*="Shooting"]',
            '.stat-shooting'
          ],
          passing: [
            '[data-testid="passing"]',
            '[data-attribute="passing"]',
            '.passing-rating', 
            '[title*="Passing"]',
            '.stat-passing'
          ],
          dribbling: [
            '[data-testid="dribbling"]',
            '[data-attribute="dribbling"]',
            '.dribbling-rating',
            '[title*="Dribbling"]', 
            '.stat-dribbling'
          ],
          defending: [
            '[data-testid="defending"]',
            '[data-attribute="defending"]',
            '.defending-rating',
            '[title*="Defending"]',
            '.stat-defending'
          ],
          physical: [
            '[data-testid="physical"]',
            '[data-attribute="physical"]',
            '.physical-rating',
            '[title*="Physical"]',
            '.stat-physical'
          ]
        };
  
        const stats = {};
        for (const [stat, selectorList] of Object.entries(selectors)) {
          for (const selector of selectorList) {
            const element = doc.querySelector(selector);
            if (element) {
              const value = this.extractNumberFromElement(element);
              if (value && value >= 1 && value <= 99) {
                stats[stat] = value;
                break;
              }
            }
          }
        }
  
        if (Object.keys(stats).length >= 4) {
          return this.normalizePlayerData(stats);
        }
      } catch (error) {
        console.log('FIFA selectors failed:', error);
      }
      return null;
    }
  
    extractFromEASelectors(doc) {
      try {
        // EA Sports FC specific selectors
        const stats = {};
        
        // Try EA's data attributes
        const eaAttributes = doc.querySelectorAll('[data-*]');
        for (const elem of eaAttributes) {
          const dataset = elem.dataset;
          for (const [key, value] of Object.entries(dataset)) {
            if (['overall', 'pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical'].includes(key.toLowerCase())) {
              const numValue = parseInt(value);
              if (numValue >= 1 && numValue <= 99) {
                stats[key.toLowerCase()] = numValue;
              }
            }
          }
        }
  
        if (Object.keys(stats).length >= 4) {
          return this.normalizePlayerData(stats);
        }
      } catch (error) {
        console.log('EA selectors failed:', error);
      }
      return null;
    }
  
    extractFromFutSelectors(doc) {
      try {
        // FUTBIN/FUTWIZ specific selectors
        const futbinStats = {
          overall: doc.querySelector('.pcdisplay-ovr, .player-rating')?.textContent,
          pace: doc.querySelector('.pcdisplay-attr[data-original-title*="Pace"], .stat-pace')?.textContent,
          shooting: doc.querySelector('.pcdisplay-attr[data-original-title*="Shooting"], .stat-shooting')?.textContent,
          passing: doc.querySelector('.pcdisplay-attr[data-original-title*="Passing"], .stat-passing')?.textContent,
          dribbling: doc.querySelector('.pcdisplay-attr[data-original-title*="Dribbling"], .stat-dribbling')?.textContent,
          defending: doc.querySelector('.pcdisplay-attr[data-original-title*="Defending"], .stat-defending')?.textContent,
          physical: doc.querySelector('.pcdisplay-attr[data-original-title*="Physical"], .stat-physical')?.textContent
        };
  
        const stats = {};
        for (const [key, value] of Object.entries(futbinStats)) {
          if (value) {
            const numValue = parseInt(value.trim());
            if (numValue >= 1 && numValue <= 99) {
              stats[key] = numValue;
            }
          }
        }
  
        if (Object.keys(stats).length >= 4) {
          return this.normalizePlayerData(stats);
        }
      } catch (error) {
        console.log('FUT selectors failed:', error);
      }
      return null;
    }
  
    extractFromGenericPatterns(doc, html) {
      try {
        // Look for text patterns that match FIFA stats
        const textContent = doc.body?.textContent || html;
        
        // Regex patterns for different stat formats
        const patterns = [
          /Overall[:\s]*(\d{1,2})/i,
          /Pace[:\s]*(\d{1,2})/i,
          /Shooting[:\s]*(\d{1,2})/i,
          /Passing[:\s]*(\d{1,2})/i,
          /Dribbling[:\s]*(\d{1,2})/i,
          /Defending[:\s]*(\d{1,2})/i,
          /Physical[:\s]*(\d{1,2})/i
        ];
        
        const statNames = ['overall', 'pace', 'shooting', 'passing', 'dribbling', 'defending', 'physical'];
        const stats = {};
        
        patterns.forEach((pattern, index) => {
          const match = textContent.match(pattern);
          if (match) {
            const value = parseInt(match[1]);
            if (value >= 30 && value <= 99) {
              stats[statNames[index]] = value;
            }
          }
        });
  
        // Also look for numbers in spans/divs that might be stats
        const numberElements = doc.querySelectorAll('span, div, td');
        const foundNumbers = [];
        
        for (const elem of numberElements) {
          const text = elem.textContent?.trim();
          if (text && /^\d{1,2}$/.test(text)) {
            const num = parseInt(text);
            if (num >= 50 && num <= 99) {
              foundNumbers.push(num);
            }
          }
        }
  
        // If we found 6-7 numbers in the FIFA range, they might be the main stats
        if (foundNumbers.length >= 6 && foundNumbers.length <= 8) {
          // Sort and take the highest as overall, others as main stats
          foundNumbers.sort((a, b) => b - a);
          if (!stats.overall) stats.overall = foundNumbers[0];
          if (!stats.pace) stats.pace = foundNumbers[1];
          if (!stats.shooting) stats.shooting = foundNumbers[2];
          if (!stats.passing) stats.passing = foundNumbers[3];
          if (!stats.dribbling) stats.dribbling = foundNumbers[4];
          if (!stats.defending) stats.defending = foundNumbers[5];
          if (!stats.physical && foundNumbers[6]) stats.physical = foundNumbers[6];
        }
  
        if (Object.keys(stats).length >= 4) {
          return this.normalizePlayerData(stats);
        }
      } catch (error) {
        console.log('Generic pattern extraction failed:', error);
      }
      return null;
    }
  
    extractNumberFromElement(element) {
      if (!element) return null;
      
      // Try different ways to get the number
      const texts = [
        element.textContent,
        element.innerText,
        element.getAttribute('data-value'),
        element.getAttribute('value'),
        element.getAttribute('title')
      ].filter(Boolean);
  
      for (const text of texts) {
        const match = text.match(/\d{1,2}/);
        if (match) {
          const num = parseInt(match[0]);
          if (num >= 1 && num <= 99) {
            return num;
          }
        }
      }
      return null;
    }
  
    normalizePlayerData(rawStats) {
      const normalized = {
        overall: rawStats.overall || this.generateStatInRange(75, 85),
        pace: rawStats.pace || this.generateStatInRange(60, 85),
        shooting: rawStats.shooting || this.generateStatInRange(60, 85),
        passing: rawStats.passing || this.generateStatInRange(60, 85),
        dribbling: rawStats.dribbling || this.generateStatInRange(60, 85),
        defending: rawStats.defending || this.generateStatInRange(40, 75),
        physical: rawStats.physical || this.generateStatInRange(60, 85),
        
        // Add detailed stats (mock for now, but can be enhanced)
        detailedStats: {
          attacking: {
            crossing: this.generateStatInRange(60, 85),
            finishing: rawStats.finishing || this.generateStatInRange(70, 90),
            headingAccuracy: this.generateStatInRange(60, 85),
            shortPassing: this.generateStatInRange(70, 90),
            volleys: this.generateStatInRange(60, 85)
          },
          skill: {
            dribbling: rawStats.dribbling || this.generateStatInRange(70, 90),
            curve: this.generateStatInRange(60, 85),
            fkAccuracy: this.generateStatInRange(50, 80),
            longPassing: this.generateStatInRange(60, 85),
            ballControl: this.generateStatInRange(70, 90)
          },
          movement: {
            acceleration: this.generateStatInRange(65, 85),
            sprintSpeed: this.generateStatInRange(65, 85),
            agility: this.generateStatInRange(65, 85),
            reactions: this.generateStatInRange(70, 90),
            balance: this.generateStatInRange(60, 80)
          },
          power: {
            shotPower: this.generateStatInRange(70, 90),
            jumping: this.generateStatInRange(60, 85),
            stamina: this.generateStatInRange(70, 85),
            strength: this.generateStatInRange(65, 85),
            longShots: this.generateStatInRange(65, 85)
          },
          mentality: {
            aggression: this.generateStatInRange(50, 75),
            interceptions: this.generateStatInRange(30, 70),
            attPosition: this.generateStatInRange(70, 90),
            vision: this.generateStatInRange(70, 90),
            penalties: this.generateStatInRange(60, 85),
            composure: this.generateStatInRange(70, 85)
          },
          defending: {
            defensiveAwareness: this.generateStatInRange(30, 70),
            standingTackle: this.generateStatInRange(25, 65),
            slidingTackle: this.generateStatInRange(20, 60)
          }
        },
        
        // Basic info
        age: rawStats.age || Math.floor(Math.random() * 15) + 18,
        height: rawStats.height || `${Math.floor(Math.random() * 30) + 165}cm`,
        weight: rawStats.weight || `${Math.floor(Math.random() * 30) + 60}kg`,
        foot: rawStats.foot || (Math.random() > 0.15 ? 'Right' : 'Left'),
        workRate: rawStats.workRate || ['High/High', 'High/Medium', 'Medium/High', 'Medium/Medium'][Math.floor(Math.random() * 4)],
        weakFoot: rawStats.weakFoot || Math.floor(Math.random() * 3) + 2,
        skillMoves: rawStats.skillMoves || Math.floor(Math.random() * 4) + 2,
        
        playStyles: rawStats.playStyles || ['Finesse Shot', 'First Touch', 'Incisive Pass'],
        isEstimated: false
      };
  
      return normalized;
    }
  
    generateStatInRange(min, max) {
      return Math.floor(Math.random() * (max - min + 1)) + min;
    }
  
    generateMockData() {
      // Generate realistic mock data when scraping fails
      const overall = Math.floor(Math.random() * 30) + 60; // 60-89
      const variance = 15;
      
      const baseStat = (base, variance = 15) => {
        return Math.max(30, Math.min(99, base + Math.floor(Math.random() * variance) - variance/2));
      };
  
      return {
        overall,
        pace: baseStat(overall),
        shooting: baseStat(overall),
        passing: baseStat(overall),
        dribbling: baseStat(overall),
        defending: baseStat(overall),
        physical: baseStat(overall),
        
        detailedStats: {
          attacking: {
            crossing: baseStat(overall),
            finishing: baseStat(overall),
            headingAccuracy: baseStat(overall),
            shortPassing: baseStat(overall),
            volleys: baseStat(overall)
          },
          skill: {
            dribbling: baseStat(overall),
            curve: baseStat(overall),
            fkAccuracy: baseStat(overall - 10),
            longPassing: baseStat(overall),
            ballControl: baseStat(overall)
          },
          movement: {
            acceleration: baseStat(overall),
            sprintSpeed: baseStat(overall),
            agility: baseStat(overall),
            reactions: baseStat(overall),
            balance: baseStat(overall - 5)
          },
          power: {
            shotPower: baseStat(overall),
            jumping: baseStat(overall),
            stamina: baseStat(overall - 5),
            strength: baseStat(overall),
            longShots: baseStat(overall)
          },
          mentality: {
            aggression: baseStat(overall - 15),
            interceptions: baseStat(overall - 20),
            attPosition: baseStat(overall),
            vision: baseStat(overall),
            penalties: baseStat(overall - 5),
            composure: baseStat(overall)
          },
          defending: {
            defensiveAwareness: baseStat(overall - 20),
            standingTackle: baseStat(overall - 25),
            slidingTackle: baseStat(overall - 30)
          }
        },
        
        age: Math.floor(Math.random() * 15) + 18,
        height: `${Math.floor(Math.random() * 30) + 165}cm`,
        weight: `${Math.floor(Math.random() * 30) + 60}kg`,
        foot: Math.random() > 0.15 ? 'Right' : 'Left',
        workRate: ['High/High', 'High/Medium', 'Medium/High', 'Medium/Medium'][Math.floor(Math.random() * 4)],
        weakFoot: Math.floor(Math.random() * 3) + 2,
        skillMoves: Math.floor(Math.random() * 4) + 2,
        playStyles: ['Finesse Shot', 'First Touch', 'Incisive Pass', 'Relentless', 'Trivela'].slice(0, Math.floor(Math.random() * 3) + 2),
        isEstimated: true
      };
    }
  
    clearCache() {
      this.cache.clear();
    }
  
    getCacheSize() {
      return this.cache.size;
    }
  
    // Test method to debug scraping
    async testScraping(url) {
      console.log('=== TESTING SCRAPING ===');
      console.log('URL:', url);
      
      try {
        const result = await this.scrapePlayerData(url);
        console.log('Final result:', result);
        return result;
      } catch (error) {
        console.error('Test failed:', error);
        return null;
      }
    }
  }
  
  export const playerDataScraper = new PlayerDataScraper();