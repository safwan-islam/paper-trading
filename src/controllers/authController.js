const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const User = require("../models/User");
const { emitFundsAdded } = require("../socket");

const register = async (req, res) => {
    try {
        const { name, email, password } = req.body;
        if (!name || !email || !password) {
            return res.status(400).json({ message: "Name, email and password are required." });
        }
        if (password.length < 6) {
            return res.status(400).json({ message: "Password must be at least 6 characters." });
        }
        const existingUser = await User.findOne({ email });
        if (existingUser) {
            return res.status(409).json({ message: "Email already in use." });
        }
        const hashedPassword = await bcrypt.hash(password, 10);
        const user = await User.create({ name, email, password: hashedPassword });
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
        return res.status(201).json({
            message: "Account created successfully.",
            data: {
                token,
                user: { id: user._id, name: user.name, email: user.email, balance: user.balance },
            },
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Error while creating account." });
    }
};

const login = async (req, res) => {
    try {
        const { email, password } = req.body;
        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required." });
        }
        const user = await User.findOne({ email });
        if (!user) {
            return res.status(401).json({ message: "Invalid credentials." });
        }
        const isPasswordValid = await bcrypt.compare(password, user.password);
        if (!isPasswordValid) {
            return res.status(401).json({ message: "Invalid credentials." });
        }
        const token = jwt.sign({ id: user._id }, process.env.JWT_SECRET, { expiresIn: "7d" });
        return res.status(200).json({
            message: "Login successful.",
            data: {
                token,
                user: { id: user._id, name: user.name, email: user.email, balance: user.balance },
            },
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Error while logging in." });
    }
};

const getMe = async (req, res) => {
    try {
        const user = await User.findById(req.user.id).select("-password");
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }
        return res.status(200).json({
            message: "User fetched successfully.",
            data: {
                user: { id: user._id, name: user.name, email: user.email, balance: user.balance },
            },
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Error while fetching user." });
    }
};

const addFunds = async (req, res) => {
    try {
        const { amount } = req.body;

        if (!req.user || !req.user.id) {
            return res.status(401).json({ message: "Unauthorized." });
        }

        if (!amount || amount <= 0 || amount > 100000) {
            return res.status(400).json({ message: "Amount must be between $1 and $100,000." });
        }

        const user = await User.findById(req.user.id);
        if (!user) {
            return res.status(404).json({ message: "User not found." });
        }

        user.balance = parseFloat((user.balance + amount).toFixed(2));
        await user.save();

        // WebSocket 5: funds:added
        emitFundsAdded(req.user.id, amount, user.balance);

        return res.status(200).json({
            message: `$${amount.toLocaleString()} added successfully.`,
            data: {
                user: { id: user._id, name: user.name, email: user.email, balance: user.balance },
            },
        });
    } catch (error) {
        console.log(error);
        return res.status(500).json({ message: "Error while adding funds." });
    }
};

module.exports = { register, login, getMe, addFunds };
