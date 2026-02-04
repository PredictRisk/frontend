import { useState } from 'react';
import { useAccount } from 'wagmi';

import Navbar from '../components/Navbar';
import { useTerritoryArmies, useTerritoryOwner, useSpawnProtection } from '../hooks/useContract';
import TerritoryCard from '../components/TerritoryCard';
import ClaimButton from '../components/ClaimButton';
import ActionPanel from '../components/ActionPanel';
import MintTerritoryPanel from '../components/MintTerritoryPanel';

interface Territory {
  id: number;
  name: string;
  neighbors: number[];
}

const TERRITORIES: Territory [] = [
  { id: 0, name: 'Northland', neighbors: [1, 3, 4] },
  { id: 1, name: 'Frostheim', neighbors: [0, 2, 4] },
  { id: 2, name: 'Eastmark', neighbors: [1, 4, 5] },
  { id: 3, name: 'Westmoor', neighbors: [0, 4, 6] },
  { id: 4, name: 'Heartland', neighbors: [0, 1, 2, 3, 5, 6, 7] },
  { id: 5, name: 'Ironcoast', neighbors: [2, 4, 7, 8] },
  { id: 6, name: 'Shadowvale', neighbors: [3, 4, 7, 9] },
  { id: 7, name: 'Midlands', neighbors: [4, 5, 6, 8, 9] },
  { id: 8, name: 'Sunreach', neighbors: [5, 7, 9] },
  { id: 9, name: 'Darkhollow', neighbors: [6, 7, 8] },
];

export default function RiskGame() {
  const { isConnected, address } = useAccount();

  const [selectedTerritory, setSelectedTerritory] = useState<number | null>(null);
  const [targetTerritory, setTargetTerritory] = useState<number | null>(null);

   // Fetch all territory data
  const territoryData = TERRITORIES.map((t) => {
    const { armies } = useTerritoryArmies(t.id);
    const { owner } = useTerritoryOwner(t.id);
    const { isProtected } = useSpawnProtection(t.id);
    return { ...t, armies, owner, isProtected };
  });

  // Calculate total stationed armies for player
  const totalArmies = territoryData
    .filter((t) => t.owner?.toLowerCase() === address?.toLowerCase())
    .reduce((sum, t) => sum + parseFloat(t.armies), 0)
    .toFixed(0);

  const handleTerritoryClick = (id: number) => {
    const territory = territoryData[id];
    const isYours = territory.owner?.toLowerCase() === address?.toLowerCase();

    if (selectedTerritory === null) {
      setSelectedTerritory(id);
      setTargetTerritory(null);
    } else if (selectedTerritory === id) {
      setSelectedTerritory(null);
      setTargetTerritory(null);
    } else {
      const selectedData = territoryData[selectedTerritory];
      const isSelectedYours = selectedData.owner?.toLowerCase() === address?.toLowerCase();

      if (isSelectedYours && !isYours && TERRITORIES[selectedTerritory].neighbors.includes(id)) {
        setTargetTerritory(id);
      } else {
        setSelectedTerritory(id);
        setTargetTerritory(null);
      }
    }
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: 'linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)',
    }}>
      <style>{`
        @import url('https://fonts.googleapis.com/css2?family=Cinzel:wght@400;700&display=swap');
      `}</style>

      <Navbar totalArmies={totalArmies} />

      {!isConnected ? (
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          height: 'calc(100vh - 60px)',
          fontFamily: '"Cinzel", serif',
          color: '#d4af37',
        }}>
          <h1 style={{ fontSize: '48px', letterSpacing: '8px', marginBottom: '20px' }}>CONQUEST</h1>
          <p style={{ color: '#888' }}>Connect your wallet to play</p>
        </div>
      ) : (
        <div style={{ padding: '30px' }}>
          {/* Header */}
          <div style={{
            display: 'flex',
            justifyContent: 'center',
            marginBottom: '30px',
            gap: '10px',
          }}>

            <ClaimButton />
            <MintTerritoryPanel />
          </div>

          {/* Territory Grid */}
          <div style={{
            display: 'grid',
            gridTemplateColumns: 'repeat(5, 1fr)',
            gap: '24px',
            maxWidth: '900px',
            margin: '0 auto',
            padding: '30px',
            background: 'rgba(0,0,0,0.3)',
            borderRadius: '12px',
            border: '2px solid rgba(139,115,85,0.3)',
          }}>
            {territoryData.map((territory) => (
              <TerritoryCard
                key={territory.id}
                territory={territory}
                isSelected={selectedTerritory === territory.id || targetTerritory === territory.id}
                isOwned={territory.owner?.toLowerCase() === address?.toLowerCase()}
                armies={territory.armies}
                owner={territory.owner}
                isProtected={territory.isProtected}
                onClick={() => handleTerritoryClick(territory.id)}
              />
            ))}
          </div>

          {/* Instructions */}
          <div style={{
            textAlign: 'center',
            marginTop: '20px',
            fontFamily: '"Cinzel", serif',
            color: '#888',
            fontSize: '14px',
          }}>
            Click a territory to station/withdraw armies • Select your territory, then an adjacent enemy to attack
          </div>

          {/* Action Panel */}
          <ActionPanel
            selectedTerritory={selectedTerritory}
            targetTerritory={targetTerritory}
            onClose={() => {
              setSelectedTerritory(null);
              setTargetTerritory(null);
            }}
          />
        </div>
      )}
    </div>
  );
}
