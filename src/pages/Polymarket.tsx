import { useMemo, useRef, useState } from "react";
import { useAccount, useWaitForTransactionReceipt, useWriteContract } from "wagmi";
import { parseEther } from "viem";
import { BET_ESCROW_ADDRESS, useApproveArmyTokensForBets, useArmyAllowanceForBets } from "../hooks/useContract";

const betEscrowAbi = [
  {
    type: "function",
    name: "placeBet",
    stateMutability: "nonpayable",
    inputs: [
      {
        name: "bet",
        type: "tuple",
        components: [
          { name: "player", type: "address" },
          { name: "market", type: "string" },
          { name: "outcome", type: "uint8" },
          { name: "amount", type: "uint256" },
          { name: "nonce", type: "uint256" },
          { name: "deadline", type: "uint256" },
        ],
      },
      { name: "signature", type: "bytes" },
    ],
    outputs: [],
  },
] as const;

const LOCAL_BETS_KEY = "shelly.bets";

const panelBorder = "1px solid rgba(255, 255, 255, 0.08)";
const panelShadow = "0 10px 30px rgba(0, 0, 0, 0.35)";

function Polymarket() {
  const [marketUrl, setMarketUrl] = useState("");
  const [market, setMarket] = useState<PolymarketMarket | null>(null);
  const [isLoadingMarket, setIsLoadingMarket] = useState(false);
  const [marketError, setMarketError] = useState<string | null>(null);
  const [selectedOutcomeIndex, setSelectedOutcomeIndex] = useState<number | null>(null);
  const [amount, setAmount] = useState("");
  const [betError, setBetError] = useState<string | null>(null);
  const [betStatus, setBetStatus] = useState<string | null>(null);
  const requestIdRef = useRef(0);
  const betSignerUrl = (import.meta.env.VITE_BET_SIGNER_URL || "http://localhost:3002").replace(
    /\/$/,
    "",
  );

  const { address } = useAccount();
  const { allowanceRaw } = useArmyAllowanceForBets(address);
  const { approveMax, isPending: isApprovePending } = useApproveArmyTokensForBets();
  const { writeContract, data: betHash, isPending: isBetPending } = useWriteContract();
  const { isLoading: isBetConfirming, isSuccess: isBetSuccess } =
    useWaitForTransactionReceipt({ hash: betHash });
  const isBettingConfigured = !/^0x0{40}$/.test(BET_ESCROW_ADDRESS);

  const selectedOutcome = useMemo(() => {
    if (!market || selectedOutcomeIndex === null) return null;
    return market.outcomes[selectedOutcomeIndex] ?? null;
  }, [market, selectedOutcomeIndex]);

  const parseUrl = (value: string) => {
    try {
      const url = new URL(value.trim());
      const parts = url.pathname.split("/").filter(Boolean);
      const eventIndex = parts.indexOf("event");
      if (eventIndex >= 0 && parts.length >= eventIndex + 3) {
        return { event: parts[eventIndex + 1], market: parts[eventIndex + 2] };
      }
      if (eventIndex >= 0 && parts.length >= eventIndex + 2) {
        return { event: parts[eventIndex + 1] };
      }
      const marketIndex = parts.indexOf("market");
      if (marketIndex >= 0 && parts.length >= marketIndex + 2) {
        return { market: parts[marketIndex + 1] };
      }
      if (parts.length >= 2) {
        return { event: parts[parts.length - 2], market: parts[parts.length - 1] };
      }
      return null;
    } catch {
      return null;
    }
  };

  const pickBestMarket = (markets: PolymarketApiMarket[]) => {
    if (markets.length === 0) return null;
    return [...markets].sort((a, b) => {
      const aVolume = normalizeVolume(a.volume_usd ?? a.volume);
      const bVolume = normalizeVolume(b.volume_usd ?? b.volume);
      return bVolume - aVolume;
    })[0];
  };

  const normalizeEventSlug = (value: string) => value.replace(/-\d+$/, "");
  const eventSlugMatches = (candidate: string | undefined, target: string) => {
    if (!candidate) return false;
    const normalizedCandidate = normalizeEventSlug(candidate.toLowerCase());
    const normalizedTarget = normalizeEventSlug(target.toLowerCase());
    return normalizedCandidate === normalizedTarget;
  };

  const filterEventMarkets = (markets: PolymarketApiMarket[], eventSlug: string) => {
    const matches = markets.filter((market) =>
      eventSlugMatches(market.event_slug ?? market.event?.slug, eventSlug),
    );
    return matches.length > 0 ? matches : markets;
  };

  const fetchMarketFromEvent = async (eventSlug: string) => {
    const byEventSlugResponse = await fetch(
      `/api/polymarket/markets?event_slug=${encodeURIComponent(eventSlug)}&limit=200&offset=0`,
    );
    if (byEventSlugResponse.ok) {
      const marketsData = await byEventSlugResponse.json();
      const marketsArray = Array.isArray(marketsData) ? marketsData : [];
      const filtered = filterEventMarkets(marketsArray, eventSlug);
      if (filtered.length > 0) {
        const best = pickBestMarket(filtered);
        if (best) return best;
      }
    }

    const eventResponse = await fetch(
      `/api/polymarket/events?slug=${encodeURIComponent(eventSlug)}`,
    );
    if (!eventResponse.ok) {
      throw new Error(`Event request failed (${eventResponse.status})`);
    }
    const eventData = await eventResponse.json();
    const event = Array.isArray(eventData)
      ? eventData.find((item) => eventSlugMatches(item?.slug, eventSlug)) ??
        eventData.find((item) => eventSlugMatches(item?.slug, normalizeEventSlug(eventSlug))) ??
        eventData[0]
      : eventData;
    if (!event?.id) {
      throw new Error("Event not found.");
    }
    const marketsResponse = await fetch(
      `/api/polymarket/markets?event_id=${encodeURIComponent(event.id)}&limit=200&offset=0`,
    );
    if (!marketsResponse.ok) {
      throw new Error(`Markets request failed (${marketsResponse.status})`);
    }
    const marketsData = await marketsResponse.json();
    const marketsArray = Array.isArray(marketsData) ? marketsData : [];
    const filtered = filterEventMarkets(marketsArray, eventSlug);
    const best = pickBestMarket(filtered);
    if (!best) {
      throw new Error("No markets found for this event.");
    }
    return best;
  };

  const handleMarketLookup = async () => {
    const requestId = ++requestIdRef.current;
    setMarketError(null);
    setMarket(null);
    setSelectedOutcomeIndex(null);
    setBetError(null);
    setBetStatus(null);
    const parsed = marketUrl ? parseUrl(marketUrl) : null;
    if (!parsed?.market && !parsed?.event) {
      setMarketError("Paste a valid Polymarket market URL.");
      return;
    }

    setIsLoadingMarket(true);
    try {
      if (parsed.market) {
        const query = new URLSearchParams({ slug: parsed.market });
        if (parsed.event) {
          query.set("event_slug", parsed.event);
        }
        const response = await fetch(`/api/polymarket/markets?${query.toString()}`);
        if (!response.ok) {
          throw new Error(`Request failed (${response.status})`);
        }
        const data = await response.json();
        if (requestId !== requestIdRef.current) return;
        const marketData = Array.isArray(data) ? data[0] : data;
        if (!marketData && parsed.event) {
          const eventMarket = await fetchMarketFromEvent(parsed.event);
          if (requestId !== requestIdRef.current) return;
          setMarket(mapApiMarket(eventMarket));
          return;
        }
        if (!marketData) {
          throw new Error("Market not found.");
        }
        setMarket(mapApiMarket(marketData));
      } else if (parsed.event) {
        const eventMarket = await fetchMarketFromEvent(parsed.event);
        if (requestId !== requestIdRef.current) return;
        setMarket(mapApiMarket(eventMarket));
      }
    } catch (err) {
      setMarketError(err instanceof Error ? err.message : "Failed to fetch market.");
    } finally {
      setIsLoadingMarket(false);
    }
  };

  const handlePlaceBet = async () => {
    setBetError(null);
    setBetStatus(null);

    if (!address) {
      setBetError("Connect your wallet to place a bet.");
      return;
    }
    if (!market) {
      setBetError("Load a market first.");
      return;
    }
    if (!isBettingConfigured) {
      setBetError("Betting contract not configured for this network.");
      return;
    }
    if (selectedOutcomeIndex === null || !selectedOutcome) {
      setBetError("Select an outcome.");
      return;
    }
    if (!amount || Number(amount) <= 0) {
      setBetError("Enter a valid amount.");
      return;
    }

    let amountWei: bigint;
    try {
      amountWei = parseEther(amount);
    } catch (error) {
      setBetError("Invalid amount format.");
      return;
    }

    if (allowanceRaw < amountWei) {
      setBetError("Approve ArmyToken for betting first.");
      return;
    }

    setBetStatus("Requesting signature...");
    try {
      const response = await fetch(`${betSignerUrl}/sign-bet`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          player: address,
          market: market.marketUrl,
          outcome: selectedOutcomeIndex,
          amount: amountWei.toString(),
        }),
      });

      if (!response.ok) {
        const payload = await response.json().catch(() => ({}));
        throw new Error(payload.error || `Signer error (${response.status})`);
      }

      const payload = await response.json();
      if (!payload?.signature || !payload?.bet) {
        throw new Error("Invalid signer response.");
      }

      const bet = {
        player: payload.bet.player as `0x${string}`,
        market: payload.bet.market as string,
        outcome: Number(payload.bet.outcome),
        amount: BigInt(payload.bet.amount),
        nonce: BigInt(payload.bet.nonce),
        deadline: BigInt(payload.bet.deadline),
      };

      setBetStatus("Submitting transaction...");
      const betId = saveLocalBet({
        marketUrl: market.marketUrl,
        marketTitle: market.title,
        outcomeIndex: selectedOutcomeIndex,
        outcomeLabel: selectedOutcome.label,
        entryPriceCents: selectedOutcome.priceCents,
        amount,
        createdAt: Date.now(),
        status: "open",
      });

      writeContract({
        address: BET_ESCROW_ADDRESS,
        abi: betEscrowAbi,
        functionName: "placeBet",
        args: [bet, payload.signature],
      });
      setBetStatus(`Bet submitted (id: ${betId.slice(0, 6)}...)`);
    } catch (error) {
      setBetError(error instanceof Error ? error.message : "Bet failed.");
      setBetStatus(null);
    }
  };

  return (
    <div
      style={{
        padding: "36px 40px 60px",
        color: "#e6e6f0",
        fontFamily: '"Cinzel", serif',
      }}
    >
      <div style={{ display: "flex", alignItems: "center", gap: "14px" }}>
        <h1 style={{ margin: 0, fontSize: "28px", letterSpacing: "0.5px" }}>
          Polymarket
        </h1>
        <div style={{ fontSize: "13px", color: "#94a3b8" }}>Market preview</div>
      </div>

      <div
        style={{
          marginTop: "18px",
          padding: "18px 22px",
          borderRadius: "16px",
          border: panelBorder,
          background: "rgba(11, 18, 36, 0.9)",
          boxShadow: panelShadow,
          display: "grid",
          gap: "12px",
        }}
      >
        <div style={{ fontSize: "14px", fontWeight: 700 }}>Market link</div>
        <input
          type="text"
          value={marketUrl}
          onChange={(e) => setMarketUrl(e.target.value)}
          placeholder="https://polymarket.com/event/<event-slug>/<market-slug>"
          style={inputStyle}
        />
        <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
          <button
            type="button"
            onClick={handleMarketLookup}
            disabled={isLoadingMarket}
            style={{
              padding: "10px 18px",
              borderRadius: "10px",
              border: "none",
              background: "linear-gradient(135deg, #7a2ff2, #a856ff)",
              color: "#fff",
              cursor: "pointer",
              fontFamily: '"Cinzel", serif',
              fontWeight: 600,
              opacity: isLoadingMarket ? 0.7 : 1,
            }}
          >
            {isLoadingMarket ? "Loading..." : "Load Market"}
          </button>
          {marketError && (
            <div style={{ color: "#fca5a5", fontSize: "14px" }}>{marketError}</div>
          )}
        </div>
      </div>

      {market && (
        <div
          style={{
            marginTop: "22px",
            display: "grid",
            gridTemplateColumns: "minmax(0, 1fr) 320px",
            gap: "18px",
            alignItems: "start",
          }}
        >
          <div
            style={{
              padding: "20px 22px",
              borderRadius: "16px",
              border: panelBorder,
              background: "rgba(11, 18, 36, 0.92)",
              boxShadow: panelShadow,
            }}
          >
            <div style={{ fontSize: "12px", color: "#94a3b8", marginBottom: "6px" }}>
              {market.category} • {market.eventSlug ?? "Event"}
            </div>
            <div style={{ fontSize: "22px", fontWeight: 700 }}>{market.title}</div>
            <div style={{ fontSize: "13px", color: "#94a3b8", marginTop: "6px" }}>
              Volume: {market.volume.toLocaleString("en-US")} {market.volumeUnit} • {market.timeLeft}
            </div>
            <div style={{ marginTop: "16px", display: "grid", gap: "10px" }}>
              {market.outcomes.length > 0 ? (
                market.outcomes.map((outcome) => (
                  <div
                    key={`${outcome.index}-${outcome.label}`}
                    onClick={() => setSelectedOutcomeIndex(outcome.index)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr auto",
                      gap: "12px",
                      padding: "12px 14px",
                      borderRadius: "12px",
                      border:
                        selectedOutcomeIndex === outcome.index
                          ? "1px solid rgba(168, 85, 247, 0.6)"
                          : "1px solid rgba(255,255,255,0.08)",
                      background:
                        selectedOutcomeIndex === outcome.index
                          ? "rgba(76, 29, 149, 0.25)"
                          : "rgba(10, 18, 40, 0.7)",
                      cursor: "pointer",
                    }}
                  >
                    <div>
                      <div style={{ fontSize: "14px", fontWeight: 600 }}>{outcome.label}</div>
                      <div style={{ fontSize: "12px", color: "#94a3b8", marginTop: "4px" }}>
                        Buy {outcome.priceCents}¢
                      </div>
                    </div>
                    <div style={{ textAlign: "right" }}>
                      <div style={{ fontSize: "16px", fontWeight: 700 }}>
                        {outcome.percent.toFixed(1)}%
                      </div>
                      <div style={{ fontSize: "11px", color: "#94a3b8" }}>
                        Implied probability
                      </div>
                    </div>
                  </div>
                ))
              ) : (
                <div style={{ color: "#94a3b8" }}>No outcomes available.</div>
              )}
            </div>
            <a
              href={market.marketUrl}
              target="_blank"
              rel="noreferrer"
              style={{
                color: "#a855f7",
                textDecoration: "none",
                fontSize: "12px",
                marginTop: "14px",
                display: "inline-block",
              }}
            >
              Open on Polymarket ↗
            </a>
          </div>

          <div
            style={{
              padding: "18px",
              borderRadius: "16px",
              border: panelBorder,
              background: "rgba(11, 18, 36, 0.92)",
              boxShadow: panelShadow,
              display: "grid",
              gap: "12px",
            }}
          >
            <div style={{ fontSize: "16px", fontWeight: 700 }}>Place a bet</div>
            <div style={{ fontSize: "12px", color: "#94a3b8" }}>Selected outcome</div>
            <div style={{ fontSize: "14px", fontWeight: 600 }}>
              {selectedOutcome ? selectedOutcome.label : "Select an outcome"}
            </div>
            <div style={{ fontSize: "12px", color: "#94a3b8" }}>Amount (ARMY)</div>
            <input
              type="number"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              placeholder="0"
              style={inputStyle}
            />
            <div style={{ display: "flex", gap: "8px" }}>
              {["+1", "+10", "+100"].map((value) => (
                <button
                  key={value}
                  type="button"
                  onClick={() => setAmount(value.replace("+", ""))}
                  style={{
                    padding: "6px 10px",
                    borderRadius: "8px",
                    border: "1px solid rgba(255,255,255,0.12)",
                    background: "rgba(255,255,255,0.06)",
                    color: "#cbd5f5",
                    cursor: "pointer",
                  }}
                >
                  {value} ARMY
                </button>
              ))}
            </div>
            {!isBettingConfigured && (
              <div style={{ color: "#fca5a5", fontSize: "12px" }}>
                Betting contract not configured for this network.
              </div>
            )}
            {amount && allowanceRaw < parseSafeEther(amount) && isBettingConfigured && (
              <button
                type="button"
                onClick={() => approveMax()}
                disabled={isApprovePending}
                style={{
                  padding: "8px 10px",
                  borderRadius: "8px",
                  border: "1px solid rgba(255,255,255,0.16)",
                  background: "rgba(255,255,255,0.08)",
                  color: "#e2e8f0",
                  cursor: "pointer",
                }}
              >
                {isApprovePending ? "Approving..." : "Approve ArmyToken"}
              </button>
            )}
            <button
              type="button"
              onClick={handlePlaceBet}
              disabled={isBetPending || !isBettingConfigured}
              style={{
                padding: "10px 12px",
                borderRadius: "10px",
                border: "none",
                background: "linear-gradient(135deg, #22c55e, #16a34a)",
                color: "#fff",
                fontWeight: 700,
                cursor: "pointer",
                opacity: isBetPending ? 0.7 : 1,
              }}
            >
              {isBetPending ? "Submitting..." : "Place Bet"}
            </button>
            {betError && <div style={{ color: "#fca5a5", fontSize: "12px" }}>{betError}</div>}
            {betStatus && <div style={{ color: "#cbd5f5", fontSize: "12px" }}>{betStatus}</div>}
            {isBetConfirming && (
              <div style={{ color: "#cbd5f5", fontSize: "12px" }}>
                Waiting for confirmation...
              </div>
            )}
            {isBetSuccess && (
              <div style={{ color: "#22c55e", fontSize: "12px" }}>
                Bet placed successfully.
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

type PolymarketApiMarket = {
  id?: string | number;
  question?: string;
  slug?: string;
  event_slug?: string;
  category?: string;
  end_date?: string;
  endDate?: string;
  event?: { slug?: string; category?: string; category_slug?: string };
  events?: Array<{ slug?: string; category?: string; category_slug?: string }>;
  outcomes?: string[];
  outcomePrices?: Array<string | number> | Record<string, string | number>;
  outcome_prices?: Array<string | number> | Record<string, string | number>;
  volume?: number | string;
  volume_usd?: number | string;
  tags?: Array<{ name?: string; slug?: string }>;
};

type PolymarketMarket = {
  category: string;
  title: string;
  timeLeft: string;
  volume: number;
  volumeUnit: string;
  marketUrl: string;
  eventSlug?: string;
  marketSlug: string;
  outcomes: MarketOutcome[];
};

type MarketOutcome = {
  label: string;
  index: number;
  probability: number;
  percent: number;
  priceCents: number;
};

type LocalBet = {
  id: string;
  marketUrl: string;
  marketTitle: string;
  outcomeIndex: number;
  outcomeLabel: string;
  entryPriceCents: number;
  amount: string;
  createdAt: number;
  status: "open" | "closed";
  closedAt?: number;
  closedPriceCents?: number;
};

const categoryMap: Record<string, string> = {
  crypto: "Crypto",
  politics: "Politics",
  sports: "Sports",
  entertainment: "Entertainment",
  finance: "Finance",
  technology: "Tech",
  tech: "Tech",
  world: "World",
  science: "Science",
};

function mapApiMarket(market: PolymarketApiMarket): PolymarketMarket {
  const eventFromList = market.events?.[0];
  const rawCategory =
    (
      market.category ??
      market.event?.category ??
      market.event?.category_slug ??
      eventFromList?.category ??
      eventFromList?.category_slug ??
      ""
    ).toLowerCase();
  const tagCategory = market.tags?.find((tag) =>
    ["politics", "sports", "crypto", "entertainment", "technology", "science", "world", "finance"].includes(
      (tag.slug ?? tag.name ?? "").toLowerCase(),
    ),
  );
  const tagSlug = (tagCategory?.slug ?? tagCategory?.name ?? "").toLowerCase();
  const resolvedCategory = rawCategory || tagSlug;
  const category = categoryMap[resolvedCategory] ?? "Other";

  const question = market.question ?? "Untitled Market";
  const outcomes = parseOutcomeList(market.outcomes);
  const rawOutcomePrices = market.outcomePrices ?? market.outcome_prices ?? [];
  const outcomePrices = parseOutcomePrices(rawOutcomePrices, outcomes);
  const mappedOutcomes = outcomes.map((label, index) => {
    const rawPrice = outcomePrices[index];
    const probability = normalizeProbability(rawPrice);
    const safeProbability = probability ?? 0;
    return {
      label: label || `Outcome ${index + 1}`,
      index,
      probability: safeProbability,
      percent: Math.max(0, Math.min(100, safeProbability * 100)),
      priceCents: Math.max(0, Math.round(safeProbability * 100)),
    };
  });

  const volumeRaw = market.volume_usd ?? market.volume ?? 0;
  const volume = normalizeVolume(volumeRaw);
  const volumeUnit = market.volume_usd !== undefined ? "USD" : "volume";
  const eventSlug = market.event_slug ?? market.event?.slug ?? eventFromList?.slug;
  const marketSlug = market.slug ?? String(market.id ?? "market");
  const marketUrl = eventSlug
    ? `https://polymarket.com/event/${eventSlug}/${marketSlug}`
    : `https://polymarket.com/market/${marketSlug}`;

  return {
    category,
    title: question,
    timeLeft: formatTimeLeft(market.end_date ?? market.endDate),
    volume: Number.isFinite(volume) ? Math.round(volume) : 0,
    volumeUnit,
    marketUrl,
    eventSlug,
    marketSlug,
    outcomes: mappedOutcomes,
  };
}

function parseOutcomeList(outcomes?: string[] | string) {
  if (Array.isArray(outcomes)) return outcomes;
  if (typeof outcomes !== "string") return [];
  const trimmed = outcomes.trim();
  if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
    try {
      const parsed = JSON.parse(trimmed);
      return Array.isArray(parsed) ? parsed : [];
    } catch {
      return [];
    }
  }
  return trimmed.split(",").map((value) => value.trim());
}

function parseOutcomePrices(
  rawOutcomePrices: Array<string | number> | Record<string, string | number> | string,
  outcomes: string[],
) {
  if (Array.isArray(rawOutcomePrices)) return rawOutcomePrices;
  if (typeof rawOutcomePrices === "string") {
    const trimmed = rawOutcomePrices.trim();
    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
      try {
        const parsed = JSON.parse(trimmed);
        return Array.isArray(parsed) ? parsed : [];
      } catch {
        return [];
      }
    }
    return trimmed.split(",").map((value) => value.trim());
  }
  if (typeof rawOutcomePrices === "object" && rawOutcomePrices !== null) {
    return outcomes.map(
      (outcome) => rawOutcomePrices[outcome] ?? rawOutcomePrices[outcome.toLowerCase()],
    );
  }
  return [];
}

function normalizeProbability(value: string | number | undefined) {
  if (value === undefined || value === null) return null;
  const raw = typeof value === "string" ? Number.parseFloat(value) : Number(value);
  if (!Number.isFinite(raw)) return null;
  if (raw > 1.01 && raw <= 100) return raw / 100;
  if (raw < 0) return 0;
  return raw;
}

function normalizeVolume(value: string | number | undefined) {
  if (value === undefined || value === null) return 0;
  const raw = typeof value === "string" ? Number.parseFloat(value) : Number(value);
  return Number.isFinite(raw) ? raw : 0;
}

function parseSafeEther(value: string) {
  try {
    return parseEther(value);
  } catch {
    return 0n;
  }
}

function loadLocalBets(): LocalBet[] {
  if (typeof window === "undefined") return [];
  try {
    const raw = window.localStorage.getItem(LOCAL_BETS_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    return Array.isArray(parsed) ? (parsed as LocalBet[]) : [];
  } catch {
    return [];
  }
}

function saveLocalBet(bet: Omit<LocalBet, "id">) {
  const current = loadLocalBets();
  const id = crypto.randomUUID();
  const next = [{ ...bet, id }, ...current].slice(0, 50);
  window.localStorage.setItem(LOCAL_BETS_KEY, JSON.stringify(next));
  return id;
}

function formatTimeLeft(endDate?: string) {
  if (!endDate) return "—";
  const end = new Date(endDate).getTime();
  if (Number.isNaN(end)) return "—";
  const diff = end - Date.now();
  if (diff <= 0) return "Ended";
  const days = Math.ceil(diff / (1000 * 60 * 60 * 24));
  return `${days}d left`;
}

const inputStyle: React.CSSProperties = {
  width: "100%",
  padding: "12px 14px",
  borderRadius: "10px",
  border: "1px solid rgba(255, 255, 255, 0.12)",
  background: "rgba(255, 255, 255, 0.04)",
  color: "#e2e8f0",
  fontFamily: '"Cinzel", serif',
  fontSize: "13px",
};

export default Polymarket;
