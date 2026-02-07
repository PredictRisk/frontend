import { useEffect, useMemo, useState } from 'react';
import { useAccount, useReadContract, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';
import { parseEther } from 'viem';

import riskGameAbi from '../artifacts/contracts/RiskGame.sol/RiskGame.json';
import erc20Abi from '../artifacts/contracts/ArmyToken.sol/ArmyToken.json';
import territoryNftAbi from '../artifacts/contracts/TerritoryNFT.sol/TerritoryNFT.json';
import { ARMY_TOKEN_ADDRESS, RISK_GAME_ADDRESS, TERRITORY_NFT_ADDRESS, useArmyBalance, useArmyAllowance, useTerritoryArmies, useTerritoryOwner, useSpawnProtection } from '../hooks/useContract';

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

const MIN_ARMIES_RAW = 10n * 10n ** 18n;

function ActionPanel({
  selectedTerritory,
  targetTerritory,
  selectedTerritoryExists,
  selectedTerritoryName,
  targetTerritoryName,
  selectedOwnerAddress,
  attackableTargets,
  neighborNames,
  onSelectTarget,
  onActionComplete,
  onOpenProfile,
  onClose,
}: {
  selectedTerritory: number | null;
  targetTerritory: number | null;
  selectedTerritoryExists?: boolean;
  selectedTerritoryName?: string | null;
  targetTerritoryName?: string | null;
  selectedOwnerAddress?: `0x${string}` | null;
  attackableTargets?: Array<{
    id: number;
    name: string;
    owner: `0x${string}` | null;
  }>;
  neighborNames?: string[];
  onSelectTarget?: (id: number) => void;
  onActionComplete?: () => void;
  onOpenProfile?: (owner: `0x${string}`) => void;
  onClose: () => void;
}) {
  const { address } = useAccount();
  const [amount, setAmount] = useState('');
  const [action, setAction] = useState<'station' | 'attack'>('station');

  const { balance, refetch: refetchBalance } = useArmyBalance(address);
  const { allowanceRaw, refetch: refetchAllowance } = useArmyAllowance(address);
  const { armies: selectedArmies, armiesRaw: selectedArmiesRaw, refetch: refetchSelected } =
    useTerritoryArmies(selectedTerritory ?? 0);
  const { armies: targetArmies, armiesRaw: targetArmiesRaw, refetch: refetchTarget } =
    useTerritoryArmies(targetTerritory ?? 0);
  const { owner: selectedOwner } = useTerritoryOwner(selectedTerritory ?? 0);
  const { isProtected } = useSpawnProtection(targetTerritory ?? 0);
  const { data: targetExists } = useReadContract({
    address: TERRITORY_NFT_ADDRESS,
    abi: territoryNftAbi.abi,
    functionName: 'exists',
    args: targetTerritory !== null ? [BigInt(targetTerritory)] : undefined,
    query: { enabled: targetTerritory !== null },
  });

  const isYourTerritory = selectedOwner?.toLowerCase() === address?.toLowerCase();

  // Approve
  const { writeContract: writeApprove, data: approveHash, isPending: isApproving } = useWriteContract();
  const { isSuccess: approveSuccess } = useWaitForTransactionReceipt({ hash: approveHash });

  // Station
  const { writeContract: writeStation, data: stationHash, isPending: isStationing } = useWriteContract();
  const { isSuccess: stationSuccess } = useWaitForTransactionReceipt({ hash: stationHash });

  // Attack
  const { writeContract: writeAttack, data: attackHash, isPending: isAttacking } = useWriteContract();
  const { isSuccess: attackSuccess } = useWaitForTransactionReceipt({ hash: attackHash });

  useEffect(() => {
    if (approveSuccess || stationSuccess || attackSuccess) {
      refetchBalance();
      refetchAllowance();
      refetchSelected();
      refetchTarget();
      setAmount('');
      onActionComplete?.();
    }
  }, [
    approveSuccess,
    stationSuccess,
    attackSuccess,
    refetchBalance,
    refetchAllowance,
    refetchSelected,
    refetchTarget,
    onActionComplete,
  ]);

  const needsApproval = action === 'station' && parseEther(amount || '0') > allowanceRaw;
  const attackAmountRaw = useMemo(() => parseEther(amount || '0'), [amount]);
  const isTargetMinted = typeof targetExists === 'boolean' ? targetExists : false;
  const attackLoss = useMemo(() => {
    if (!isTargetMinted) return 0n;
    return (targetArmiesRaw * 14n) / 10n;
  }, [isTargetMinted, targetArmiesRaw]);

  const attackErrors = useMemo(() => {
    if (action !== 'attack') return [];
    const errors: string[] = [];
    if (targetTerritory === null) errors.push('Select a target territory.');
    if (isProtected) errors.push('Target is protected.');
    if (attackAmountRaw < MIN_ARMIES_RAW) errors.push('Attack with at least 10 armies.');
    if (selectedArmiesRaw < attackAmountRaw + MIN_ARMIES_RAW) {
      errors.push('Leave at least 10 armies on your territory.');
    }
    if (isTargetMinted) {
      if (attackAmountRaw * 10n < targetArmiesRaw * 27n) {
        errors.push('Need 2.7x armies vs defender.');
      }
      if (attackAmountRaw < attackLoss + MIN_ARMIES_RAW) {
        errors.push('Attack too small to leave 10 on conquered territory.');
      }
    }
    return errors;
  }, [
    action,
    attackAmountRaw,
    selectedArmiesRaw,
    targetTerritory,
    isProtected,
    isTargetMinted,
    targetArmiesRaw,
    attackLoss,
  ]);

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

  const territoryName =
    selectedTerritoryName ??
    (selectedTerritory !== null ? TERRITORIES[selectedTerritory]?.name ?? `Territory ${selectedTerritory}` : "Unknown");

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
        style={{
          position: 'absolute',
          top: '10px',
          right: '10px',
          background: 'none',
          border: 'none',
          color: '#888',
          cursor: 'pointer',
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
          {action === 'attack' && attackableTargets && attackableTargets.length > 0 && (
            <div style={{ marginBottom: '12px' }}>
              <div style={{ fontSize: '12px', color: '#888', marginBottom: '6px' }}>
                Attackable neighbors
              </div>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px' }}>
                {attackableTargets.map((target) => {
                  const isSelectedTarget = targetTerritory === target.id;
                  const label = target.owner ? target.name : `${target.name} (empty)`;
                  return (
                    <button
                      key={target.id}
                      type="button"
                      onClick={() => onSelectTarget?.(target.id)}
                      style={{
                        padding: '6px 10px',
                        borderRadius: '6px',
                        border: '1px solid rgba(255,255,255,0.12)',
                        background: isSelectedTarget ? 'rgba(239,68,68,0.25)' : 'rgba(255,255,255,0.05)',
                        color: isSelectedTarget ? '#fecaca' : '#e2e8f0',
                        cursor: 'pointer',
                        fontFamily: '"Cinzel", serif',
                        fontSize: '11px',
                      }}
                    >
                      {label}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
          <div style={{ display: 'flex', gap: '10px', marginBottom: '15px' }}>
            <button
              onClick={() => setAction('station')}
              style={{
                flex: 1,
                padding: '8px',
                background: action === 'station' ? '#d4af37' : 'transparent',
                border: '1px solid #d4af37',
                borderRadius: '4px',
                color: action === 'station' ? '#1a1a2e' : '#d4af37',
                cursor: 'pointer',
                fontFamily: '"Cinzel", serif',
              }}
            >
              Station
            </button>
            <button
              onClick={() => setAction('attack')}
              style={{
                flex: 1,
                padding: '8px',
                background: action === 'attack' ? '#ef5350' : 'transparent',
                border: '1px solid #ef5350',
                borderRadius: '4px',
                color: action === 'attack' ? '#fff' : '#ef5350',
                cursor: 'pointer',
                fontFamily: '"Cinzel", serif',
              }}
            >
              Attack
            </button>
          </div>

          {action === 'attack' && targetTerritory !== null && (
            <div style={{ marginBottom: '10px', fontSize: '14px', color: '#888' }}>
              Target: {targetTerritoryName ?? TERRITORIES[targetTerritory]?.name ?? `Territory ${targetTerritory}`} ({targetArmies} armies)
              {isProtected && <span style={{ color: '#2196f3' }}> 🛡️ Protected</span>}
            </div>
          )}

          <div style={{ display: 'flex', gap: '10px' }}>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="Amount"
              style={{
                flex: 1,
                padding: '10px',
                background: 'rgba(255,255,255,0.1)',
                border: '1px solid rgba(212,175,55,0.3)',
                borderRadius: '4px',
                color: '#fff',
                fontSize: '16px',
              }}
            />
            {action === 'station' && needsApproval ? (
              <button
                onClick={handleApprove}
                disabled={isApproving}
                style={{
                  padding: '10px 20px',
                  background: '#ff9800',
                  border: 'none',
                  borderRadius: '4px',
                  color: '#fff',
                  cursor: 'pointer',
                  fontFamily: '"Cinzel", serif',
                }}
              >
                {isApproving ? 'Approving...' : 'Approve'}
              </button>
            ) : (
              <button
                onClick={
                  action === 'station' ? handleStation : handleAttack
                }
                disabled={
                  isStationing || isAttacking ||
                  !amount ||
                  (action === 'attack' && attackErrors.length > 0)
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
                {isStationing || isAttacking ? 'Processing...' :
                  action === 'station' ? 'Station' :
                  'Attack'}
              </button>
            )}
          </div>

          {action === 'attack' && attackErrors.length > 0 && (
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#ef5350' }}>
              {attackErrors[0]}
            </div>
          )}

          <div style={{ marginTop: '10px', fontSize: '12px', color: '#888' }}>
            Your balance: {parseFloat(balance).toFixed(2)} Army Tokens
          </div>
        </>
      ) : (
        <div style={{ color: selectedTerritoryExists ? '#ef5350' : '#94a3b8' }}>
          {selectedTerritoryExists
            ? 'This territory belongs to someone else.'
            : 'Unclaimed territory. Claim it from the top bar if you have no territories yet.'}
          {selectedOwnerAddress && selectedTerritoryExists && (
            <div style={{ marginTop: '10px' }}>
              <button
                type="button"
                onClick={() => onOpenProfile?.(selectedOwnerAddress)}
                style={{
                  padding: '6px 10px',
                  borderRadius: '6px',
                  border: '1px solid rgba(255,255,255,0.2)',
                  background: 'rgba(255,255,255,0.08)',
                  color: '#e2e8f0',
                  cursor: 'pointer',
                  fontFamily: '"Cinzel", serif',
                  fontSize: '12px',
                }}
              >
                Open player profile
              </button>
            </div>
          )}
          {neighborNames && neighborNames.length > 0 && (
            <div style={{ marginTop: '10px', fontSize: '12px', color: '#9aa0b8' }}>
              Neighbors: {neighborNames.join(', ')}
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export default ActionPanel;
