const express = require("express");
const cors = require("cors");

const authRoutes = require("./routes/authRoutes");
const portfolioRoutes = require("./routes/portfolioRoutes");
const tradeRoutes = require("./routes/tradeRoutes");

const app = express();

app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => {
    res.status(200).json({ status: "ok" });
});

app.get("/prices", (req, res) => {
    const { getCachedPrices } = require("./socket");
    const prices = getCachedPrices();
    return res.status(200).json({ data: { prices } });
});

app.get("/chart/:coinId", async (req, res) => {
    const { fetchChart, getBinanceSymbol } = require("./socket");
    const { coinId } = req.params;
    const { days } = req.query;
    const binanceSymbol = getBinanceSymbol(coinId);
    if (!binanceSymbol) {
        return res.status(400).json({ message: "Unknown coin." });
    }
    let interval = "1d";
    let limit = 30;
    if (days === "1")  { interval = "1h";  limit = 24; }
    if (days === "7")  { interval = "4h";  limit = 42; }
    if (days === "30") { interval = "1d";  limit = 30; }
    if (days === "90") { interval = "1d";  limit = 90; }
    try {
        const candles = await fetchChart(binanceSymbol, interval, limit);
        return res.status(200).json({ data: { candles } });
    } catch (error) {
        console.log("Chart fetch error:", error.message);
        return res.status(500).json({ message: "Failed to fetch chart data." });
    }
});

app.use("/auth", authRoutes);
app.use("/portfolio", portfolioRoutes);
app.use("/trades", tradeRoutes);

module.exports = app;