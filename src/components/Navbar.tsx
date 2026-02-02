import { useAccount, useConnect } from "wagmi";

function Navbar({ troops }: { troops?: { red: number; blue: number } }) {
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '12px 24px',
      background: 'rgba(26, 26, 46, 0.95)',
      borderBottom: '1px solid rgba(212, 175, 55, 0.3)',
    }}>
      {/* Troop Display */}
      {troops && (
        <div style={{ display: 'flex', gap: '24px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#ef5350',
              boxShadow: '0 0 8px rgba(239, 83, 80, 0.5)',
            }} />
            <span style={{ color: '#ef5350', fontWeight: 700 }}>{troops.red}</span>
            <span style={{ color: '#8b8b8b', fontSize: '12px' }}>troops</span>
          </div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <span style={{
              width: '12px',
              height: '12px',
              borderRadius: '50%',
              background: '#42a5f5',
              boxShadow: '0 0 8px rgba(66, 165, 245, 0.5)',
            }} />
            <span style={{ color: '#42a5f5', fontWeight: 700 }}>{troops.blue}</span>
            <span style={{ color: '#8b8b8b', fontSize: '12px' }}>troops</span>
          </div>
        </div>
      )}

      {/* Wallet Connection */}
      <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
        {isConnected ? (
          <>
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
          </>
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
