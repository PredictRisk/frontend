import { sdk } from "@farcaster/miniapp-sdk";
import { useEffect } from "react";
import { useAccount, useConnect, useSignMessage } from "wagmi";
import RiskGame from "./pages/Game";

function App() {
  useEffect(() => {
    sdk.actions.ready();
  }, []);

  return (
    <>
      <RiskGame />
    </>
  );
}

export default App;
