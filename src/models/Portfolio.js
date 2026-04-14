const mongoose = require("mongoose");

const portfolioSchema = new mongoose.Schema(
    {
        userId: {
            type: mongoose.Schema.Types.ObjectId,
            ref: "User",
            required: true,
        },
        coinId: {
            type: String,
            required: true,
        },
        symbol: {
            type: String,
            required: true,
        },
        name: {
            type: String,
            required: true,
        },
        quantity: {
            type: Number,
            required: true,
            min: 0,
        },
        avgBuyPrice: {
            type: Number,
            required: true,
            min: 0,
        },
        targetPrice: {
            type: Number,
            default: null,
        },
    },
    { timestamps: true }
);

// Ensure one position per coin per user
portfolioSchema.index({ userId: 1, coinId: 1 }, { unique: true });

module.exports = mongoose.model("Portfolio", portfolioSchema);
