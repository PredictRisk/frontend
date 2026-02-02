import { useState } from 'react';

import Navbar from '../components/Navbar';

interface Territory {
  id: number;
  name: string;
  owner: 'red' | 'blue' | null;
  troops: number;
  neighbors: number[];
}

const initialTerritories: Territory[] = [
  { id: 0, name: 'Northland', owner: 'red', troops: 3, neighbors: [1, 3, 4] },
  { id: 1, name: 'Frostheim', owner: 'red', troops: 2, neighbors: [0, 2, 4] },
  { id: 2, name: 'Eastmark', owner: 'blue', troops: 3, neighbors: [1, 4, 5] },
  { id: 3, name: 'Westmoor', owner: 'red', troops: 2, neighbors: [0, 4, 6] },
  { id: 4, name: 'Heartland', owner: null, troops: 1, neighbors: [0, 1, 2, 3, 5, 6, 7] },
  { id: 5, name: 'Ironcoast', owner: 'blue', troops: 2, neighbors: [2, 4, 7, 8] },
  { id: 6, name: 'Shadowvale', owner: 'red', troops: 2, neighbors: [3, 4, 7, 9] },
  { id: 7, name: 'Midlands', owner: 'blue', troops: 3, neighbors: [4, 5, 6, 8, 9] },
  { id: 8, name: 'Sunreach', owner: 'blue', troops: 2, neighbors: [5, 7, 9] },
  { id: 9, name: 'Darkhollow', owner: 'red', troops: 3, neighbors: [6, 7, 8] },
];

