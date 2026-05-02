# 📈 PaperTrade

A full-stack paper trading platform for cryptocurrencies. Trade Bitcoin, Ethereum, Solana and more with $10,000 in virtual cash *no real money involved*

**Live Demo:** https://paper-trading-fe.onrender.com  
**Backend API:** https://paper-trading-be.onrender.com/health

---

## Tech Stack

**Backend**
- Node.js + Express
- MongoDB + Mongoose
- JWT Authentication + Bcrypt
- Socket.io (WebSockets)

**Frontend**
- Angular 19 (Standalone Components)
- lightweight-charts (TradingView)
- Socket.io Client

**Infrastructure**
- Render (Backend as Web Service)
- Render (Frontend as Static Site)
- MongoDB Atlas

---

## Project Structure

```
paper-trading/
├── src/                        ← Backend
│   ├── server.js
│   ├── app.js
│   ├── socket.js               ← WebSocket events
│   ├── config/
│   │   └── db.js
│   ├── models/
│   │   ├── User.js
│   │   ├── Trade.js
│   │   └── Portfolio.js
│   ├── controllers/
│   │   ├── authController.js
│   │   ├── tradeController.js
│   │   └── portfolioController.js
│   ├── routes/
│   │   ├── authRoutes.js
│   │   ├── tradeRoutes.js
│   │   └── portfolioRoutes.js
│   └── middlewares/
│       └── authMiddleware.js
├── frontend/
│   └── paper-trading-fe/       ← Angular Frontend
├── package.json
├── Dockerfile
└── .env.example
```

---

## Features

- **Authentication** — Register, Login with JWT + Bcrypt password hashing
- **Market** — Live crypto prices updated every second via WebSocket
- **Candlestick Charts** — TradingView-style charts with 1D / 7D / 1M / 3M timeframes
- **Trading** — Buy and Sell with 25% / 50% / 75% / Max quick amounts
- **Dashboard** — Portfolio overview with Unrealized P&L, Realized P&L, sparklines
- **Close Position** — Sell at market price with confirmation modal
- **Trade History** — Full CRUD (view, edit note, delete)
- **Wallet** — Add virtual funds ($1K to $50K presets or custom amount)
- **Real-Time** — 7 WebSocket events for live updates

---

## WebSocket Events

| # | Event | Type | Description |
|---|-------|------|-------------|
| 1 | `price:update` | Public | Live crypto prices every second |
| 2 | `trade:executed` | Private | Trade confirmation toast |
| 3 | `price:alert` | Public | Alert when price moves significantly |
| 4 | `portfolio:updated` | Private | Auto-refresh portfolio after trade |
| 5 | `funds:added` | Private | Notification when funds are added |
| 6 | `online:count` | Public | Number of connected users |
| 7 | `trade:broadcast` | Public | Public feed when someone trades |

---

## Data Models

**User** — signup, login, get me, add funds  
**Trade** — full CRUD (create, read, update note, delete)  
**Portfolio** — full CRUD (read, update, delete positions)

---

## API Endpoints

### Auth
```
POST   /auth/register     Create account
POST   /auth/login        Login
GET    /auth/me           Get current user
POST   /auth/add-funds    Add virtual funds
```

### Trades (auth required)
```
POST   /trades            Execute buy/sell trade
GET    /trades            Get trade history
GET    /trades/:id        Get single trade
PUT    /trades/:id        Update trade note
DELETE /trades/:id        Delete trade
```

### Portfolio (auth required)
```
GET    /portfolio         Get all positions
GET    /portfolio/:id     Get single position
PUT    /portfolio/:id     Update position
DELETE /portfolio/:id     Remove position
```

### Prices & Charts
```
GET    /prices            Get cached live prices
GET    /chart/:coinId     Get OHLC chart data
GET    /health            Health check
```

---

## Environment Variables

Create a `.env` file based on `.env.example`:

```
PORT=5000
MONGODB_URI=mongodb+srv://<user>:<password>@cluster.mongodb.net/paper-trading
JWT_SECRET=your_secret_key_here
```

---

## Run Locally

**Backend**
```bash
npm install
npm start
```

**Frontend**
```bash
cd frontend/paper-trading-fe
npm install
ng serve
```

Then update `frontend/paper-trading-fe/src/environments/environment.ts`:
```ts
export const environment = {
  production: false,
  apiUrl: 'http://localhost:5000'
};
```

---

## Deploy on Render

**Backend → Web Service**
| Field | Value |
|-------|-------|
| Build Command | `npm install` |
| Start Command | `node src/server.js` |
| Env Vars | `MONGODB_URI`, `JWT_SECRET` |

**Frontend → Static Site**
| Field | Value |
|-------|-------|
| Root Directory | `frontend/paper-trading-fe` |
| Build Command | `npm run build` |
| Publish Directory | `dist/paper-trading-fe/browser` |

---

## Supported Cryptocurrencies

BTC · ETH · SOL · BNB · ADA · DOGE · XRP · AVAX

Prices sourced from **Kraken API** (free, no rate limits).
