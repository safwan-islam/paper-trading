const mongoose = require("mongoose");
const Portfolio = require("../models/Portfolio");

const getPortfolio = async (req, res) => {
    try {
        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized." });
        }

        const positions = await Portfolio.find({ userId: req.user.id }).sort({ createdAt: -1 });

        return res.status(200).json({
            message: "Portfolio fetched successfully.",
            data: { positions },
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Error while fetching portfolio." });
    }
};

const getPositionById = async (req, res) => {
    try {
        const { id } = req.params;

        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized." });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid position id." });
        }

        const position = await Portfolio.findOne({ _id: id, userId: req.user.id });
        if (!position) {
            return res.status(404).json({ message: "Position not found." });
        }

        return res.status(200).json({
            message: "Position fetched successfully.",
            data: { position },
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Error while fetching position." });
    }
};

const updatePosition = async (req, res) => {
    try {
        const { id } = req.params;
        const { targetPrice } = req.body;

        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized." });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid position id." });
        }

        const position = await Portfolio.findOne({ _id: id, userId: req.user.id });
        if (!position) {
            return res.status(404).json({ message: "Position not found." });
        }

        if (targetPrice !== undefined) {
            if (targetPrice !== null && targetPrice < 0) {
                return res.status(400).json({ message: "Target price must be positive." });
            }
            position.targetPrice = targetPrice;
        }

        await position.save();

        return res.status(200).json({
            message: "Position updated successfully.",
            data: { position },
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Error while updating position." });
    }
};

const deletePosition = async (req, res) => {
    try {
        const { id } = req.params;

        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized." });
        }

        if (!mongoose.Types.ObjectId.isValid(id)) {
            return res.status(400).json({ message: "Invalid position id." });
        }

        const position = await Portfolio.findOne({ _id: id, userId: req.user.id });
        if (!position) {
            return res.status(404).json({ message: "Position not found." });
        }

        await position.deleteOne();

        return res.status(200).json({
            message: "Position removed from portfolio.",
            data: { position },
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Error while deleting position." });
    }
};

module.exports = { getPortfolio, getPositionById, updatePosition, deletePosition };
