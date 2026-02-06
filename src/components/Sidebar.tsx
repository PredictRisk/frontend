import { useAccount, useConnect } from "wagmi";
import { NavLink, useLocation } from "react-router-dom";
import {
  Map,
  LayoutDashboard,
  TrendingUp,
  BarChart3,
  Settings
} from "lucide-react";

function Sidebar() {
  const { isConnected, address } = useAccount();
  const { connect, connectors } = useConnect();
  const injectedConnector = connectors.find((connector) => connector.id === "injected");
  const location = useLocation();

  const navItems = [
    { path: "/", label: "Map", icon: Map },
    { path: "/map-v2", label: "Map V2", icon: Map },
    { path: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
    { path: "/polymarket", label: "Polymarket", icon: TrendingUp },
    { path: "/stats", label: "Stats", icon: BarChart3 },
    { path: "/admin", label: "Admin", icon: Settings },
  ];

  return (
    <aside
      style={{
        width: "280px",
        height: "100vh",
        background: "linear-gradient(180deg, #0d0d1a 0%, #1a1a2e 100%)",
        borderRight: "1px solid rgba(139, 92, 246, 0.2)",
        display: "flex",
        flexDirection: "column",
        padding: "24px 16px",
        boxSizing: "border-box",
        position: "fixed",
        left: 0,
        top: 0,
        fontFamily: '"Inter", system-ui, sans-serif',
      }}
    >
      {/* Logo */}
      <div style={{ marginBottom: "32px", padding: "0 12px" }}>
        <h1
          style={{
            margin: 0,
            fontSize: "24px",
            fontWeight: 700,
            background: "linear-gradient(135deg, #a855f7 0%, #ec4899 100%)",
            WebkitBackgroundClip: "text",
            WebkitTextFillColor: "transparent",
            letterSpacing: "-0.5px",
          }}
        >
          Territory Wars
        </h1>
        <p
          style={{
            margin: "4px 0 0 0",
            fontSize: "13px",
            color: "#6b7280",
            letterSpacing: "0.5px",
          }}
        >
          NFT Strategy Game
        </p>
      </div>

      {/* Navigation */}
      <nav style={{ flex: 1 }}>
        <ul
          style={{
            listStyle: "none",
            padding: 0,
            margin: 0,
            display: "flex",
            flexDirection: "column",
            gap: "4px",
          }}
        >
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              item.path === "/"
                ? location.pathname === "/"
                : location.pathname.startsWith(item.path);

            return (
              <li key={item.path}>
                <NavLink
                  to={item.path}
                  style={{
                    width: "100%",
                    display: "flex",
                    alignItems: "center",
                    gap: "12px",
                    padding: "14px 16px",
                    border: "none",
                    borderRadius: "12px",
                    cursor: "pointer",
                    fontSize: "15px",
                    fontWeight: 500,
                    transition: "all 0.2s ease",
                    textDecoration: "none",
                    boxSizing: "border-box",
                    background: isActive
                      ? "linear-gradient(135deg, #a855f7 0%, #9333ea 100%)"
                      : "transparent",
                    color: isActive ? "#fff" : "#9ca3af",
                    boxShadow: isActive
                      ? "0 4px 20px rgba(168, 85, 247, 0.4), 0 0 40px rgba(168, 85, 247, 0.1)"
                      : "none",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "rgba(168, 85, 247, 0.1)";
                      e.currentTarget.style.color = "#c4b5fd";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.background = "transparent";
                      e.currentTarget.style.color = "#9ca3af";
                    }
                  }}
                >
                  <Icon size={20} />
                  {item.label}
                </NavLink>
              </li>
            );
          })}
        </ul>
      </nav>

      {/* Wallet Connection */}
      <div
        style={{
          padding: "16px",
          background: isConnected
            ? "rgba(34, 197, 94, 0.08)"
            : "rgba(139, 92, 246, 0.08)",
          borderRadius: "12px",
          border: `1px solid ${
            isConnected ? "rgba(34, 197, 94, 0.3)" : "rgba(139, 92, 246, 0.15)"
          }`,
        }}
      >
        {isConnected ? (
          <div>
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "8px",
                marginBottom: "8px",
              }}
            >
              <div
                style={{
                  width: "8px",
                  height: "8px",
                  borderRadius: "50%",
                  background: "#22c55e",
                  boxShadow: "0 0 8px #22c55e",
                }}
              />
              <span
                style={{ fontSize: "14px", color: "#22c55e", fontWeight: 500 }}
              >
                Connected
              </span>
            </div>
            <div
              style={{
                fontSize: "14px",
                color: "#9ca3af",
                fontFamily: "monospace",
              }}
            >
              {address?.slice(0, 6)}...{address?.slice(-4)}
            </div>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => connect({ connector: injectedConnector ?? connectors[0] })}
            style={{
              width: "100%",
              padding: "12px",
              background: "linear-gradient(135deg, #a855f7 0%, #9333ea 100%)",
              border: "none",
              borderRadius: "8px",
              color: "#fff",
              fontWeight: 600,
              cursor: "pointer",
              fontSize: "14px",
              transition: "all 0.2s ease",
              boxShadow: "0 4px 15px rgba(168, 85, 247, 0.3)",
            }}
            onMouseEnter={(e) => {
              e.currentTarget.style.transform = "translateY(-1px)";
              e.currentTarget.style.boxShadow =
                "0 6px 20px rgba(168, 85, 247, 0.4)";
            }}
            onMouseLeave={(e) => {
              e.currentTarget.style.transform = "translateY(0)";
              e.currentTarget.style.boxShadow =
                "0 4px 15px rgba(168, 85, 247, 0.3)";
            }}
          >
            Connect Wallet
          </button>
        )}
      </div>
    </aside>
  );
}

export default Sidebar;
