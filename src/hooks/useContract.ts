import { useReadContract, useWriteContract, useWaitForTransactionReceipt, useAccount } from 'wagmi';
import { parseEther, formatEther } from 'viem';

import riskGameAbi from '../artifacts/contracts/RiskGame.sol/RiskGame.json';
import erc20Abi from '../artifacts/contracts/ArmyToken.sol/ArmyToken.json';
import territoryNftAbi from '../artifacts/contracts/TerritoryNFT.sol/TerritoryNFT.json';
import localhostDeployments from '../deployments/localhost.json';
import baseSepoliaDeployments from '../deployments/baseSepolia.json';

const networkName = (import.meta.env.VITE_NETWORK || 'localhost').toLowerCase();
const activeDeployments =
  networkName === 'basesepolia' ? baseSepoliaDeployments : localhostDeployments;

export const RISK_GAME_ADDRESS = activeDeployments.riskGame as `0x${string}`;
export const ARMY_TOKEN_ADDRESS = activeDeployments.armyToken as `0x${string}`;
export const TERRITORY_NFT_ADDRESS = activeDeployments.territoryNft as `0x${string}`;
export const BET_ESCROW_ADDRESS = activeDeployments.betEscrow as `0x${string}`;
// ==================== READ HOOKS ====================

// Get armies stationed on a territory
export function useTerritoryArmies(territoryId: number) {
  const { data, isLoading, refetch } = useReadContract({
    address: RISK_GAME_ADDRESS,
    abi: riskGameAbi.abi,
    functionName: 'territoryArmies',
    args: [BigInt(territoryId)],
  });

  const armiesValue = typeof data === 'bigint' ? data : 0n;

  return {
    armies: formatEther(armiesValue),
    armiesRaw: armiesValue,
    isLoading,
    refetch,
  };
}

// Get last claim timestamp for a player
export function useLastClaim(playerAddress?: `0x${string}`) {
  const { data, isLoading, refetch } = useReadContract({
    address: RISK_GAME_ADDRESS,
    abi: riskGameAbi.abi,
    functionName: 'lastClaim',
    args: playerAddress ? [playerAddress] : undefined,
    query: { enabled: !!playerAddress },
  });

  const lastClaimTime = data ? Number(data) * 1000 : 0;
  const nextClaimTime = lastClaimTime + 24 * 60 * 60 * 1000;
  const canClaim = Date.now() >= nextClaimTime;

  return {
    lastClaimTime,
    nextClaimTime,
    canClaim,
    isLoading,
    refetch,
  };
}

// Check if territories are adjacent
export function useAreAdjacent(territoryA: number, territoryB: number) {
  const { data, isLoading } = useReadContract({
    address: RISK_GAME_ADDRESS,
    abi: riskGameAbi.abi,
    functionName: 'areAdjacent',
    args: [BigInt(territoryA), BigInt(territoryB)],
  });

  return { areAdjacent: data ?? false, isLoading };
}

// Check if territory is a spawn territory
export function useIsSpawnTerritory(territoryId: number) {
  const { data, isLoading } = useReadContract({
    address: RISK_GAME_ADDRESS,
    abi: riskGameAbi.abi,
    functionName: 'isSpawnTerritory',
    args: [BigInt(territoryId)],
  });

  return { isSpawn: data ?? false, isLoading };
}

// Get spawn protection end time
export function useSpawnProtection(territoryId: number) {
  const { data, isLoading } = useReadContract({
    address: RISK_GAME_ADDRESS,
    abi: riskGameAbi.abi,
    functionName: 'spawnProtectionUntil',
    args: [BigInt(territoryId)],
  });

  const protectionEnd = data ? Number(data) * 1000 : 0;
  const isProtected = Date.now() < protectionEnd;

  return { protectionEnd, isProtected, isLoading };
}

// Get player's army token balance
export function useArmyBalance(playerAddress?: `0x${string}`) {
  const { data, isLoading, refetch } = useReadContract({
    address: ARMY_TOKEN_ADDRESS,
    abi: erc20Abi.abi,
    functionName: 'balanceOf',
    args: playerAddress ? [playerAddress] : undefined,
    query: { enabled: !!playerAddress },
  });

  const balanceValue = typeof data === 'bigint' ? data : 0n;

  return {
    balance: formatEther(balanceValue),
    balanceRaw: balanceValue,
    isLoading,
    refetch,
  };
}

// Get allowance for RiskGame contract
export function useArmyAllowance(playerAddress?: `0x${string}`) {
  const { data, isLoading, refetch } = useReadContract({
    address: ARMY_TOKEN_ADDRESS,
    abi: erc20Abi.abi,
    functionName: 'allowance',
    args: playerAddress ? [playerAddress, RISK_GAME_ADDRESS] : undefined,
    query: { enabled: !!playerAddress },
  });

  const allowanceValue = typeof data === 'bigint' ? data : 0n;

  return {
    allowance: formatEther(allowanceValue),
    allowanceRaw: allowanceValue,
    isLoading,
    refetch,
  };
}

