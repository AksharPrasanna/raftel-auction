import { useState } from 'react';

const LoginScreen = ({ onLogin }) => {
  const [selectedTeam, setSelectedTeam] = useState('');
  const [password, setPassword] = useState('');
  const [isAdmin, setIsAdmin] = useState(false);

  const handleLogin = () => {
    if (isAdmin) {
      onLogin('admin', password);
      return;
    }

    if (!selectedTeam || !password) {
      alert('Please select a team and enter password!');
      return;
    }

    onLogin(selectedTeam, password);
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter') {
      handleLogin();
    }
  };

  return (
    <div className="bg-gradient min-h-screen flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl shadow-2xl p-8 w-full max-w-md">
        <div className="text-center mb-8">
          <h1 className="text-3xl font-bold text-gray-800 mb-2">⚽ Raftel Premier League</h1>
          <h2 className="text-xl font-semibold text-gray-600">Join the Auction</h2>
        </div>
        
        {!isAdmin ? (
          <div className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Select Your Team</label>
              <select
                value={selectedTeam}
                onChange={(e) => setSelectedTeam(e.target.value)}
                onKeyPress={handleKeyPress}
              >
                <option value="">Choose your team...</option>
                <option value="teamA">Team A</option>
                <option value="teamB">Team B</option>
                <option value="teamC">Team C</option>
                <option value="teamD">Team D</option>
                <option value="teamE">Team E</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder="Enter password"
              />
            </div>
          </div>
        ) : (
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Admin Password</label>
            <input
              type="password"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              onKeyPress={handleKeyPress}
              placeholder="Enter admin password"
            />
          </div>
        )}
        
        <button
          onClick={handleLogin}
          className={`btn w-full mt-6 mb-4 ${isAdmin ? 'btn-danger' : 'btn-primary'}`}
        >
          {isAdmin ? 'Reset System' : 'Enter Auction'}
        </button>
        
        <button
          onClick={() => {
            setIsAdmin(!isAdmin);
            setPassword('');
            setSelectedTeam('');
          }}
          className="w-full text-gray-600 text-sm"
        >
          {isAdmin ? '← Back to Team Login' : '🔧 Admin Access'}
        </button>

        <div className="mt-8 p-4 bg-gray-50 rounded-lg">
          <p className="text-sm font-semibold text-gray-700 mb-3">Team Credentials:</p>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', fontSize: '0.75rem' }}>
            <div>Team A: teamA123</div>
            <div>Team B: teamB123</div>
            <div>Team C: teamC123</div>
            <div>Team D: teamD123</div>
            <div>Team E: teamE123</div>
            <div style={{ gridColumn: 'span 2', paddingTop: '0.25rem', borderTop: '1px solid #d1d5db' }}>
              Admin: admin123
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default LoginScreen;