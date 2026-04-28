import apiClient from "./apiClient";
import type { AuthResponse, LoginRequest, RegisterRequest } from "@/types";

export const authApi = {
  register: (data: RegisterRequest) =>
    apiClient.post<{ data: AuthResponse }>("/auth/register", data),

  login: (data: LoginRequest) =>
    apiClient.post<{ data: AuthResponse }>("/auth/login", data),
};
