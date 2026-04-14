export interface User {
  id: string;
  name: string;
  email: string;
  balance: number;
}

export interface CoinPrice {
  id: string;
  symbol: string;
  name: string;
  price: number;
  change24h: number;
}

export interface Position {
  _id: string;
  userId: string;
  coinId: string;
  symbol: string;
  name: string;
  quantity: number;
  avgBuyPrice: number;
  targetPrice: number | null;
  createdAt: string;
}

export interface Trade {
  _id: string;
  userId: string;
  coinId: string;
  symbol: string;
  name: string;
  type: 'buy' | 'sell';
  quantity: number;
  price: number;
  total: number;
  note: string;
  createdAt: string;
}
