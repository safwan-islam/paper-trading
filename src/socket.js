const { Server } = require("socket.io");
const https = require("https");

let io;
let priceInterval;

const COINS = [
    { id: "bitcoin", symbol: "BTC", name: "Bitcoin" },
    { id: "ethereum", symbol: "ETH", name: "Ethereum" },
    { id: "solana", symbol: "SOL", name: "Solana" },
    { id: "binancecoin", symbol: "BNB", name: "BNB" },
    { id: "cardano", symbol: "ADA", name: "Cardano" },
    { id: "dogecoin", symbol: "DOGE", name: "Dogecoin" },
    { id: "ripple", symbol: "XRP", name: "XRP" },
    { id: "avalanche-2", symbol: "AVAX", name: "Avalanche" },
];

let cachedPrices = [];

const fetchPrices = () => {
    return new Promise((resolve, reject) => {
        const ids = COINS.map((c) => c.id).join(",");
        const url = `/api/v3/simple/price?ids=${ids}&vs_currencies=usd&include_24hr_change=true`;

        const options = {
            hostname: "api.coingecko.com",
            path: url,
            headers: { "User-Agent": "PaperTradingApp/1.0" },
        };

        https
            .get(options, (res) => {
                let data = "";
                res.on("data", (chunk) => (data += chunk));
                res.on("end", () => {
                    try {
                        const json = JSON.parse(data);
                        const prices = COINS.map((coin) => ({
                            id: coin.id,
                            symbol: coin.symbol,
                            name: coin.name,
                            price: json[coin.id]?.usd || 0,
                            change24h: json[coin.id]?.usd_24h_change || 0,
                        }));
                        cachedPrices = prices;
                        resolve(prices);
                    } catch (e) {
                        reject(e);
                    }
                });
            })
            .on("error", reject);
    });
};

const initializeSocket = (server) => {
    io = new Server(server, {
        cors: { origin: "*" },
    });

    io.on("connection", (socket) => {
        console.log("Client connected:", socket.id);

        // Send cached prices immediately on connect
        if (cachedPrices.length > 0) {
            socket.emit("price:update", { prices: cachedPrices });
        }

        // Join personal room for trade notifications
        socket.on("join", (userId) => {
            socket.join(userId);
            console.log(`User ${userId} joined their room`);
        });

        socket.on("disconnect", () => {
            console.log("Client disconnected:", socket.id);
        });
    });

    // Poll CoinGecko every 10 seconds
    const pollPrices = async () => {
        try {
            const prices = await fetchPrices();
            io.emit("price:update", { prices });
        } catch (error) {
            console.log("Failed to fetch prices:", error.message);
        }
    };

    // Initial fetch
    pollPrices();

    // Poll every 10 seconds
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

module.exports = { initializeSocket, emitTradeExecuted, getCachedPrices };
