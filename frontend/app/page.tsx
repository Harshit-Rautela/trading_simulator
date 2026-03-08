"use client";

import { useEffect, useState } from "react";
import { io } from "socket.io-client";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid
} from "recharts";

type Prices = Record<string, number>;

type PortfolioUpdate = {
  symbol: string;
  amount: number;
  avg_price: number;
};

type PortfolioAsset = {
  quantity: number;
  avgPrice: number;
};

type Order = {
  price: number;
  amount: number;
};

type OrderBook = {
  bids: Order[];
  asks: Order[];
};

export default function Home() {
  const [prices, setPrices] = useState<Prices>({});
  const [portfolio, setPortfolio] =
    useState<Record<string, PortfolioAsset>>({});
  const [priceHistory, setPriceHistory] =
    useState<Record<string, number[]>>({});
  const [orderBook, setOrderBook] =
    useState<Record<string, OrderBook>>({});

  useEffect(() => {
    const socket = io("http://localhost:4000");

    socket.on("price_update", (data: Prices) => {
      setPrices(data);

      // chart history
      setPriceHistory((prev) => {
        const updated: Record<string, number[]> = { ...prev };

        Object.entries(data).forEach(([symbol, price]) => {
          updated[symbol] = [
            ...(prev[symbol] || []).slice(-20),
            price
          ];
        });

        return updated;
      });
    });

    socket.on("portfolio_update", (data: PortfolioUpdate) => {
      setPortfolio((prev) => ({
        ...prev,
        [data.symbol]: {
          quantity: (prev[data.symbol]?.quantity || 0) + data.amount,
          avgPrice: data.avg_price
        }
      }));
    });

    socket.on("order_book_update", (data: { symbol: string; bids: Order[]; asks: Order[] }) => {
      setOrderBook((prev) => ({
        ...prev,
        [data.symbol]: {
          bids: data.bids,
          asks: data.asks
        }
      }));
    });

    return () => { socket.disconnect(); }
  }, []);

  function formatChartData(prices: number[] = []) {
    return prices.map((price, index) => ({
      time: index,
      price
    }));
  }

  async function buyAsset(symbol: string) {
    const res = await fetch("http://localhost:5000/order", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        userId: 1,
        symbol,
        type: "BUY",
        amount: 0.1,
      }),
    });

    const data = await res.json();

    if (!res.ok) {
      alert(data.error);
      return;
    }

    alert(`Order sent for ${symbol}`);
  }

  return (
    <main style={styles.container}>
      <h1 style={styles.title}>Crypto Trading Simulator</h1>

      <div style={styles.grid}>
        {Object.entries(prices).map(([symbol, price]) => (
          <div key={symbol} style={styles.cardWrapper}>

            {/* CARD */}
            <div style={styles.card}>
              <h2 style={styles.symbol}>{symbol}</h2>

              <p style={styles.price}>${price.toFixed(2)}</p>

              <LineChart
                width={250}
                height={120}
                data={formatChartData(priceHistory[symbol] || [])}
              >
                <CartesianGrid stroke="#ccc" />
                <XAxis dataKey="time" hide />
                <YAxis hide domain={["auto", "auto"]} />
                <Line
                  type="monotone"
                  dataKey="price"
                  stroke="#22c55e"
                  dot={false}
                  strokeWidth={2}
                  isAnimationActive={false}
                />
              </LineChart>

              <button
                style={styles.button}
                onClick={() => buyAsset(symbol)}
              >
                BUY
              </button>
            </div>

            {/* ORDER BOOK */}
            <div style={styles.orderBook}>
              <h4>Order Book</h4>

              <div style={{ display: "flex", justifyContent: "space-between" }}>

                <div>
                  <b>Bids</b>
                  {orderBook[symbol]?.bids?.map((o, i) => (
                    <p key={`bid-${i}`}>
                      {o.price} ({o.amount})
                    </p>
                  ))}
                </div>

                <div>
                  <b>Asks</b>
                  {orderBook[symbol]?.asks?.map((o, i) => (
                    <p key={`ask-${i}`}>
                      {o.price} ({o.amount})
                    </p>
                  ))}
                </div>

              </div>
            </div>

          </div>
        ))}
      </div>

      {/* PORTFOLIO */}
      <div style={styles.portfolio}>
        <h2>Portfolio</h2>

        {Object.entries(portfolio).length === 0 ? (
          <p>No assets yet</p>
        ) : (
          Object.entries(portfolio).map(([symbol, asset]) => {

            const currentPrice = prices[symbol] || 0;

            const pnl =
              (currentPrice - asset.avgPrice) * asset.quantity;

            return (
              <div key={symbol}>
                <p>{symbol}</p>
                <p>Qty: {asset.quantity.toFixed(4)}</p>
                <p>Avg Price: ${asset.avgPrice.toFixed(2)}</p>
                <p>PnL: ${pnl.toFixed(2)}</p>
              </div>
            );
          })
        )}
      </div>
      <div style={styles.tradeBox}>

        <h3 style={styles.tradeTitle}>Place Order</h3>

        <select style={styles.select}>
          {Object.keys(prices).map((symbol) => (
            <option key={symbol} value={symbol}>
              {symbol}
            </option>
          ))}
        </select>

        <input
          type="number"
          placeholder="Limit price"
          style={styles.input}
        />

        <input
          type="number"
          placeholder="Quantity"
          style={styles.input}
        />

        <div style={styles.tradeButtons}>
          <button style={styles.buyBtn}>BUY</button>
          <button style={styles.sellBtn}>SELL</button>
        </div>

      </div>

    </main>
  );
}

