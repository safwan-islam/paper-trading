# PaperTrade — Frontend

Angular 19 frontend for the PaperTrade paper trading platform.

## Setup

1. Set your backend URL in `src/environments/environment.ts`:
```ts
export const environment = {
  production: false,
  apiUrl: 'https://YOUR-BACKEND.onrender.com'
};
```

2. Install and run:
```bash
npm install
ng serve
```

## Build for Production

```bash
npm run build
```

Output will be in `dist/paper-trading-fe/browser/` — deploy this folder as a Static Site on Render.
