const { Server } = require("socket.io");
const https = require("https");

let io;
let priceInterval;

const COINS = [
    { id: "bitcoin",     symbol: "BTC",  name: "Bitcoin"   },
    { id: "ethereum",    symbol: "ETH",  name: "Ethereum"  },
    { id: "solana",      symbol: "SOL",  name: "Solana"    },
    { id: "binancecoin", symbol: "BNB",  name: "BNB"       },
    { id: "cardano",     symbol: "ADA",  name: "Cardano"   },
    { id: "dogecoin",    symbol: "DOGE", name: "Dogecoin"  },
    { id: "ripple",      symbol: "XRP",  name: "XRP"       },
    { id: "avalanche-2", symbol: "AVAX", name: "Avalanche" },
];

let cachedPrices = [];

const fetchFromCoinGecko = (path) => {
    return new Promise((resolve, reject) => {
        const options = {
            hostname: "api.coingecko.com",
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
    const ids = COINS.map(c => c.id).join(",");
    const data = await fetchFromCoinGecko(
        `/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`
    );
    const prices = COINS.map((coin) => ({
        id: coin.id,
        symbol: coin.symbol,
        name: coin.name,
        price: data[coin.id]?.usd || 0,
        change24h: data[coin.id]?.usd_24h_change || 0,
    }));
    cachedPrices = prices;
    return prices;
};

const fetchChart = async (coinId, days) => {
    const data = await fetchFromCoinGecko(
        `/api/v3/coins/${coinId}/market_chart?vs_currency=usd&days=${days}`
    );
    const prices = data.prices || [];
    // Group into OHLC-like candles
    const candles = prices.map(([time, value]) => ({
        time: Math.floor(time / 1000),
        open: value,
        high: value,
        low: value,
        close: value,
    }));
    return candles;
};

const getCoinId = (coinId) => {
    return COINS.find(c => c.id === coinId) ? coinId : null;
};

const initializeSocket = (server) => {
    io = new Server(server, { cors: { origin: "*" } });

    io.on("connection", (socket) => {
        console.log("Client connected:", socket.id);
        if (cachedPrices.length > 0) {
            socket.emit("price:update", { prices: cachedPrices });
        }
        socket.on("join", (userId) => { socket.join(userId); });
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
    priceInterval = setInterval(pollPrices, 30000);
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

module.exports = { initializeSocket, emitTradeExecuted, getCachedPrices, fetchChart, getCoinId };