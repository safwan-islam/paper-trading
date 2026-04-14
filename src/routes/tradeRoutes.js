const express = require("express");
const router = express.Router();
const { executeTrade, getTrades, getTradeById, updateTrade, deleteTrade } = require("../controllers/tradeController");
const authMiddleware = require("../middlewares/authMiddleware");

router.use(authMiddleware);

router.post("/", executeTrade);
router.get("/", getTrades);
router.get("/:id", getTradeById);
router.put("/:id", updateTrade);
router.delete("/:id", deleteTrade);

module.exports = router;
