import { useEffect, useState } from 'react';
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';

import territoryNftAbi from '../artifacts/contracts/TerritoryNFT.sol/TerritoryNFT.json';
import { TERRITORY_NFT_ADDRESS } from '../hooks/useContract';

interface Territory {
  id: number;
  name: string;
  neighbors: number[];
}

const TERRITORIES: Territory[] = [
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


// Mint Territory Component (Owner Only)
function MintTerritoryPanel() {
  const { address } = useAccount();
  const [recipient, setRecipient] = useState('');
  const [tokenId, setTokenId] = useState('');
  const [uri, setUri] = useState('');
  const [isOpen, setIsOpen] = useState(false);

  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) {
      setRecipient('');
      setTokenId('');
      setUri('');
      alert('Territory minted successfully!');
    }
  }, [isSuccess]);

  const handleMint = () => {
    if (!recipient || !tokenId) return;
    writeContract({
      address: TERRITORY_NFT_ADDRESS,
      abi: territoryNftAbi.abi,
      functionName: 'mintTerritory',
      args: [recipient as `0x${string}`, BigInt(tokenId), uri || ''],
    });
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        style={{
          padding: '10px 20px',
          background: 'linear-gradient(145deg, #9c27b0, #7b1fa2)',
          border: 'none',
          borderRadius: '4px',
          color: '#fff',
          cursor: 'pointer',
          fontFamily: '"Cinzel", serif',
          fontWeight: 700,
          letterSpacing: '1px',
          marginLeft: '10px',
        }}
      >
        🏰 Mint Territory (Admin)
      </button>

      {isOpen && (
        <div style={{
          position: 'fixed',
          inset: 0,
          background: 'rgba(0,0,0,0.8)',
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 1000,
        }}>
          <div style={{
            background: 'rgba(26, 26, 46, 0.98)',
            border: '2px solid rgba(212, 175, 55, 0.5)',
            borderRadius: '12px',
            padding: '30px',
            minWidth: '450px',
            fontFamily: '"Cinzel", serif',
            color: '#d4af37',
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '20px' }}>
              <h2 style={{ margin: 0, fontSize: '20px' }}>🏰 Mint New Territory</h2>
              <button
                onClick={() => setIsOpen(false)}
                style={{ background: 'none', border: 'none', color: '#888', cursor: 'pointer', fontSize: '20px' }}
              >
                ✕
              </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '15px' }}>
              <div>
                <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '5px' }}>
                  Recipient Address
                </label>
                <input
                  type="text"
                  value={recipient}
                  onChange={(e) => setRecipient(e.target.value)}
                  placeholder="0x..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(212,175,55,0.3)',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '5px' }}>
                  Token ID (0-9 for territories)
                </label>
                <input
                  type="number"
                  value={tokenId}
                  onChange={(e) => setTokenId(e.target.value)}
                  placeholder="0"
                  min="0"
                  max="9"
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(212,175,55,0.3)',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              <div>
                <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '5px' }}>
                  Metadata URI (optional)
                </label>
                <input
                  type="text"
                  value={uri}
                  onChange={(e) => setUri(e.target.value)}
                  placeholder="ipfs://... or https://..."
                  style={{
                    width: '100%',
                    padding: '12px',
                    background: 'rgba(255,255,255,0.1)',
                    border: '1px solid rgba(212,175,55,0.3)',
                    borderRadius: '4px',
                    color: '#fff',
                    fontSize: '14px',
                    boxSizing: 'border-box',
                  }}
                />
              </div>

              {/* Quick mint to self buttons */}
              <div>
                <label style={{ fontSize: '12px', color: '#888', display: 'block', marginBottom: '8px' }}>
                  Quick Mint to Self
                </label>
                <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                  {TERRITORIES.map((t) => (
                    <button
                      key={t.id}
                      onClick={() => {
                        setRecipient(address || '');
                        setTokenId(t.id.toString());
                      }}
                      style={{
                        padding: '6px 12px',
                        background: tokenId === t.id.toString() ? '#d4af37' : 'rgba(255,255,255,0.1)',
                        border: '1px solid rgba(212,175,55,0.3)',
                        borderRadius: '4px',
                        color: tokenId === t.id.toString() ? '#1a1a2e' : '#d4af37',
                        cursor: 'pointer',
                        fontSize: '11px',
                        fontFamily: '"Cinzel", serif',
                      }}
                    >
                      {t.id}: {t.name}
                    </button>
                  ))}
                </div>
              </div>

              {error && (
                <div style={{ color: '#ef5350', fontSize: '12px', padding: '10px', background: 'rgba(239,83,80,0.1)', borderRadius: '4px' }}>
                  {error.message.includes('already minted') || error.message.includes('token already minted')
                    ? 'This territory has already been minted!'
                    : error.message}
                </div>
              )}

              <button
                onClick={handleMint}
                disabled={isPending || isConfirming || !recipient || !tokenId}
                style={{
                  padding: '14px',
                  background: isPending || isConfirming
                    ? '#4a4a4a'
                    : 'linear-gradient(145deg, #9c27b0, #7b1fa2)',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#fff',
                  cursor: isPending || isConfirming ? 'not-allowed' : 'pointer',
                  fontFamily: '"Cinzel", serif',
                  fontWeight: 700,
                  fontSize: '16px',
                  letterSpacing: '2px',
                  marginTop: '10px',
                }}
              >
                {isPending ? '⏳ Confirm in Wallet...' : isConfirming ? '⛏️ Mining...' : '🏰 Mint Territory'}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

export default MintTerritoryPanel;