const styles = {
  container: {
    padding: "40px",
    fontFamily: "Arial",
    background: "#0f172a",
    minHeight: "100vh",
    color: "white",
  },

  title: {
    textAlign: "center" as const,
    marginBottom: "40px",
  },

  grid: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fit, minmax(250px, 1fr))",
    gap: "20px",
  },

  cardWrapper: {
    display: "flex",
    flexDirection: "column" as const,
    gap: "10px"
  },

  card: {
    background: "#1e293b",
    padding: "20px",
    borderRadius: "12px",
    textAlign: "center" as const,
  },

  orderBook: {
    background: "#1e293b",
    padding: "10px",
    borderRadius: "8px",
  },

  symbol: {
    marginBottom: "10px",
  },

  price: {
    fontSize: "24px",
    marginBottom: "15px",
    color: "#22c55e",
  },

  button: {
    background: "#2563eb",
    border: "none",
    padding: "10px 20px",
    borderRadius: "8px",
    color: "white",
    cursor: "pointer",
    fontWeight: "bold",
  },

  portfolio: {
    marginTop: "50px",
    background: "#1e293b",
    padding: "20px",
    borderRadius: "12px",
  },
  tradeBox: {
    width: "260px",
    background: "#1e293b",
    padding: "20px",
    borderRadius: "12px",
    display: "flex",
    flexDirection: "column" as const,
    gap: "12px",
    marginTop: "40px"
  },

  tradeTitle: {
    textAlign: "center" as const,
    marginBottom: "10px"
  },

  select: {
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #334155",
    background: "#0f172a",
    color: "white",
    fontSize: "14px"
  },

  input: {
    padding: "10px",
    borderRadius: "6px",
    border: "1px solid #334155",
    background: "#0f172a",
    color: "white",
    fontSize: "14px"
  },

  tradeButtons: {
    display: "flex",
    gap: "10px",
    marginTop: "5px"
  },

  buyBtn: {
    flex: 1,
    background: "#16a34a",
    border: "none",
    padding: "10px",
    borderRadius: "6px",
    fontWeight: "bold",
    color: "white",
    cursor: "pointer"
  },

  sellBtn: {
    flex: 1,
    background: "#dc2626",
    border: "none",
    padding: "10px",
    borderRadius: "6px",
    fontWeight: "bold",
    color: "white",
    cursor: "pointer"
  }
};