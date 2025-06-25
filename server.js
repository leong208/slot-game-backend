// Simple Backend for Slot Machine Website
const express = require("express");
const mongoose = require("mongoose");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
require("dotenv\config");

const app = express();
app.use(express.json());

// --- MongoDB Connection ---
mongoose.connect("mongodb://localhost:27017/slotgame", {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// --- User Schema ---
const User = mongoose.model("User", new mongoose.Schema({
  username: String,
  passwordHash: String,
  balance: { type: Number, default: 1000 },
  games: [{ reels: [String], result: String, date: Date }],
}));

// --- Middleware ---
const auth = async (req, res, next) => {
  const token = req.headers["authorization"];
  if (!token) return res.status(401).json({ error: "Unauthorized" });
  try {
    const decoded = jwt.verify(token, "SECRET");
    req.user = await User.findById(decoded.id);
    next();
  } catch {
    res.status(401).json({ error: "Invalid token" });
  }
};

// --- Register User ---
app.post("/api/register", async (req, res) => {
  const { username, password } = req.body;
  const passwordHash = await bcrypt.hash(password, 10);
  const user = new User({ username, passwordHash });
  await user.save();
  res.json({ message: "User registered" });
});

// --- Login User ---
app.post("/api/login", async (req, res) => {
  const { username, password } = req.body;
  const user = await User.findOne({ username });
  if (!user || !(await bcrypt.compare(password, user.passwordHash))) {
    return res.status(400).json({ error: "Invalid credentials" });
  }
  const token = jwt.sign({ id: user._id }, "SECRET");
  res.json({ token });
});

// --- Slot Spin ---
const symbols = ["🍒", "🍋", "🍊", "🍇", "⭐", "💎"];

app.post("/api/spin", auth, async (req, res) => {
  if (req.user.balance < 10) return res.status(400).json({ error: "Low balance" });

  const reels = [
    symbols[Math.floor(Math.random() * symbols.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
    symbols[Math.floor(Math.random() * symbols.length)],
  ];

  const win = reels.every((val) => val === reels[0]);
  const prize = win ? 100 : 0;
  req.user.balance += prize - 10;
  req.user.games.push({ reels, result: win ? "jackpot" : "lose", date: new Date() });
  await req.user.save();

  res.json({ reels, result: win ? "jackpot" : "lose", balance: req.user.balance });
});

app.listen(3000, () => console.log("Server running on http://localhost:3000"));