// Get allowance for BetEscrow contract
export function useArmyAllowanceForBets(playerAddress?: `0x${string}`) {
  const { data, isLoading, refetch } = useReadContract({
    address: ARMY_TOKEN_ADDRESS,
    abi: erc20Abi.abi,
    functionName: 'allowance',
    args: playerAddress ? [playerAddress, BET_ESCROW_ADDRESS] : undefined,
    query: { enabled: !!playerAddress },
  });

  const allowanceValue = typeof data === 'bigint' ? data : 0n;

  return {
    allowance: formatEther(allowanceValue),
    allowanceRaw: allowanceValue,
    isLoading,
    refetch,
  };
}

// ==================== WRITE HOOKS ====================

// Claim daily armies
export function useClaimDailyArmies() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const claim = () => {
    writeContract({
      address: RISK_GAME_ADDRESS,
      abi: riskGameAbi.abi,
      functionName: 'claimDailyArmies',
    });
  };

  return { claim, isPending, isConfirming, isSuccess, error, hash };
}

// Approve army tokens for staking
export function useApproveArmyTokens() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const approve = (amount: string) => {
    writeContract({
      address: ARMY_TOKEN_ADDRESS,
      abi: erc20Abi.abi,
      functionName: 'approve',
      args: [RISK_GAME_ADDRESS, parseEther(amount)],
    });
  };

  const approveMax = () => {
    writeContract({
      address: ARMY_TOKEN_ADDRESS,
      abi: erc20Abi.abi,
      functionName: 'approve',
      args: [RISK_GAME_ADDRESS, BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')],
    });
  };

  return { approve, approveMax, isPending, isConfirming, isSuccess, error, hash };
}

// Approve army tokens for betting escrow
export function useApproveArmyTokensForBets() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const approve = (amount: string) => {
    writeContract({
      address: ARMY_TOKEN_ADDRESS,
      abi: erc20Abi.abi,
      functionName: 'approve',
      args: [BET_ESCROW_ADDRESS, parseEther(amount)],
    });
  };

  const approveMax = () => {
    writeContract({
      address: ARMY_TOKEN_ADDRESS,
      abi: erc20Abi.abi,
      functionName: 'approve',
      args: [BET_ESCROW_ADDRESS, BigInt('0xffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffffff')],
    });
  };

  return { approve, approveMax, isPending, isConfirming, isSuccess, error, hash };
}

// Station armies on a territory
export function useStationArmies() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const station = (territoryId: number, amount: string) => {
    writeContract({
      address: RISK_GAME_ADDRESS,
      abi: riskGameAbi.abi,
      functionName: 'stationArmies',
      args: [BigInt(territoryId), parseEther(amount)],
    });
  };

  return { station, isPending, isConfirming, isSuccess, error, hash };
}

// Withdraw armies from a territory
export function useWithdrawArmies() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const withdraw = (territoryId: number, amount: string) => {
    writeContract({
      address: RISK_GAME_ADDRESS,
      abi: riskGameAbi.abi,
      functionName: 'withdrawArmies',
      args: [BigInt(territoryId), parseEther(amount)],
    });
  };

  return { withdraw, isPending, isConfirming, isSuccess, error, hash };
}

// Claim a spawn territory
export function useClaimSpawnTerritory() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const claimSpawn = (territoryId: number) => {
    writeContract({
      address: RISK_GAME_ADDRESS,
      abi: riskGameAbi.abi,
      functionName: 'claimSpawnTerritory',
      args: [BigInt(territoryId)],
    });
  };

  return { claimSpawn, isPending, isConfirming, isSuccess, error, hash };
}

// Claim initial territory (player chooses)
export function useClaimInitialTerritory() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const claimInitial = (territoryId: number) => {
    writeContract({
      address: RISK_GAME_ADDRESS,
      abi: riskGameAbi.abi,
      functionName: 'claimInitialTerritory',
      args: [BigInt(territoryId)],
    });
  };

  return { claimInitial, isPending, isConfirming, isSuccess, error, hash };
}

// Attack another territory
export function useAttack() {
  const { writeContract, data: hash, isPending, error } = useWriteContract();
  const { isLoading: isConfirming, isSuccess } = useWaitForTransactionReceipt({ hash });

  const attack = (fromId: number, toId: number, armiesToSend: string) => {
    writeContract({
      address: RISK_GAME_ADDRESS,
      abi: riskGameAbi.abi,
      functionName: 'attack',
      args: [BigInt(fromId), BigInt(toId), parseEther(armiesToSend)],
    });
  };

  return { attack, isPending, isConfirming, isSuccess, error, hash };
}


export function useTerritoryOwner(territoryId: number) {
  const { data = null, refetch } = useReadContract({
    address: TERRITORY_NFT_ADDRESS,
    abi: territoryNftAbi.abi,
    functionName: 'ownerOf',
    args: [BigInt(territoryId)],
  });
  return { owner: data, refetch };
}


// ==================== COMBINED HOOK ====================

// All-in-one hook for game state
export function useRiskGame() {
  const { address } = useAccount();
  const armyBalance = useArmyBalance(address);
  const lastClaim = useLastClaim(address);
  const allowance = useArmyAllowance(address);

  return {
    address,
    armyBalance,
    lastClaim,
    allowance,
    refetchAll: () => {
      armyBalance.refetch();
      lastClaim.refetch();
      allowance.refetch();
    },
  };
}