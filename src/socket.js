const { Server } = require("socket.io");
const https = require("https");

let io;
let priceInterval;

const COINS = [
    { id: "bitcoin",      symbol: "BTC",  name: "Bitcoin",   binance: "BTCUSDT" },
    { id: "ethereum",     symbol: "ETH",  name: "Ethereum",  binance: "ETHUSDT" },
    { id: "solana",       symbol: "SOL",  name: "Solana",    binance: "SOLUSDT" },
    { id: "binancecoin",  symbol: "BNB",  name: "BNB",       binance: "BNBUSDT" },
    { id: "cardano",      symbol: "ADA",  name: "Cardano",   binance: "ADAUSDT" },
    { id: "dogecoin",     symbol: "DOGE", name: "Dogecoin",  binance: "DOGEUSDT" },
    { id: "ripple",       symbol: "XRP",  name: "XRP",       binance: "XRPUSDT" },
    { id: "avalanche-2",  symbol: "AVAX", name: "Avalanche", binance: "AVAXUSDT" },
];

let cachedPrices = [];

const fetchFromBinance = (path) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: "api.binance.com",
            path,
            headers: { "User-Agent": "PaperTradingApp/1.0" },
        };
        https.get(options, (res) => {
            let data = "";
            res.on("data", (chunk) => (data += chunk));
            res.on("end", () => {
                try { resolve(JSON.parse(data)); }
                catch (e) { reject(e); }
            });
        }).on("error", reject);
    });
};

const fetchPrices = async () => {
    const symbols = JSON.stringify(COINS.map(c => c.binance));
    const data = await fetchFromBinance(`/api/v3/ticker/24hr?symbols=${encodeURIComponent(symbols)}`);
    const prices = COINS.map((coin) => {
        const ticker = data.find(t => t.symbol === coin.binance);
        return {
            id: coin.id,
            symbol: coin.symbol,
            name: coin.name,
            price: ticker ? parseFloat(ticker.lastPrice) : 0,
            change24h: ticker ? parseFloat(ticker.priceChangePercent) : 0,
        };
    });
    cachedPrices = prices;
    return prices;
};

const fetchChart = async (binanceSymbol, interval, limit) => {
    const data = await fetchFromBinance(
        `/api/v3/klines?symbol=${binanceSymbol}&interval=${interval}&limit=${limit}`
    );
    return data.map(d => ({
        time: Math.floor(d[0] / 1000),
        open: parseFloat(d[1]),
        high: parseFloat(d[2]),
        low: parseFloat(d[3]),
        close: parseFloat(d[4]),
    }));
};

const getBinanceSymbol = (coinId) => {
    const coin = COINS.find(c => c.id === coinId);
    return coin ? coin.binance : null;
};

const initializeSocket = (server) => {
    io = new Server(server, { cors: { origin: "*" } });

    io.on("connection", (socket) => {
        console.log("Client connected:", socket.id);
        if (cachedPrices.length > 0) {
            socket.emit("price:update", { prices: cachedPrices });
        }
        socket.on("join", (userId) => {
            socket.join(userId);
        });
        socket.on("disconnect", () => {
            console.log("Client disconnected:", socket.id);
        });
    });

    const pollPrices = async () => {
        try {
            const prices = await fetchPrices();
            io.emit("price:update", { prices });
        } catch (error) {
            console.log("Failed to fetch prices:", error.message);
        }
    };

    pollPrices();
    priceInterval = setInterval(pollPrices, 10000);

    return io;
};

const emitTradeExecuted = (userId, trade) => {
    if (!io) return;
    io.to(userId.toString()).emit("trade:executed", {
        message: "Trade executed successfully!",
        data: { trade },
    });
};

const getCachedPrices = () => cachedPrices;

module.exports = { initializeSocket, emitTradeExecuted, getCachedPrices, fetchChart, getBinanceSymbol };