export default function RiskGame() {
  const [territories, setTerritories] = useState<Territory[]>(initialTerritories);
  const [currentPlayer, setCurrentPlayer] = useState<'red' | 'blue'>('red');
  const [selectedTerritory, setSelectedTerritory] = useState<number | null>(null);
  const [phase, setPhase] = useState<'reinforce' | 'attack' | 'fortify'>('reinforce');
  const [reinforcements, setReinforcements] = useState(3);
  const [message, setMessage] = useState('Place your reinforcements');

  // Calculate total troops for each player
  const redTroops = territories.filter(t => t.owner === 'red').reduce((sum, t) => sum + t.troops, 0);
  const blueTroops = territories.filter(t => t.owner === 'blue').reduce((sum, t) => sum + t.troops, 0);

  const handleTerritoryClick = (id: number) => {
    const territory = territories[id];

    if (phase === 'reinforce') {
      if (territory.owner === currentPlayer && reinforcements > 0) {
        setTerritories(prev => prev.map(t => 
          t.id === id ? { ...t, troops: t.troops + 1 } : t
        ));
        setReinforcements(prev => prev - 1);
        if (reinforcements === 1) {
          setPhase('attack');
          setMessage('Select your territory to attack from');
        }
      }
    } else if (phase === 'attack') {
      if (selectedTerritory === null) {
        if (territory.owner === currentPlayer && territory.troops > 1) {
          setSelectedTerritory(id);
          setMessage('Select an adjacent enemy territory to attack');
        }
      } else {
        const attacker = territories[selectedTerritory];
        if (attacker.neighbors.includes(id) && territory.owner !== currentPlayer) {
          // Simple combat: compare random rolls
          const attackRoll = Math.floor(Math.random() * 6) + attacker.troops;
          const defendRoll = Math.floor(Math.random() * 6) + territory.troops;
          
          if (attackRoll > defendRoll) {
            setTerritories(prev => prev.map(t => {
              if (t.id === id) return { ...t, owner: currentPlayer, troops: 1 };
              if (t.id === selectedTerritory) return { ...t, troops: t.troops - 1 };
              return t;
            }));
            setMessage(`Victory! You captured ${territory.name}`);
          } else {
            setTerritories(prev => prev.map(t => 
              t.id === selectedTerritory ? { ...t, troops: Math.max(1, t.troops - 1) } : t
            ));
            setMessage(`Defeat! Your attack on ${territory.name} failed`);
          }
          setSelectedTerritory(null);
        } else {
          setSelectedTerritory(null);
          setMessage('Invalid target. Select your territory to attack from');
        }
      }
    } else if (phase === 'fortify') {
      if (selectedTerritory === null) {
        if (territory.owner === currentPlayer && territory.troops > 1) {
          setSelectedTerritory(id);
          setMessage('Select an adjacent friendly territory');
        }
      } else {
        const source = territories[selectedTerritory];
        if (source.neighbors.includes(id) && territory.owner === currentPlayer) {
          setTerritories(prev => prev.map(t => {
            if (t.id === id) return { ...t, troops: t.troops + 1 };
            if (t.id === selectedTerritory) return { ...t, troops: t.troops - 1 };
            return t;
          }));
          setMessage('Troops moved! Click End Turn');
        }
        setSelectedTerritory(null);
      }
    }
  };

  const endPhase = () => {
    if (phase === 'attack') {
      setPhase('fortify');
      setSelectedTerritory(null);
      setMessage('Fortify: move troops between adjacent territories');
    } else {
      const nextPlayer = currentPlayer === 'red' ? 'blue' : 'red';
      setCurrentPlayer(nextPlayer);
      setPhase('reinforce');
      setReinforcements(3);
      setSelectedTerritory(null);
      setMessage('Place your reinforcements');
    }
  };

  const redCount = territories.filter(t => t.owner === 'red').length;
  const blueCount = territories.filter(t => t.owner === 'blue').length;

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
      fontFamily: '"Cinzel", "Times New Roman", serif',
      padding: '20px',
      color: '#d4af37'
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&family=Crimson+Text:ital@0;1&display=swap');
        
        .territory {
          width: 140px;
          height: 100px;
          border: 3px solid #8b7355;
          border-radius: 8px;
          display: flex;
          flex-direction: column;
          align-items: center;
          justify-content: center;
          cursor: pointer;
          transition: all 0.3s ease;
          position: relative;
          box-shadow: 
            0 4px 15px rgba(0,0,0,0.4),
            inset 0 1px 0 rgba(255,255,255,0.1);
          background-size: 200% 200%;
          animation: shimmer 3s ease infinite;
        }
        
        @keyframes shimmer {
          0%, 100% { background-position: 0% 50%; }
          50% { background-position: 100% 50%; }
        }
        
        .territory:hover {
          transform: translateY(-4px) scale(1.02);
          box-shadow: 
            0 8px 25px rgba(0,0,0,0.5),
            0 0 20px currentColor;
          border-color: #d4af37;
        }
        
        .territory.selected {
          border-color: #ffd700;
          box-shadow: 
            0 0 30px #ffd700,
            0 0 60px rgba(255,215,0,0.3);
          animation: pulse 1s infinite;
        }
        
        @keyframes pulse {
          0%, 100% { box-shadow: 0 0 30px #ffd700, 0 0 60px rgba(255,215,0,0.3); }
          50% { box-shadow: 0 0 40px #ffd700, 0 0 80px rgba(255,215,0,0.5); }
        }
        
        .territory.red {
          background: linear-gradient(145deg, #8b2500 0%, #5c1a0a 50%, #3d0f05 100%);
          border-color: #cd5c5c;
        }
        
        .territory.blue {
          background: linear-gradient(145deg, #1e4d8c 0%, #0d2b4d 50%, #061929 100%);
          border-color: #6495ed;
        }
        
        .territory.neutral {
          background: linear-gradient(145deg, #4a4a4a 0%, #2d2d2d 50%, #1a1a1a 100%);
          border-color: #666;
        }
        
        .troops-badge {
          position: absolute;
          top: -12px;
          right: -12px;
          width: 32px;
          height: 32px;
          border-radius: 50%;
          background: linear-gradient(145deg, #d4af37, #aa8b2d);
          color: #1a1a2e;
          font-weight: 700;
          font-size: 16px;
          display: flex;
          align-items: center;
          justify-content: center;
          border: 2px solid #ffd700;
          box-shadow: 0 2px 10px rgba(212,175,55,0.5);
        }
        
        .btn {
          padding: 12px 28px;
          font-family: 'Cinzel', serif;
          font-size: 14px;
          font-weight: 700;
          text-transform: uppercase;
          letter-spacing: 2px;
          border: 2px solid #d4af37;
          border-radius: 4px;
          background: linear-gradient(145deg, #2a2a4a, #1a1a2e);
          color: #d4af37;
          cursor: pointer;
          transition: all 0.3s ease;
        }
        
        .btn:hover {
          background: linear-gradient(145deg, #d4af37, #aa8b2d);
          color: #1a1a2e;
          box-shadow: 0 0 20px rgba(212,175,55,0.4);
        }
        
        .phase-indicator {
          padding: 8px 20px;
          border-radius: 20px;
          font-size: 12px;
          letter-spacing: 3px;
          text-transform: uppercase;
        }
        
        .phase-reinforce { background: rgba(46,125,50,0.3); border: 1px solid #4caf50; }
        .phase-attack { background: rgba(198,40,40,0.3); border: 1px solid #ef5350; }
        .phase-fortify { background: rgba(30,136,229,0.3); border: 1px solid #42a5f5; }
      `}</style>

      <Navbar troops={{ red: redTroops, blue: blueTroops }} />

      {/* Header */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <h1 style={{
          fontSize: '48px',
          fontWeight: 700,
          letterSpacing: '8px',
          textTransform: 'uppercase',
          margin: 0,
          textShadow: '0 0 30px rgba(212,175,55,0.5)',
          background: 'linear-gradient(180deg, #ffd700 0%, #d4af37 50%, #aa8b2d 100%)',
          WebkitBackgroundClip: 'text',
          WebkitTextFillColor: 'transparent',
        }}>
          Conquest
        </h1>
        <p style={{ 
          fontFamily: '"Crimson Text", Georgia, serif',
          fontStyle: 'italic',
          fontSize: '16px',
          color: '#8b8b8b',
          margin: '8px 0 0 0',
          letterSpacing: '2px'
        }}>
          A Game of Strategy & Dominion
        </p>
      </div>

      {/* Game Info Bar */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        gap: '40px',
        marginBottom: '30px',
        flexWrap: 'wrap'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ fontSize: '12px', letterSpacing: '2px', opacity: 0.7, marginBottom: '4px' }}>CURRENT TURN</div>
          <div style={{
            fontSize: '20px',
            fontWeight: 700,
            color: currentPlayer === 'red' ? '#ef5350' : '#42a5f5',
            textTransform: 'uppercase',
            letterSpacing: '3px'
          }}>
            {currentPlayer} Empire
          </div>
        </div>

        <div className={`phase-indicator phase-${phase}`}>
          {phase} Phase
        </div>

        {phase === 'reinforce' && (
          <div style={{ textAlign: 'center' }}>
            <div style={{ fontSize: '12px', letterSpacing: '2px', opacity: 0.7, marginBottom: '4px' }}>REINFORCEMENTS</div>
            <div style={{ fontSize: '24px', fontWeight: 700 }}>{reinforcements}</div>
          </div>
        )}
      </div>

      {/* Message */}
      <div style={{
        textAlign: 'center',
        marginBottom: '30px',
        padding: '15px 30px',
        background: 'rgba(212,175,55,0.1)',
        border: '1px solid rgba(212,175,55,0.3)',
        borderRadius: '4px',
        fontFamily: '"Crimson Text", Georgia, serif',
        fontSize: '18px',
        fontStyle: 'italic',
        maxWidth: '500px',
        margin: '0 auto 30px auto'
      }}>
        {message}
      </div>

      {/* Territory Grid */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(5, 1fr)',
        gap: '24px',
        maxWidth: '800px',
        margin: '0 auto 40px auto',
        padding: '30px',
        background: 'rgba(0,0,0,0.3)',
        borderRadius: '12px',
        border: '2px solid rgba(139,115,85,0.3)'
      }}>
        {territories.map((territory) => (
          <div
            key={territory.id}
            className={`territory ${territory.owner || 'neutral'} ${selectedTerritory === territory.id ? 'selected' : ''}`}
            onClick={() => handleTerritoryClick(territory.id)}
          >
            <div className="troops-badge">{territory.troops}</div>
            <span style={{
              fontSize: '13px',
              fontWeight: 700,
              letterSpacing: '1px',
              textAlign: 'center',
              color: '#e8e8e8',
              textShadow: '0 2px 4px rgba(0,0,0,0.5)'
            }}>
              {territory.name}
            </span>
            <span style={{
              fontSize: '10px',
              opacity: 0.6,
              marginTop: '4px',
              textTransform: 'uppercase',
              letterSpacing: '1px'
            }}>
              {territory.owner || 'neutral'}
            </span>
          </div>
        ))}
      </div>

      {/* Controls */}
      <div style={{ textAlign: 'center', marginBottom: '30px' }}>
        <button className="btn" onClick={endPhase}>
          {phase === 'attack' ? 'End Attacks' : phase === 'fortify' ? 'End Turn' : 'Skip'}
        </button>
      </div>

      {/* Score */}
      <div style={{
        display: 'flex',
        justifyContent: 'center',
        gap: '60px'
      }}>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: '36px', 
            fontWeight: 700, 
            color: '#ef5350',
            textShadow: '0 0 20px rgba(239,83,80,0.5)'
          }}>
            {redCount}
          </div>
          <div style={{ fontSize: '12px', letterSpacing: '3px', opacity: 0.7 }}>RED TERRITORIES</div>
        </div>
        <div style={{ textAlign: 'center' }}>
          <div style={{ 
            fontSize: '36px', 
            fontWeight: 700, 
            color: '#42a5f5',
            textShadow: '0 0 20px rgba(66,165,245,0.5)'
          }}>
            {blueCount}
          </div>
          <div style={{ fontSize: '12px', letterSpacing: '3px', opacity: 0.7 }}>BLUE TERRITORIES</div>
        </div>
      </div>

      {/* Victory Check */}
      {(redCount === 0 || blueCount === 0) && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.9)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          flexDirection: 'column',
          zIndex: 100
        }}>
          <h2 style={{
            fontSize: '64px',
            color: redCount === 0 ? '#42a5f5' : '#ef5350',
            textShadow: `0 0 60px ${redCount === 0 ? '#42a5f5' : '#ef5350'}`,
            letterSpacing: '8px',
            marginBottom: '20px'
          }}>
            {redCount === 0 ? 'BLUE' : 'RED'} VICTORY
          </h2>
          <button className="btn" onClick={() => {
            setTerritories(initialTerritories);
            setCurrentPlayer('red');
            setPhase('reinforce');
            setReinforcements(3);
            setSelectedTerritory(null);
            setMessage('Place your reinforcements');
          }}>
            Play Again
          </button>
        </div>
      )}
    </div>
  );
}
