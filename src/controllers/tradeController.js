const mongoose = require("mongoose");
const Trade = require("../models/Trade");
const Portfolio = require("../models/Portfolio");
const User = require("../models/User");
const { emitTradeExecuted, emitPortfolioUpdated, emitTradeBroadcast } = require("../socket");

const executeTrade = async (req, res) => {
    try {
        const { coinId, symbol, name, type, quantity, price } = req.body;
        if (!req.user?.id) return res.status(401).json({ message: "Unauthorized." });
        if (!coinId || !symbol || !name || !type || !quantity || !price)
            return res.status(400).json({ message: "All fields are required." });
        if (!["buy", "sell"].includes(type)) return res.status(400).json({ message: "Type must be buy or sell." });
        if (quantity <= 0 || price <= 0) return res.status(400).json({ message: "Quantity and price must be > 0." });

        const total = parseFloat((quantity * price).toFixed(2));
        const user = await User.findById(req.user.id);
        if (!user) return res.status(404).json({ message: "User not found." });

        if (type === "buy") {
            if (user.balance < total) return res.status(400).json({ message: `Insufficient balance. Need $${total.toFixed(2)}, have $${user.balance.toFixed(2)}.` });
            user.balance = parseFloat((user.balance - total).toFixed(2));
            await user.save();
            const existing = await Portfolio.findOne({ userId: req.user.id, coinId });
            if (existing) {
                const totalQty = existing.quantity + quantity;
                existing.avgBuyPrice = parseFloat(((existing.quantity * existing.avgBuyPrice + total) / totalQty).toFixed(8));
                existing.quantity = parseFloat(totalQty.toFixed(8));
                await existing.save();
            } else {
                await Portfolio.create({ userId: req.user.id, coinId, symbol, name, quantity: parseFloat(quantity.toFixed(8)), avgBuyPrice: price });
            }
        } else {
            const position = await Portfolio.findOne({ userId: req.user.id, coinId });
            if (!position || position.quantity < quantity) return res.status(400).json({ message: `Insufficient holdings.` });
            position.quantity = parseFloat((position.quantity - quantity).toFixed(8));
            if (position.quantity <= 0.000001) await position.deleteOne();
            else await position.save();
            user.balance = parseFloat((user.balance + total).toFixed(2));
            await user.save();
        }

        const trade = await Trade.create({ userId: req.user.id, coinId, symbol, name, type, quantity: parseFloat(quantity.toFixed(8)), price, total });

        // WebSocket 2: private trade confirmation
        emitTradeExecuted(req.user.id, trade);
        // WebSocket 4: portfolio updated
        const positions = await Portfolio.find({ userId: req.user.id });
        emitPortfolioUpdated(req.user.id, user.balance, positions);
        // WebSocket 7: public trade feed
        emitTradeBroadcast(trade);

        return res.status(201).json({ message: `${type === "buy" ? "Bought" : "Sold"} ${quantity} ${symbol}.`, data: { trade, newBalance: user.balance } });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Error executing trade." });
    }
};

const getTrades = async (req, res) => {
    try {
        if (!req.user?.id) return res.status(401).json({ message: "Unauthorized." });
        const trades = await Trade.find({ userId: req.user.id }).sort({ createdAt: -1 });
        return res.status(200).json({ message: "Trades fetched.", data: { trades } });
    } catch (error) { return res.status(500).json({ message: "Error fetching trades." }); }
};

const getTradeById = async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.user?.id) return res.status(401).json({ message: "Unauthorized." });
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid trade id." });
        const trade = await Trade.findOne({ _id: id, userId: req.user.id });
        if (!trade) return res.status(404).json({ message: "Trade not found." });
        return res.status(200).json({ message: "Trade fetched.", data: { trade } });
    } catch (error) { return res.status(500).json({ message: "Error fetching trade." }); }
};

const updateTrade = async (req, res) => {
    try {
        const { id } = req.params;
        const { note } = req.body;
        if (!req.user?.id) return res.status(401).json({ message: "Unauthorized." });
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid trade id." });
        const trade = await Trade.findOne({ _id: id, userId: req.user.id });
        if (!trade) return res.status(404).json({ message: "Trade not found." });
        if (note !== undefined) trade.note = note;
        await trade.save();
        return res.status(200).json({ message: "Trade updated.", data: { trade } });
    } catch (error) { return res.status(500).json({ message: "Error updating trade." }); }
};

const deleteTrade = async (req, res) => {
    try {
        const { id } = req.params;
        if (!req.user?.id) return res.status(401).json({ message: "Unauthorized." });
        if (!mongoose.Types.ObjectId.isValid(id)) return res.status(400).json({ message: "Invalid trade id." });
        const trade = await Trade.findOne({ _id: id, userId: req.user.id });
        if (!trade) return res.status(404).json({ message: "Trade not found." });
        await trade.deleteOne();
        return res.status(200).json({ message: "Trade deleted.", data: { trade } });
    } catch (error) { return res.status(500).json({ message: "Error deleting trade." }); }
};

module.exports = { executeTrade, getTrades, getTradeById, updateTrade, deleteTrade };
