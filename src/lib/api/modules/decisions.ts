import { api } from "../client";
import type { Decision, DecisionCreate } from "../types";

export function createDecision(body: DecisionCreate): Promise<Decision> {
  return api.post<Decision>("/decisions", body);
}
