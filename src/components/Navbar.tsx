import { useAccount, useConnect } from "wagmi";

import { useArmyBalance } from "../hooks/useContract";

function Navbar({ totalArmies }: { totalArmies: string }) {
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();
  const { balance } = useArmyBalance(address);

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 24px',
      background: 'rgba(26, 26, 46, 0.95)',
      borderBottom: '1px solid rgba(212, 175, 55, 0.3)',
      fontFamily: '"Cinzel", serif',
    }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '24px' }}>
        <div style={{ color: '#d4af37', fontSize: '20px', fontWeight: 700, letterSpacing: '3px' }}>
          CONQUEST
        </div>
        {isConnected && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              padding: '4px 12px',
              background: 'rgba(212, 175, 55, 0.2)',
              border: '1px solid rgba(212, 175, 55, 0.4)',
              borderRadius: '4px',
              color: '#d4af37',
              fontSize: '14px',
            }}>
              🪖 {parseFloat(balance).toFixed(0)} Army Tokens
            </span>
            <span style={{
              padding: '4px 12px',
              background: 'rgba(76, 175, 80, 0.2)',
              border: '1px solid rgba(76, 175, 80, 0.4)',
              borderRadius: '4px',
              color: '#4caf50',
              fontSize: '14px',
            }}>
              ⚔️ {totalArmies} Stationed
            </span>
          </div>
        )}
      </div>

      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {isConnected ? (
          <div style={{
            padding: '8px 16px',
            background: 'rgba(212, 175, 55, 0.1)',
            border: '1px solid rgba(212, 175, 55, 0.3)',
            borderRadius: '4px',
            color: '#d4af37',
            fontSize: '14px',
          }}>
            {address?.slice(0, 6)}...{address?.slice(-4)}
          </div>
        ) : (
          <button
            type="button"
            onClick={() => connect({ connector: connectors[1] })}
            style={{
              padding: '10px 20px',
              background: 'linear-gradient(145deg, #d4af37, #aa8b2d)',
              border: 'none',
              borderRadius: '4px',
              color: '#1a1a2e',
              fontWeight: 700,
              cursor: 'pointer',
              fontFamily: '"Cinzel", serif',
            }}
          >
            Connect Wallet
          </button>
        )}
      </div>
    </nav>
  );
}

export default Navbar;
