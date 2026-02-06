import { sdk } from "@farcaster/miniapp-sdk";
import { useEffect } from "react";
import { HashRouter, Routes, Route } from "react-router-dom";
import RiskGame from "./pages/Game";
import Sidebar from "./components/Sidebar";
import MapView from "./pages/MapView";
import Polymarket from "./pages/Polymarket";
import MapV2 from "./pages/MapV2";

function App() {
  useEffect(() => {
    sdk.actions.ready();
  }, []);

  return (
    <HashRouter>
      <div style={{ display: "flex" }}>
        <Sidebar />

        {/* Main content area */}
        <main
          style={{
            marginLeft: "280px",
            flex: 1,
            minHeight: "100vh",
            background: "linear-gradient(135deg, #1a1a2e 0%, #16213e 50%, #0f3460 100%)",
          }}
        >
          <Routes>
            <Route path="/" element={<MapView />} />
            <Route path="/map-v2" element={<MapV2 />} />
            <Route path="/dashboard" element={<RiskGame />} />
            <Route path="/polymarket" element={<Polymarket />} />
            <Route path="/stats" element={<RiskGame />} />
            <Route path="/admin" element={<RiskGame />} />
          </Routes>
        </main>
      </div>
    </HashRouter>
  );
}

export default App;
