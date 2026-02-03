import { useAccount } from 'wagmi';

interface Territory {
  id: number;
  name: string;
  neighbors: number[];
}

function TerritoryCard({
  territory,
  isSelected,
  isOwned,
  armies,
  owner,
  isProtected,
  onClick,
}: {
  territory: Territory;
  isSelected: boolean;
  isOwned: boolean;
  armies: string;
  owner?: string;
  isProtected: boolean;
  onClick: () => void;
}) {
  const { address } = useAccount();
  const isYours = owner?.toLowerCase() === address?.toLowerCase();

  return (
    <div
      onClick={onClick}
      style={{
        width: '140px',
        height: '100px',
        border: `3px solid ${isSelected ? '#ffd700' : isYours ? '#4caf50' : '#8b7355'}`,
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        justifyContent: 'center',
        cursor: 'pointer',
        transition: 'all 0.3s ease',
        position: 'relative',
        background: isYours
          ? 'linear-gradient(145deg, #1b5e20 0%, #0d3d0f 100%)'
          : owner
          ? 'linear-gradient(145deg, #8b2500 0%, #3d0f05 100%)'
          : 'linear-gradient(145deg, #4a4a4a 0%, #1a1a1a 100%)',
        boxShadow: isSelected
          ? '0 0 30px #ffd700, 0 0 60px rgba(255,215,0,0.3)'
          : '0 4px 15px rgba(0,0,0,0.4)',
      }}
    >
      {isProtected && (
        <div style={{
          position: 'absolute',
          top: '-8px',
          left: '-8px',
          background: '#2196f3',
          borderRadius: '50%',
          width: '24px',
          height: '24px',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          fontSize: '12px',
        }}>
          🛡️
        </div>
      )}
      <div style={{
        position: 'absolute',
        top: '-12px',
        right: '-12px',
        width: '32px',
        height: '32px',
        borderRadius: '50%',
        background: 'linear-gradient(145deg, #d4af37, #aa8b2d)',
        color: '#1a1a2e',
        fontWeight: 700,
        fontSize: '12px',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        border: '2px solid #ffd700',
      }}>
        {parseFloat(armies).toFixed(0)}
      </div>
      <span style={{
        fontSize: '13px',
        fontWeight: 700,
        color: '#e8e8e8',
        textAlign: 'center',
        fontFamily: '"Cinzel", serif',
      }}>
        {territory.name}
      </span>
      <span style={{
        fontSize: '10px',
        opacity: 0.7,
        marginTop: '4px',
        color: isYours ? '#4caf50' : '#e8e8e8',
      }}>
        {isYours ? 'YOURS' : owner ? `${owner.slice(0, 6)}...` : 'UNCLAIMED'}
      </span>
    </div>
  );
}

export default TerritoryCard;
