export interface User {
  id: string;
  name: string;
  email: string;
  picture: string;
}

export interface AuthTokens {
  access_token: string;
  refresh_token?: string;
  id_token?: string;
  expires_at: number;
}

export interface AuthState {
  user: User | null;
  tokens: AuthTokens | null;
  isAuthenticated: boolean;
}