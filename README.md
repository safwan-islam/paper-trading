# PaperTrade — Full Stack Paper Trading Platform

Backend Node.js + Express + MongoDB + Socket.io  
Frontend Angular 19

## Structure

```
paper-trading/
├── src/              ← Backend Node.js
├── frontend/
│   └── paper-trading-fe/  ← Angular frontend
├── package.json
├── Dockerfile
└── .env.example
```

## Environment Variables (.env)

```
PORT=5000
MONGODB_URI=mongodb+srv://...
JWT_SECRET=your_secret_here
```

## Run Backend Locally

```bash
npm install
npm start
```

## Run Frontend Locally

```bash
cd frontend/paper-trading-fe
npm install
ng serve
```

## WebSocket Events

- `price:update` — Live crypto prices broadcast every 10s (CoinGecko)
- `trade:executed` — Sent to user room after each trade

## Deploy on Render

**Backend → Web Service**
- Build: `npm install`
- Start: `node src/server.js`

**Frontend → Static Site**
- Root Directory: `frontend/paper-trading-fe`
- Build: `npm run build`
- Publish: `dist/paper-trading-fe/browser`
