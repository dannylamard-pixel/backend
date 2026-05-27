require("dotenv").config();

const express = require("express");
const cors = require("cors");
const WebSocket = require("ws");

const app = express();

app.use(cors());
app.use(express.json());

const PORT = process.env.PORT || 3000;

let latestSignal = "WAIT";

const BINANCE_WS =
  "wss://fstream.binance.com/ws/btcusdt@aggTrade";

let trades = [];

function calculateSignal() {
  if (trades.length < 20) return "WAIT";

  let buyVolume = 0;
  let sellVolume = 0;

  trades.forEach((trade) => {
    const qty = parseFloat(trade.q);

    if (trade.m) {
      sellVolume += qty;
    } else {
      buyVolume += qty;
    }
  });

  const total = buyVolume + sellVolume;

  const buyPressure = (buyVolume / total) * 100;
  const sellPressure = (sellVolume / total) * 100;

  if (buyPressure >= 62) {
    latestSignal = "LONG";
  } else if (sellPressure >= 62) {
    latestSignal = "SHORT";
  } else {
    latestSignal = "WAIT";
  }

  console.log({
    buyPressure: buyPressure.toFixed(2),
    sellPressure: sellPressure.toFixed(2),
    signal: latestSignal,
  });
}

const ws = new WebSocket(BINANCE_WS);

ws.on("open", () => {
  console.log("Connected to Binance aggTrade stream");
});

ws.on("message", (data) => {
  const trade = JSON.parse(data);

  trades.push(trade);

  if (trades.length > 20) {
    trades.shift();
  }

  calculateSignal();
});

ws.on("error", (err) => {
  console.log("WebSocket Error:", err.message);
});

app.get("/", (req, res) => {
  res.json({
    status: "Backend Running",
    signal: latestSignal,
  });
});

app.get("/signal", (req, res) => {
  res.json({
    signal: latestSignal,
  });
});

app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
