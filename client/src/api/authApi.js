import { api } from "./http";

export function login(email, password) {
  return api("/auth/login", { method: "POST", body: { email, password } });
}

export function register(payload) {
  return api("/auth/register", { method: "POST", body: payload });
}

export function me(token) {
  return api("/auth/me", { token });
}
