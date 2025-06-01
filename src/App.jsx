import { useState, useEffect } from 'react';
import { supabase } from './services/supabase.js';
import LoginScreen from './components/LoginScreen.jsx';
import UserPanel from './components/UserPanel.jsx';
import AuctionPanel from './components/AuctionPanel.jsx';
import './styles/index.css';

function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [teams, setTeams] = useState({});
  const [currentAuction, setCurrentAuction] = useState(null);
  const [gameState, setGameState] = useState(null);
  const [timeLeft, setTimeLeft] = useState(0);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('auction');

  // Timer effect
  useEffect(() => {
    if (!currentAuction || timeLeft <= 0) return;

    const timer = setInterval(() => {
      setTimeLeft(prev => {
        const newTime = prev - 1;
        
        // Update database every 5 seconds
        if (newTime % 5 === 0 && newTime > 0 && currentAuction) {
          supabase
            .from('current_auction')
            .update({ time_left: newTime })
            .eq('id', currentAuction.id);
        }
        
        // End auction when time reaches 0
        if (newTime <= 0) {
          endAuction();
          return 0;
        }
        
        return newTime;
      });
    }, 1000);

    return () => clearInterval(timer);
  }, [currentAuction?.id, timeLeft]); // Added dependency on auction ID

  // Initialize app
  useEffect(() => {
    initializeApp();
    setupRealtimeSubscriptions();
  }, []);

  const initializeApp = async () => {
    try {
      setLoading(true);
      await loadTeams();
      await loadGameState();
      await loadCurrentAuction();
      setLoading(false);
    } catch (err) {
      console.error('Error initializing app:', err);
      setError(err.message);
      setLoading(false);
    }
  };

  const setupRealtimeSubscriptions = () => {
    // Teams subscription
    const teamsChannel = supabase
      .channel('teams_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'teams' }, 
        () => loadTeams())
      .subscribe();

    // Game state subscription
    const gameStateChannel = supabase
      .channel('game_state_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'game_state' }, 
        () => loadGameState())
      .subscribe();

    // Auction subscription
    const auctionChannel = supabase
      .channel('auction_changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'current_auction' }, 
        (payload) => {
          if (payload.eventType === 'DELETE') {
            setCurrentAuction(null);
            setTimeLeft(0);
          } else {
            loadCurrentAuction();
          }
        })
      .subscribe();

    return () => {
      teamsChannel.unsubscribe();
      gameStateChannel.unsubscribe();
      auctionChannel.unsubscribe();
    };
  };

  const loadTeams = async () => {
    const { data, error } = await supabase.from('teams').select('*');
    if (error) throw error;
    
    const teamsObj = {};
    data?.forEach(team => {
      teamsObj[team.id] = team;
    });
    setTeams(teamsObj);
  };

  const loadGameState = async () => {
    const { data } = await supabase.from('game_state').select('*').single();
    if (data) {
      setGameState(data);
    } else {
      await supabase.from('game_state').upsert({ id: 1, current_nominator_index: 0, round: 1 });
      setGameState({ id: 1, current_nominator_index: 0, round: 1 });
    }
  };

  const loadCurrentAuction = async () => {
    const { data } = await supabase
      .from('current_auction')
      .select('*')
      .order('created_at', { ascending: false })
      .limit(1)
      .single();
    
    if (data) {
      setCurrentAuction(data);
      setTimeLeft(data.time_left || 0);
    } else {
      setCurrentAuction(null);
      setTimeLeft(0);
    }
  };

  const endAuction = async () => {
    if (!currentAuction) return;

    try {
      if (currentAuction.leading_bidder) {
        // Update winner's team
        const winner = teams[currentAuction.leading_bidder];
        const newPlayers = [...(winner.players || []), {
          name: currentAuction.player_name,
          price: currentAuction.current_bid
        }];

        await supabase.from('teams').update({
          players: newPlayers,
          budget: winner.budget - currentAuction.current_bid,
          total_spent: (winner.total_spent || 0) + currentAuction.current_bid
        }).eq('id', currentAuction.leading_bidder);

        alert(`${currentAuction.player_name} sold to ${winner.name} for €${currentAuction.current_bid}M!`);
      } else {
        // No bids - give to nominator
        const nominator = teams[currentAuction.nominated_by];
        const newPlayers = [...(nominator.players || []), {
          name: currentAuction.player_name,
          price: currentAuction.base_price
        }];

        await supabase.from('teams').update({
          players: newPlayers,
          budget: nominator.budget - currentAuction.base_price,
          total_spent: (nominator.total_spent || 0) + currentAuction.base_price
        }).eq('id', currentAuction.nominated_by);

        alert(`No bids! ${currentAuction.player_name} goes to ${nominator.name} for €${currentAuction.base_price}M!`);
      }

      // Clear auction and bids
      await supabase.from('current_auction').delete().eq('id', currentAuction.id);
      await supabase.from('smart_bids').delete().eq('auction_id', currentAuction.id);

      // Start next auction after delay
      setTimeout(() => startNextAuctionFromQueue(), 2000);

    } catch (error) {
      console.error('Error ending auction:', error);
    }
  };

  const startNextAuctionFromQueue = async () => {
    try {
      const { data: nextPlayer } = await supabase
        .from('auction_queue')
        .select('*')
        .order('created_at', { ascending: true })
        .limit(1)
        .single();

      if (nextPlayer) {
        await startNextAuction(nextPlayer);
      }
    } catch (error) {
      console.log('No more players in queue');
    }
  };

  const startNextAuction = async (playerData) => {
    try {
      const { data: auctionData, error: auctionError } = await supabase
        .from('current_auction')
        .insert({
          player_name: playerData.player_name,
          base_price: playerData.base_price,
          current_bid: playerData.base_price,
          nominated_by: playerData.nominated_by,
          time_left: 60
        })
        .select()
        .single();

      if (auctionError) throw auctionError;

      await supabase.from('auction_queue').delete().eq('id', playerData.id);
      
    } catch (error) {
      console.error('Error starting auction:', error);
    }
  };

  const login = async (teamId, password) => {
    if (teamId === 'admin' && password === 'admin123') {
      if (confirm('Reset the entire auction system?')) {
        await resetSystem();
      }
      return;
    }

    const team = teams[teamId];
    if (team && team.password === password) {
      setCurrentUser(team);
      return true;
    }
    alert('Invalid credentials!');
    return false;
  };

  const logout = () => {
    setCurrentUser(null);
    setActiveTab('auction');
  };

  const resetSystem = async () => {
    try {
      const teamIds = ['teamA', 'teamB', 'teamC', 'teamD', 'teamE'];
      for (const teamId of teamIds) {
        await supabase.from('teams').upsert({
          id: teamId,
          name: `Team ${teamId.slice(-1).toUpperCase()}`,
          password: `${teamId}123`,
          budget: 100,
          players: [],
          total_spent: 0
        });
      }

      await supabase.from('game_state').upsert({ id: 1, current_nominator_index: 0, round: 1 });
      await supabase.from('current_auction').delete().neq('id', 0);
      await supabase.from('smart_bids').delete().neq('id', 0);
      await supabase.from('auction_queue').delete().neq('id', 0);

      alert('System reset successfully!');
      window.location.reload();
    } catch (error) {
      console.error('Reset failed:', error);
      alert('Reset failed: ' + error.message);
    }
  };

  if (loading) {
    return (
      <div className="bg-gradient min-h-screen flex items-center justify-center">
        <div className="text-center text-white">
          <div className="text-6xl mb-4">⚽</div>
          <div className="flex items-center justify-center space-x-2">
            <div className="animate-spin rounded-full h-8 w-5 border-b-2 border-white"></div>
            <span className="text-xl font-semibold">Loading Raftel Premier League...</span>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="bg-gradient min-h-screen flex items-center justify-center p-4">
        <div className="bg-white rounded-2xl shadow-2xl p-8 max-w-md w-full text-center">
          <div className="text-6xl mb-4">❌</div>
          <h2 className="text-2xl font-bold text-gray-800 mb-4">Connection Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button onClick={initializeApp} className="btn btn-danger">
            Try Again
          </button>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return <LoginScreen onLogin={login} />;
  }

  return (
    <div className="bg-gradient min-h-screen">
      <div style={{ 
        maxWidth: '1920px', 
        margin: '0 auto', 
        padding: '20px',
        minHeight: '100vh'
      }}>
        <header className="text-center text-white mb-8">
          <h1 className="text-4xl font-bold mb-2">⚽ Raftel Premier League Auction</h1>
          <p className="text-xl opacity-90">Build your ultimate team within budget!</p>
        </header>

        <div style={{ 
          display: 'grid', 
          gridTemplateColumns: '400px 1fr', 
          gap: '2rem',
          maxWidth: '1600px',
          margin: '0 auto'
        }}>
          <div>
            <UserPanel user={teams[currentUser.id] || currentUser} onLogout={logout} />
          </div>
          
          <div>
            <AuctionPanel
              currentAuction={currentAuction}
              timeLeft={timeLeft}
              gameState={gameState}
              currentUser={currentUser}
              teams={teams}
              activeTab={activeTab}
              onTabChange={setActiveTab}
              onRefresh={initializeApp}
            />
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;