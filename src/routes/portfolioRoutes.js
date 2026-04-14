const express = require("express");
const router = express.Router();
const { getPortfolio, getPositionById, updatePosition, deletePosition } = require("../controllers/portfolioController");
const authMiddleware = require("../middlewares/authMiddleware");

router.use(authMiddleware);

router.get("/", getPortfolio);
router.get("/:id", getPositionById);
router.put("/:id", updatePosition);
router.delete("/:id", deletePosition);

module.exports = router;
