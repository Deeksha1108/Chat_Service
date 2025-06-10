import { Request } from 'express';

declare module 'express' {
  export interface AuthRequest extends Request {
    user?: {
      id: string;
      email?: string;
      [key: string]: any;
    };
  }
}
