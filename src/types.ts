export interface Product {
  id: string;          // Unique identifier
  code: string;        // 6-digit product code (e.g., "111111")
  name: string;        // Product name (e.g., "中证指数专户1号")
  status: 'online' | 'offline'; // Status: Online (下线 / 上线)
  isPinned: boolean;   // Whether it is manually pinned/locked to the top section
  sortOrder: number;   // Visual sorting ranking (1-based index)
  category: string;    // Product category/style (e.g., "固收+", "混合型", "量化对冲", "权益类")
  manager: string;     // Fund manager
  netValue: number;    // Asset net value (e.g. 1.0543)
  growthRate: number;  // Growth rate (e.g. +2.4%)
  createdAt: string;   // Timestamp
}

export type FilterStatus = 'all' | 'online' | 'offline' | 'pinned';

export interface DashboardStats {
  total: number;
  online: number;
  offline: number;
  pinned: number;
}
