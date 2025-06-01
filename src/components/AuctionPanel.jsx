import { useState, useEffect } from 'react';
import { supabase } from '../services/supabase.js';
import PlayerSearchInput from './PlayerSearchInput.jsx';
import PlayerStatsDisplay from './PlayerStatsDisplay.jsx';

const AuctionPanel = ({ currentAuction, timeLeft, gameState, currentUser, teams, activeTab, onTabChange, onRefresh }) => {
  const [playerName, setPlayerName] = useState('');
  const [basePrice, setBasePrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [passes, setPasses] = useState([]);
  const [hasUserPassed, setHasUserPassed] = useState(false);

  // Load passes for current auction
  useEffect(() => {
    if (currentAuction) {
      loadPasses();
    } else {
      setPasses([]);
      setHasUserPassed(false);
    }
  }, [currentAuction?.id]);

  const loadPasses = async () => {
    if (!currentAuction) return;
    
    try {
      const { data, error } = await supabase
        .from('player_passes')
        .select('team_id')
        .eq('auction_id', currentAuction.id);
      
      if (error) throw error;
      
      const passedTeams = data?.map(p => p.team_id) || [];
      setPasses(passedTeams);
      setHasUserPassed(passedTeams.includes(currentUser?.id));
    } catch (error) {
      console.error('Error loading passes:', error);
    }
  };

  const getCurrentNominator = () => {
    if (!gameState) return 'Team A';
    const order = ['teamA', 'teamB', 'teamC', 'teamD', 'teamE'];
    if (gameState.round % 2 === 0) order.reverse();
    const currentTeamId = order[gameState.current_nominator_index];
    return `Team ${currentTeamId.slice(-1).toUpperCase()}`;
  };

  const isMyTurn = () => {
    if (!gameState || !currentUser) return false;
    const order = ['teamA', 'teamB', 'teamC', 'teamD', 'teamE'];
    if (gameState.round % 2 === 0) order.reverse();
    return order[gameState.current_nominator_index] === currentUser.id;
  };

  const placeBid = async (increment) => {
    if (!currentAuction || !currentUser || loading) return;

    // Check if user has passed
    if (hasUserPassed) {
      alert('You cannot bid after passing on this player!');
      return;
    }

    // NEW RULE 1: Check if user is the nominator and no other bids have been placed
    const isNominator = currentAuction.nominated_by === currentUser.id;
    const hasOtherBids = currentAuction.current_bid > currentAuction.base_price;
    
    if (isNominator && !hasOtherBids) {
      alert('As the nominator, you cannot bid until someone else places a bid first!');
      return;
    }

    const team = teams[currentUser.id];
    const playersNeeded = 16 - (team.players ? team.players.length : 0);
    const maxBid = playersNeeded > 1 ? team.budget - (playersNeeded - 1) : team.budget;
    const nextBid = currentAuction.current_bid + increment;

    if (nextBid > maxBid) {
      alert(`Cannot bid €${nextBid}M. Maximum allowed: €${maxBid}M`);
      return;
    }

    if (currentAuction.leading_bidder === currentUser.id) {
      alert('You are already the leading bidder!');
      return;
    }

    setLoading(true);
    try {
      // Directly update the auction with the new bid
      const { data: updatedAuction, error: bidError } = await supabase
        .from('current_auction')
        .update({
          current_bid: nextBid,
          leading_bidder: currentUser.id,
          time_left: Math.max(30, timeLeft) // Reset to 30s if less than 30s remaining
        })
        .eq('id', currentAuction.id)
        .select()
        .single();

      if (bidError) {
        throw bidError;
      }

      console.log('Bid placed successfully:', updatedAuction);
      
      // Also add to smart bids for tracking
      await supabase.from('smart_bids').insert({
        team_id: currentUser.id,
        increment: increment,
        auction_id: currentAuction.id
      });

      alert(`Bid placed successfully: €${nextBid}M!`);
      
      // Refresh data to show updates
      onRefresh();

    } catch (error) {
      console.error('Error placing bid:', error);
      alert('Error placing bid: ' + error.message);
    }
    setLoading(false);
  };

  const handlePass = async () => {
    if (!currentAuction || !currentUser || hasUserPassed || loading) return;

    // Check if user is the nominator and no bids have been placed
    const isNominator = currentAuction.nominated_by === currentUser.id;
    const hasBids = currentAuction.current_bid > currentAuction.base_price;

    if (isNominator && !hasBids) {
      alert('As the nominator, you cannot pass until someone places a bid!');
      return;
    }

    // NEW RULE 2: Check if user is the current leading bidder
    if (currentAuction.leading_bidder === currentUser.id) {
      alert('You cannot pass while you are the leading bidder!');
      return;
    }

    if (!confirm('Are you sure you want to pass on this player? You cannot bid after passing.')) {
      return;
    }

    setLoading(true);
    try {
      // Add pass to database
      const { error } = await supabase
        .from('player_passes')
        .insert({
          auction_id: currentAuction.id,
          team_id: currentUser.id
        });

      if (error) throw error;

      // Reload passes
      await loadPasses();

      // Check if all teams have passed (excluding nominator if no bids)
      const totalTeams = Object.keys(teams).length;
      const activeTeams = isNominator && !hasBids ? totalTeams - 1 : totalTeams;
      const totalPasses = passes.length + 1; // +1 for current pass

      if (totalPasses >= activeTeams - 1) { // All except current bidder (if any)
        // Award to current bidder or nominator
        setTimeout(() => {
          endAuctionEarly();
        }, 1000);
      }

      alert('You have passed on this player. You can no longer bid.');
    } catch (error) {
      console.error('Error passing:', error);
      alert('Error passing on player');
    }
    setLoading(false);
  };

  const endAuctionEarly = async () => {
    if (!currentAuction) return;

    try {
      // FIRST: Clean up related data that references the auction (fix foreign key constraint)
      console.log('Cleaning up auction-related data...');
      await supabase.from('smart_bids').delete().eq('auction_id', currentAuction.id);
      await supabase.from('player_passes').delete().eq('auction_id', currentAuction.id);

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

        alert(`All teams passed! ${currentAuction.player_name} goes to ${winner.name} for €${currentAuction.current_bid}M!`);
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

        alert(`All teams passed! ${currentAuction.player_name} goes to ${nominator.name} for €${currentAuction.base_price}M!`);
      }

      // LAST: Delete the auction record (after cleaning up foreign key references)
      console.log('Deleting auction record...');
      await supabase.from('current_auction').delete().eq('id', currentAuction.id);

      onRefresh();
    } catch (error) {
      console.error('Error ending auction early:', error);
    }
  };

  const handleNominate = async () => {
    if (loading) return;
    
    if (!playerName.trim() || !basePrice) {
      alert('Please fill all fields!');
      return;
    }

    const price = parseFloat(basePrice);
    if (price < 0.5 || price > 50) {
      alert('Starting price must be between 0.5-50M!');
      return;
    }

    if (!isMyTurn()) {
      alert("It's not your turn to nominate!");
      return;
    }

    setLoading(true);
    try {
      console.log('Adding player to queue:', { playerName, price, nominatedBy: currentUser.id });
      
      // Add to queue
      const { data: queueData, error: queueError } = await supabase
        .from('auction_queue')
        .insert({
          player_name: playerName.trim(),
          base_price: price,
          nominated_by: currentUser.id
        })
        .select()
        .single();

      if (queueError) {
        console.error('Queue error:', queueError);
        throw queueError;
      }

      console.log('Player added to queue:', queueData);

      // Update nominator
      let currentNominatorIndex = gameState.current_nominator_index;
      let round = gameState.round;
      const order = ['teamA', 'teamB', 'teamC', 'teamD', 'teamE'];
      if (round % 2 === 0) order.reverse();
      
      currentNominatorIndex++;
      if (currentNominatorIndex >= order.length) {
        currentNominatorIndex = 0;
        round++;
      }

      const { error: stateError } = await supabase
        .from('game_state')
        .update({
          current_nominator_index: currentNominatorIndex,
          round: round
        })
        .eq('id', 1);

      if (stateError) {
        console.error('Game state update error:', stateError);
        throw stateError;
      }

      setPlayerName('');
      setBasePrice('');
      alert(`${playerName} nominated successfully!`);

      // Start auction if none active
      if (!currentAuction) {
        console.log('Starting new auction...');
        await startNextAuction(queueData);
      }

      // Refresh data
      onRefresh();

    } catch (error) {
      console.error('Error nominating player:', error);
      alert('Error nominating player: ' + error.message);
    }
    setLoading(false);
  };

  const startNextAuction = async (playerData) => {
    try {
      console.log('Creating auction for player:', playerData);
      
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

      if (auctionError) {
        console.error('Auction creation error:', auctionError);
        throw auctionError;
      }

      console.log('Auction created:', auctionData);

      // Remove from queue
      const { error: deleteError } = await supabase
        .from('auction_queue')
        .delete()
        .eq('id', playerData.id);

      if (deleteError) {
        console.error('Queue deletion error:', deleteError);
      }

      // Trigger a refresh to update timer
      setTimeout(() => onRefresh(), 500);

    } catch (error) {
      console.error('Error starting auction:', error);
    }
  };

  const getTimeColor = () => {
    if (timeLeft > 30) return 'text-green-600';
    if (timeLeft > 10) return 'text-yellow-600';
    return 'text-red-600';
  };

  const tabs = [
    { id: 'auction', label: 'Live Auction', icon: '🔥' },
    { id: 'nominate', label: 'Nominate', icon: '➕' },
    { id: 'overview', label: 'All Teams', icon: '👥' }
  ];

  return (
    <div className="card">
      {/* Tab Navigation */}
      <div className="flex space-x-2 mb-6 border-b">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            onClick={() => onTabChange(tab.id)}
            className={`px-4 py-3 rounded-t-lg font-semibold transition-all duration-200 flex items-center space-x-2 ${
              activeTab === tab.id ? 'tab-active' : 'tab-inactive'
            }`}
          >
            <span>{tab.icon}</span>
            <span>{tab.label}</span>
          </button>
        ))}
      </div>

      {/* Auction Tab */}
      {activeTab === 'auction' && (
        <div>
          {currentAuction ? (
            <div className="bg-yellow-50 border-2 border-yellow-400 rounded-xl p-6 mb-6">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-xl font-bold text-yellow-800">🔥 Current Auction</h3>
                <div className={`text-3xl font-bold ${getTimeColor()}`}>
                  ⏰ {timeLeft}s
                </div>
              </div>

              <div className="bg-white rounded-lg p-4 mb-4">
                <h4 className="text-3xl font-bold text-blue-600 mb-3">{currentAuction.player_name}</h4>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <span className="text-gray-600">Current Bid:</span>
                    <div className="text-2xl font-bold text-green-600">€{currentAuction.current_bid}M</div>
                  </div>
                  <div>
                    <span className="text-gray-600">Leading Bidder:</span>
                    <div className="text-xl font-bold text-purple-600">
                      {currentAuction.leading_bidder 
                        ? `Team ${currentAuction.leading_bidder.slice(-1).toUpperCase()}`
                        : 'No bids yet'
                      }
                    </div>
                  </div>
                </div>
              </div>

              {/* Simplified Player Info Display */}
              <PlayerStatsDisplay 
                playerName={currentAuction.player_name} 
                isVisible={true}
              />

              {/* Smart Bidding */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-4">
                <h4 className="font-bold text-green-800 mb-2">🤖 Place Your Bid</h4>
                <p className="text-sm text-green-700 mb-4">
                  Click an increment to place your bid immediately. Timer resets to 30s on each bid!
                </p>
                
                {/* Check for special conditions */}
                {(() => {
                  const isNominator = currentAuction.nominated_by === currentUser.id;
                  const hasOtherBids = currentAuction.current_bid > currentAuction.base_price;
                  const isLeadingBidder = currentAuction.leading_bidder === currentUser.id;
                  
                  // Show warning for nominator who can't bid yet
                  if (isNominator && !hasOtherBids) {
                    return (
                      <div className="mb-4 p-3 bg-orange-100 border border-orange-300 rounded">
                        <span className="text-orange-800 text-sm font-semibold">
                          ⏳ As nominator, wait for someone else to bid first!
                        </span>
                      </div>
                    );
                  }
                  
                  return null;
                })()}
                
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '0.5rem' }}>
                  {[0.5, 1, 2, 5, 10, 20].map((increment) => {
                    const isNominator = currentAuction.nominated_by === currentUser.id;
                    const hasOtherBids = currentAuction.current_bid > currentAuction.base_price;
                    const isLeadingBidder = currentAuction.leading_bidder === currentUser.id;
                    
                    const isDisabled = loading || 
                                     hasUserPassed || 
                                     isLeadingBidder || 
                                     (isNominator && !hasOtherBids);
                    
                    const getTooltip = () => {
                      if (hasUserPassed) return 'You have passed on this player';
                      if (isLeadingBidder) return 'You are already leading!';
                      if (isNominator && !hasOtherBids) return 'Wait for someone else to bid first';
                      return `Bid €${currentAuction.current_bid + increment}M`;
                    };
                    
                    return (
                      <button
                        key={increment}
                        onClick={() => placeBid(increment)}
                        disabled={isDisabled}
                        className={`btn btn-primary btn-sm ${
                          isDisabled ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                        title={getTooltip()}
                      >
                        +{increment}M
                      </button>
                    );
                  })}
                </div>
                
                {hasUserPassed && (
                  <div className="mt-3 p-2 bg-red-100 border border-red-300 rounded text-center">
                    <span className="text-red-800 text-sm font-semibold">🚫 You have passed on this player</span>
                  </div>
                )}
                
                {currentAuction.leading_bidder === currentUser.id && !hasUserPassed && (
                  <div className="mt-3 p-2 bg-green-100 border border-green-300 rounded text-center">
                    <span className="text-green-800 text-sm font-semibold">🎉 You are currently leading this auction!</span>
                  </div>
                )}
              </div>

              {/* Quick Bid Options */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mt-4">
                <h4 className="font-bold text-blue-800 mb-2">⚡ Quick Actions</h4>
                <div className="flex gap-2">
                  {(() => {
                    const isNominator = currentAuction.nominated_by === currentUser.id;
                    const hasOtherBids = currentAuction.current_bid > currentAuction.base_price;
                    const isLeadingBidder = currentAuction.leading_bidder === currentUser.id;
                    
                    const isDisabled = loading || 
                                     hasUserPassed || 
                                     isLeadingBidder || 
                                     (isNominator && !hasOtherBids);
                    
                    return (
                      <>
                        <button
                          onClick={() => placeBid(1)}
                          disabled={isDisabled}
                          className="btn btn-primary btn-sm flex-1"
                        >
                          Minimum Bid (+1M)
                        </button>
                        <button
                          onClick={() => placeBid(5)}
                          disabled={isDisabled}
                          className="btn btn-primary btn-sm flex-1"
                        >
                          Standard Bid (+5M)
                        </button>
                      </>
                    );
                  })()}
                </div>
              </div>

              {/* Pass Section */}
              <div className="bg-red-50 border border-red-200 rounded-lg p-4 mt-4">
                <h4 className="font-bold text-red-800 mb-2">🚫 Pass Option</h4>
                <p className="text-sm text-red-700 mb-3">
                  Don't want this player? Pass and let others continue bidding.
                  {(() => {
                    const isNominator = currentAuction.nominated_by === currentUser.id;
                    const hasBids = currentAuction.current_bid > currentAuction.base_price;
                    const isLeadingBidder = currentAuction.leading_bidder === currentUser.id;
                    
                    if (isNominator && !hasBids) {
                      return (
                        <span className="block mt-1 font-semibold">⚠️ As nominator, you must wait for a bid before passing!</span>
                      );
                    }
                    if (isLeadingBidder) {
                      return (
                        <span className="block mt-1 font-semibold">⚠️ You cannot pass while you are the leading bidder!</span>
                      );
                    }
                    return null;
                  })()}
                </p>
                
                {/* Show current passes */}
                {passes.length > 0 && (
                  <div className="mb-3">
                    <p className="text-xs text-red-600 mb-1">Teams that passed: {passes.length}/5</p>
                    <div className="flex flex-wrap gap-1">
                      {passes.map(teamId => (
                        <span key={teamId} className="px-2 py-1 bg-red-100 text-red-700 text-xs rounded">
                          Team {teamId.slice(-1).toUpperCase()}
                        </span>
                      ))}
                    </div>
                  </div>
                )}

                <button
                  onClick={handlePass}
                  disabled={(() => {
                    const isNominator = currentAuction.nominated_by === currentUser.id;
                    const hasBids = currentAuction.current_bid > currentAuction.base_price;
                    const isLeadingBidder = currentAuction.leading_bidder === currentUser.id;
                    
                    return loading || 
                           hasUserPassed || 
                           (isNominator && !hasBids) ||
                           isLeadingBidder;
                  })()}
                  className={`btn w-full ${
                    (() => {
                      const isNominator = currentAuction.nominated_by === currentUser.id;
                      const hasBids = currentAuction.current_bid > currentAuction.base_price;
                      const isLeadingBidder = currentAuction.leading_bidder === currentUser.id;
                      
                      if (hasUserPassed || (isNominator && !hasBids) || isLeadingBidder) {
                        return 'bg-gray-300 text-gray-500 cursor-not-allowed';
                      }
                      return 'bg-red-500 text-white hover:bg-red-600';
                    })()
                  }`}
                >
                  {(() => {
                    const isNominator = currentAuction.nominated_by === currentUser.id;
                    const hasBids = currentAuction.current_bid > currentAuction.base_price;
                    const isLeadingBidder = currentAuction.leading_bidder === currentUser.id;
                    
                    if (hasUserPassed) return '✓ You have passed';
                    if (isNominator && !hasBids) return '⏳ Wait for first bid';
                    if (isLeadingBidder) return '🚫 Cannot pass while leading';
                    return '🚫 Pass on this player';
                  })()}
                </button>
                
                {passes.length >= 4 && (
                  <p className="text-xs text-red-600 mt-2 text-center font-semibold">
                    ⚠️ If all teams pass, current bidder gets the player!
                  </p>
                )}
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-8 text-center">
              <div className="text-6xl mb-4">⏳</div>
              <h3 className="text-2xl font-bold text-gray-700 mb-2">No Active Auction</h3>
              <p className="text-gray-500">Waiting for player nominations to start the action!</p>
            </div>
          )}
        </div>
      )}

      {/* Nominate Tab */}
      {activeTab === 'nominate' && (
        <div>
          <div className="bg-blue-50 border border-blue-200 rounded-xl p-4 mb-6 text-center">
            <h3 className="text-lg font-bold text-blue-800">
              🎯 {getCurrentNominator()}'s Turn to Nominate
            </h3>
            <p className="text-blue-600">Round {gameState?.round || 1} of 16 • Snake Draft Format</p>
          </div>

          {isMyTurn() ? (
            <div className="bg-green-50 rounded-xl p-6">
              <h3 className="text-xl font-bold text-gray-800 mb-4">✨ Your Turn - Nominate a Player</h3>
              
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Player Name</label>
                  <PlayerSearchInput
                    value={playerName}
                    onChange={setPlayerName}
                    placeholder="Search for a player (e.g., Lionel Messi)"
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 mt-1">
                    Start typing to search from available players (sold players excluded)
                  </p>
                </div>
                
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Starting Price (€M)</label>
                  <input
                    type="number"
                    value={basePrice}
                    onChange={(e) => setBasePrice(e.target.value)}
                    placeholder="e.g., 5.0"
                    min="0.5"
                    step="0.5"
                    max="50"
                    disabled={loading}
                  />
                  <p className="text-xs text-gray-500 mt-1">Range: €0.5M - €50M</p>
                </div>
                
                <button
                  onClick={handleNominate}
                  disabled={loading || !playerName.trim() || !basePrice}
                  className={`btn w-full ${
                    loading || !playerName.trim() || !basePrice
                      ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                      : 'btn-success'
                  }`}
                >
                  {loading ? (
                    <div className="flex items-center justify-center">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                      Adding to Queue...
                    </div>
                  ) : (
                    '🚀 Add to Auction Queue'
                  )}
                </button>
              </div>
            </div>
          ) : (
            <div className="bg-gray-50 rounded-xl p-8 text-center">
              <div className="text-6xl mb-4">⏳</div>
              <h3 className="text-xl font-bold text-gray-700 mb-2">Not Your Turn</h3>
              <p className="text-gray-500">Wait for {getCurrentNominator()} to nominate a player.</p>
              <div className="mt-4 text-sm text-gray-400">
                Snake draft means the order reverses each round for fairness!
              </div>
            </div>
          )}
        </div>
      )}

      {/* Overview Tab */}
      {activeTab === 'overview' && (
        <div>
          <h3 className="text-xl font-bold text-gray-800 mb-6">🏆 All Teams Overview</h3>
          
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', gap: '1rem' }}>
            {['teamA', 'teamB', 'teamC', 'teamD', 'teamE'].map((teamId) => {
              const team = teams[teamId];
              if (!team) return null;
              
              return (
                <div 
                  key={teamId} 
                  className={`bg-white border rounded-lg p-4 shadow-sm transition-all hover:shadow-md ${
                    currentUser?.id === teamId ? 'ring-user' : 'border-gray-200'
                  }`}
                >
                  <div className="flex items-center justify-between mb-3">
                    <h4 className="text-lg font-bold text-gray-800">{team.name}</h4>
                    {currentUser?.id === teamId && (
                      <span className="px-2 py-1 bg-blue-500 text-white text-xs rounded-full">You</span>
                    )}
                  </div>
                  
                  {/* Progress Bar */}
                  <div className="mb-3">
                    <div className="flex justify-between text-xs text-gray-500 mb-1">
                      <span>Squad Progress</span>
                      <span>{Math.round(((team.players?.length || 0) / 16) * 100)}%</span>
                    </div>
                    <div className="w-full bg-gray-200 rounded-full h-2">
                      <div 
                        className="bg-blue-500 h-2 rounded-full transition-all duration-300"
                        style={{ width: `${((team.players?.length || 0) / 16) * 100}%` }}
                      ></div>
                    </div>
                  </div>
                  
                  <div className="space-y-2 text-sm">
                    <div className="flex justify-between">
                      <span className="text-gray-600">Budget:</span>
                      <span className={`font-semibold ${
                        team.budget > 70 ? 'text-green-600' : 
                        team.budget > 30 ? 'text-yellow-600' : 'text-red-600'
                      }`}>
                        €{team.budget}M / €100M
                      </span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Players:</span>
                      <span className="font-semibold text-blue-600">{team.players?.length || 0}/16</span>
                    </div>
                    <div className="flex justify-between">
                      <span className="text-gray-600">Total Spent:</span>
                      <span className="font-semibold text-purple-600">€{team.total_spent || 0}M</span>
                    </div>
                  </div>

                  {team.players && team.players.length > 0 && (
                    <div className="mt-3 border-t pt-3">
                      <p className="text-xs font-semibold text-gray-600 mb-2">Recent Signings:</p>
                      <div className="max-h-20 overflow-y-auto custom-scrollbar space-y-1">
                        {team.players.slice(-3).map((player, index) => (
                          <div key={index} className="flex justify-between items-center text-xs">
                            <span className="text-gray-700 truncate mr-2">{player.name}</span>
                            <span className="text-green-600 font-semibold flex-shrink-0">€{player.price}M</span>
                          </div>
                        ))}
                        {team.players.length > 3 && (
                          <div className="text-xs text-gray-400 text-center">
                            +{team.players.length - 3} more players
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Empty State */}
                  {(!team.players || team.players.length === 0) && (
                    <div className="mt-3 border-t pt-3 text-center">
                      <div className="text-gray-400 text-xs">No players yet</div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
};

export default AuctionPanel;