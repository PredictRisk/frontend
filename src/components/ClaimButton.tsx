import { useEffect } from 'react';
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from 'wagmi';

import riskGameAbi from '../artifacts/contracts/RiskGame.sol/RiskGame.json';
import { useLastClaim, RISK_GAME_ADDRESS } from '../hooks/useContract';

function ClaimButton() {
  const { address } = useAccount();
  const { canClaim, refetch } = useLastClaim(address);
  const { writeContract, data: hash, isPending } = useWriteContract();
  const { isSuccess } = useWaitForTransactionReceipt({ hash });

  useEffect(() => {
    if (isSuccess) refetch();
  }, [isSuccess]);

  const handleClaim = () => {
    writeContract({
      address: RISK_GAME_ADDRESS,
      abi: riskGameAbi.abi,
      functionName: 'claimDailyArmies',
    });
  };

  return (
    <button
      onClick={handleClaim}
      disabled={isPending || !canClaim}
      style={{
        padding: '12px 24px',
        background: canClaim ? 'linear-gradient(145deg, #4caf50, #2e7d32)' : '#4a4a4a',
        border: 'none',
        borderRadius: '4px',
        color: '#fff',
        cursor: canClaim ? 'pointer' : 'not-allowed',
        fontFamily: '"Cinzel", serif',
        fontWeight: 700,
        letterSpacing: '2px',
      }}
    >
      {isPending ? 'Claiming...' : canClaim ? '🎁 Claim Daily Armies' : '⏳ Already Claimed'}
    </button>
  );
}

export default ClaimButton;
