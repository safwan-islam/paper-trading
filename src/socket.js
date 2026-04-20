const { Server } = require("socket.io");
const https = require("https");

let io;
let priceInterval;
let previousPrices = {};
let onlineUsers = 0;

const COINS = [
    { id: "bitcoin",     symbol: "BTC",  name: "Bitcoin",   kraken: "XXBTZUSD" },
    { id: "ethereum",    symbol: "ETH",  name: "Ethereum",  kraken: "XETHZUSD" },
    { id: "solana",      symbol: "SOL",  name: "Solana",    kraken: "SOLUSD"   },
    { id: "binancecoin", symbol: "BNB",  name: "BNB",       kraken: "BNBUSD"   },
    { id: "cardano",     symbol: "ADA",  name: "Cardano",   kraken: "ADAUSD"   },
    { id: "dogecoin",    symbol: "DOGE", name: "Dogecoin",  kraken: "XDGUSD"   },
    { id: "ripple",      symbol: "XRP",  name: "XRP",       kraken: "XXRPZUSD" },
    { id: "avalanche-2", symbol: "AVAX", name: "Avalanche", kraken: "AVAXUSD"  },
];

let cachedPrices = [];

const fetchFromKraken = (path) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: "api.kraken.com",
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
    const pairs = COINS.map(c => c.kraken).join(",");
    const data = await fetchFromKraken(`/0/public/Ticker?pair=${pairs}`);
    if (data.error && data.error.length > 0) throw new Error(data.error[0]);
    const prices = COINS.map((coin) => {
        const result = data.result;
        const key = Object.keys(result || {}).find(k => k.includes(coin.kraken) || k.includes(coin.symbol));
        const ticker = key ? result[key] : null;
        return {
            id: coin.id, symbol: coin.symbol, name: coin.name,
            price: ticker ? parseFloat(ticker.c[0]) : 0,
            change24h: ticker ? ((parseFloat(ticker.c[0]) - parseFloat(ticker.o)) / parseFloat(ticker.o)) * 100 : 0,
        };
    });
    cachedPrices = prices;
    return prices;
};

const fetchChart = async (coinId, days) => {
    const coin = COINS.find(c => c.id === coinId);
    if (!coin) throw new Error("Unknown coin");
    let interval = 1440;
    if (days === "1") interval = 60;
    if (days === "7") interval = 240;
    const data = await fetchFromKraken(`/0/public/OHLC?pair=${coin.kraken}&interval=${interval}`);
    if (data.error && data.error.length > 0) throw new Error(data.error[0]);
    const result = data.result;
    const key = Object.keys(result).find(k => k !== "last");
    const ohlc = result[key] || [];
    return ohlc.slice(-90).map(d => ({
        time: d[0], open: parseFloat(d[1]), high: parseFloat(d[2]),
        low: parseFloat(d[3]), close: parseFloat(d[4]),
    }));
};

const getCoinId = (coinId) => COINS.find(c => c.id === coinId) ? coinId : null;

const checkPriceAlerts = (newPrices) => {
    if (!io || Object.keys(previousPrices).length === 0) return;
    newPrices.forEach((coin) => {
        const prev = previousPrices[coin.id];
        if (!prev || prev === 0 || coin.price === 0) return;
        const changePct = ((coin.price - prev) / prev) * 100;
        if (Math.abs(changePct) >= 3) {
            const dir = changePct > 0 ? "🚀" : "📉";
            io.emit("price:alert", {
                coinId: coin.id, symbol: coin.symbol,
                message: `${dir} ${coin.symbol} ${changePct > 0 ? '+' : ''}${changePct.toFixed(2)}% — $${coin.price.toLocaleString()}`,
            });
        }
    });
    newPrices.forEach(c => { previousPrices[c.id] = c.price; });
};

const initializeSocket = (server) => {
    io = new Server(server, { cors: { origin: "*" } });

    io.on("connection", (socket) => {
        onlineUsers++;
        io.emit("online:count", { count: onlineUsers });

        if (cachedPrices.length > 0) {
            socket.emit("price:update", { prices: cachedPrices });
        }

        socket.on("join", (userId) => { socket.join(userId); });

        socket.on("disconnect", () => {
            onlineUsers = Math.max(0, onlineUsers - 1);
            io.emit("online:count", { count: onlineUsers });
        });
    });

    const pollPrices = async () => {
        try {
            const prices = await fetchPrices();
            io.emit("price:update", { prices });
            checkPriceAlerts(prices);
            if (Object.keys(previousPrices).length === 0) {
                prices.forEach(c => { previousPrices[c.id] = c.price; });
            }
        } catch (error) {
            console.log("Failed to fetch prices:", error.message);
        }
    };

    pollPrices();
    priceInterval = setInterval(pollPrices, 15000);

    // Simulate micro price movements every second between real updates
    setInterval(() => {
        if (!io || cachedPrices.length === 0) return;
        const simulated = cachedPrices.map(coin => ({
            ...coin,
            price: parseFloat((coin.price * (1 + (Math.random() - 0.5) * 0.001)).toFixed(8)),
        }));
        cachedPrices = simulated;
        io.emit("price:update", { prices: simulated });
    }, 1000);

    return io;
};

const emitTradeExecuted = (userId, trade) => {
    if (!io) return;
    io.to(userId.toString()).emit("trade:executed", {
        message: `✓ ${trade.type.toUpperCase()} ${trade.quantity.toFixed(4)} ${trade.symbol} @ $${trade.price.toLocaleString()}`,
        data: { trade },
    });
};

const emitPortfolioUpdated = (userId, balance, positions) => {
    if (!io) return;
    io.to(userId.toString()).emit("portfolio:updated", {
        message: "Portfolio updated.",
        data: { balance, positions },
    });
};

const emitFundsAdded = (userId, amount, newBalance) => {
    if (!io) return;
    io.to(userId.toString()).emit("funds:added", {
        message: `💰 $${amount.toLocaleString()} added to your account`,
        data: { amount, newBalance },
    });
};

const emitTradeBroadcast = (trade) => {
    if (!io) return;
    const emoji = trade.type === "buy" ? "🟢" : "🔴";
    io.emit("trade:broadcast", {
        message: `${emoji} Someone just ${trade.type === "buy" ? "bought" : "sold"} ${trade.symbol}`,
        data: { symbol: trade.symbol, type: trade.type },
    });
};

const getCachedPrices = () => cachedPrices;
const getOnlineCount = () => onlineUsers;

module.exports = {
    initializeSocket, emitTradeExecuted, emitPortfolioUpdated,
    emitFundsAdded, emitTradeBroadcast, getCachedPrices, fetchChart, getCoinId, getOnlineCount
};