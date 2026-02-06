import { useEffect, useState } from 'react';
import { useAccount, useWaitForTransactionReceipt, useWriteContract, useReadContract } from 'wagmi';
import { parseEther } from 'viem';

import riskGameAbi from '../artifacts/contracts/RiskGame.sol/RiskGame.json';
import erc20Abi from '../artifacts/contracts/ArmyToken.sol/ArmyToken.json';
import { ARMY_TOKEN_ADDRESS, RISK_GAME_ADDRESS, useArmyBalance, useTerritoryArmies, useTerritoryOwner, useSpawnProtection } from '../hooks/useContract';

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

function ActionPanel({
  selectedTerritory,
  targetTerritory,
  onClose,
}: {
  selectedTerritory: number | null;
  targetTerritory: number | null;
  onClose: () => void;
}) {
  const { address } = useAccount();
  const [amount, setAmount] = useState('');
  const [action, setAction] = useState<'station' | 'withdraw' | 'attack'>('station');
  const [hasApproved, setHasApproved] = useState(false); // Track approval locally

  const { balance, refetch: refetchBalance } = useArmyBalance(address);
  const { armies: selectedArmies, refetch: refetchSelected } = useTerritoryArmies(selectedTerritory ?? 0);
  const { armies: targetArmies, refetch: refetchTarget } = useTerritoryArmies(targetTerritory ?? 0);
  const { owner: selectedOwner } = useTerritoryOwner(selectedTerritory ?? 0);
  const { isProtected } = useSpawnProtection(targetTerritory ?? 0);

  // Read allowance directly in this component for better control
  const { data: allowanceData, refetch: refetchAllowance } = useReadContract({
    address: ARMY_TOKEN_ADDRESS,
    abi: erc20Abi.abi,
    functionName: 'allowance',
    args: address ? [address, RISK_GAME_ADDRESS] : undefined,
    query: { enabled: !!address },
  });

  const allowance = (allowanceData as bigint) ?? BigInt(0);

  const isYourTerritory = selectedOwner?.toLowerCase() === address?.toLowerCase();

  // Approve
  const { writeContract: writeApprove, data: approveHash, isPending: isApproving, reset: resetApprove } = useWriteContract();
  const { isSuccess: approveSuccess, isLoading: isApproveConfirming } = useWaitForTransactionReceipt({ hash: approveHash });

  // Station
  const { writeContract: writeStation, data: stationHash, isPending: isStationing } = useWriteContract();
  const { isSuccess: stationSuccess } = useWaitForTransactionReceipt({ hash: stationHash });

  // Withdraw
  const { writeContract: writeWithdraw, data: withdrawHash, isPending: isWithdrawing } = useWriteContract();
  const { isSuccess: withdrawSuccess } = useWaitForTransactionReceipt({ hash: withdrawHash });

  // Attack
  const { writeContract: writeAttack, data: attackHash, isPending: isAttacking } = useWriteContract();
  const { isSuccess: attackSuccess } = useWaitForTransactionReceipt({ hash: attackHash });

  // Handle approval success
  useEffect(() => {
    if (approveSuccess) {
      console.log('Approval successful, refetching allowance...');
      setHasApproved(true); // Set local flag immediately
      refetchAllowance().then(() => {
        console.log('Allowance refetched');
        resetApprove();
      });
    }
  }, [approveSuccess]);

  // Refetch data after successful transactions
  useEffect(() => {
    if (stationSuccess || withdrawSuccess || attackSuccess) {
      refetchBalance();
      refetchAllowance();
      refetchSelected();
      refetchTarget();
      setAmount('');
      setHasApproved(false); // Reset approval flag after action
    }
  }, [stationSuccess, withdrawSuccess, attackSuccess]);

  // Reset hasApproved when amount changes (in case they want to station more than approved)
  useEffect(() => {
    if (amount) {
      const amountWei = parseEther(amount);
      if (amountWei <= allowance) {
        setHasApproved(false); // Don't need the flag if allowance is sufficient
      }
    }
  }, [amount, allowance]);

  // Check if approval is needed
  const amountWei = parseEther(amount || '0');
  const needsApproval = action === 'station' && !hasApproved && amountWei > allowance;

  const handleApprove = () => {
    writeApprove({
      address: ARMY_TOKEN_ADDRESS,
      abi: erc20Abi.abi,
      functionName: 'approve',
      args: [RISK_GAME_ADDRESS, parseEther('999999999')],
    });
  };

  const handleStation = () => {
    if (selectedTerritory === null) return;
    writeStation({
      address: RISK_GAME_ADDRESS,
      abi: riskGameAbi.abi,
      functionName: 'stationArmies',
      args: [BigInt(selectedTerritory), parseEther(amount)],
    });
  };

  const handleWithdraw = () => {
    if (selectedTerritory === null) return;
    writeWithdraw({
      address: RISK_GAME_ADDRESS,
      abi: riskGameAbi.abi,
      functionName: 'withdrawArmies',
      args: [BigInt(selectedTerritory), parseEther(amount)],
    });
  };

  const handleAttack = () => {
    if (selectedTerritory === null || targetTerritory === null) return;
    writeAttack({
      address: RISK_GAME_ADDRESS,
      abi: riskGameAbi.abi,
      functionName: 'attack',
      args: [BigInt(selectedTerritory), BigInt(targetTerritory), parseEther(amount)],
    });
  };

  if (selectedTerritory === null) return null;

  const getTerritoryName = (id: number | null) => {
    if (id === null) return "Unknown";
    return TERRITORIES[id]?.name ?? `Territory ${id}`;
  };

  const territoryName = getTerritoryName(selectedTerritory);

  return (
    <div style={{
      position: 'fixed',
      bottom: '20px',
      left: '50%',
      transform: 'translateX(-50%)',
      background: 'rgba(26, 26, 46, 0.98)',
      border: '2px solid rgba(212, 175, 55, 0.5)',
      borderRadius: '12px',
      padding: '20px 30px',
      minWidth: '400px',
      fontFamily: '"Cinzel", serif',
      color: '#d4af37',
      boxShadow: '0 0 40px rgba(0,0,0,0.8)',
    }}>
      <button
        onClick={onClose}
        disabled={isLoading}
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'none',
          border: 'none',
          color: '#888',
          cursor: isLoading ? 'not-allowed' : 'pointer',
          fontSize: '18px',
        }}
      >
        ✕
      </button>

      <h3 style={{ margin: '0 0 15px 0', fontSize: '18px' }}>
        {territoryName} — {selectedArmies} armies
      </h3>

      {isYourTerritory ? (
        <>
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <button
              onClick={() => setAction('station')}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '8px',
                background: action === 'station' ? '#d4af37' : 'transparent',
                border: '1px solid #d4af37',
                borderRadius: '4px',
                color: action === 'station' ? '#1a1a2e' : '#d4af37',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontFamily: '"Cinzel", serif',
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              Station
            </button>
            <button
              onClick={() => setAction('withdraw')}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '8px',
                background: action === 'withdraw' ? '#d4af37' : 'transparent',
                border: '1px solid #d4af37',
                borderRadius: '4px',
                color: action === 'withdraw' ? '#1a1a2e' : '#d4af37',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontFamily: '"Cinzel", serif',
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              Withdraw
            </button>
            <button
              onClick={() => setAction('attack')}
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '8px',
                background: action === 'attack' ? '#ef5350' : 'transparent',
                border: '1px solid #ef5350',
                borderRadius: '4px',
                color: action === 'attack' ? '#fff' : '#ef5350',
                cursor: isLoading ? 'not-allowed' : 'pointer',
                fontFamily: '"Cinzel", serif',
                opacity: isLoading ? 0.6 : 1,
              }}
            >
              Attack
            </button>
          </div>

          {action === 'attack' && targetTerritory !== null && (
            <div style={{ marginBottom: '10px', fontSize: '14px', color: '#888' }}>
              Target: {getTerritoryName(targetTerritory)} ({targetArmies} armies)
              {isProtected && <span style={{ color: '#2196f3' }}> 🛡️ Protected</span>}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              disabled={isLoading}
              style={{
                flex: 1,
                padding: '10px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(212,175,55,0.3)',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '16px',
                opacity: isLoading ? 0.6 : 1,
              }}
            />
            {needsApproval ? (
              <button
                onClick={handleApprove}
                disabled={isApproving || isApproveConfirming || !amount}
                style={{
                  padding: '10px 20px',
                  background: '#ff9800',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#fff',
                  cursor: (isApproving || isApproveConfirming || !amount) ? 'not-allowed' : 'pointer',
                  fontFamily: '"Cinzel", serif',
                  opacity: (isApproving || isApproveConfirming || !amount) ? 0.6 : 1,
                }}
              >
                {isApproving ? 'Approving...' : isApproveConfirming ? 'Confirming...' : 'Approve'}
              </button>
            ) : (
              <button
                onClick={
                  action === 'station' ? handleStation :
                  action === 'withdraw' ? handleWithdraw :
                  handleAttack
                }
                disabled={
                  isStationing || isWithdrawing || isAttacking ||
                  !amount ||
                  (action === 'attack' && (targetTerritory === null || isProtected))
                }
                style={{
                  padding: '10px 20px',
                  background: action === 'attack' ? '#ef5350' : '#4caf50',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontFamily: '"Cinzel", serif',
                  opacity: !amount ? 0.5 : 1,
                }}
              >
                {isStationing || isWithdrawing || isAttacking ? 'Processing...' :
                  action === 'station' ? 'Station' :
                  action === 'withdraw' ? 'Withdraw' :
                  'Attack'}
              </button>
            )}
          </div>

          {/* Debug info - remove in production */}
          <div style={{ marginTop: '10px', fontSize: '11px', color: '#666' }}>
            Allowance: {allowance.toString()} | Amount: {amountWei.toString()} | Needs Approval: {needsApproval ? 'Yes' : 'No'} | Has Approved: {hasApproved ? 'Yes' : 'No'}
          </div>

          <div style={{ marginTop: '5px', fontSize: '12px', color: '#888' }}>
            Your balance: {parseFloat(balance).toFixed(2)} Army Tokens
          </div>
        </>
      ) : (
        <div style={{ color: '#ef5350' }}>
          This territory belongs to someone else. Select your own territory to attack from.
        </div>
      )}
    </div>
  );
}

export default ActionPanel;
