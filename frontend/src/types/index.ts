export interface User {
  id: number;
  email: string | null;
  phone: string | null;
  username: string;
  avatar_url: string | null;
  is_premium: boolean;
  daily_limit: number;
  created_at: string;
}

export interface TokenResponse {
  access_token: string;
  token_type: string;
}

export interface UsageInfo {
  used_today: number;
  daily_limit: number;
  remaining: number;
}

export interface GenerationResult {
  id: number;
  original_text: string;
  titles: string | null;
  opening: string | null;
  deai_result: string | null;
  emoji_result: string | null;
  zhongcao_result: string | null;
  created_at: string;
}

export interface HistoryList {
  items: GenerationResult[];
  total: number;
}

export interface SSEData {
  titles?: string;
  opening?: string;
  deai?: string;
  emoji?: string;
  zhongcao?: string;
  status?: string;
  done?: boolean;
  generation_id?: number;
}
