import { api } from "./http";

export function workload(token) {
  return api("/users/workload", { token });
}
