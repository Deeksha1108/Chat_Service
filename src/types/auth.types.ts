export interface ValidateTokenResponse {
  userId: string;
  email: string;
  role: string;
  issuedAt: number;
  expiresAt: number;
}
