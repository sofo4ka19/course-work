import { Request } from "express";

export interface AuthPayload {
  userId: number;
  email: string;
}

export interface AuthUser {
  id: number;
  email: string;
  createdAt: Date;
}

export interface AuthResponse {
  token: string;
  user: AuthUser;
}

export interface AuthRequest extends Request {
  user?: AuthPayload;
}

export interface HabitFormData {
  name: string;
  description: string;
  frequency: "daily" | "weekly" | "custom";
  streakThreshold: number;
}
