const express = require("express");
const cors = require("cors");
const authRoutes = require("./routes/authRoutes");
const portfolioRoutes = require("./routes/portfolioRoutes");
const tradeRoutes = require("./routes/tradeRoutes");

const app = express();
app.use(cors());
app.use(express.json());

app.get("/health", (req, res) => res.status(200).json({ status: "ok" }));

app.get("/prices", (req, res) => {
    const { getCachedPrices } = require("./socket");
    return res.status(200).json({ data: { prices: getCachedPrices() } });
});

app.get("/online", (req, res) => {
    const { getOnlineCount } = require("./socket");
    return res.status(200).json({ data: { count: getOnlineCount() } });
});

app.get("/chart/:coinId", async (req, res) => {
    const { fetchChart, getCoinId } = require("./socket");
    const { coinId } = req.params;
    const { days } = req.query;
    if (!getCoinId(coinId)) return res.status(400).json({ message: "Unknown coin." });
    try {
        const candles = await fetchChart(coinId, days || "7");
        return res.status(200).json({ data: { candles } });
    } catch (error) {
        return res.status(500).json({ message: "Failed to fetch chart." });
    }
});

app.use("/auth", authRoutes);
app.use("/portfolio", portfolioRoutes);
app.use("/trades", tradeRoutes);

module.exports = app;
