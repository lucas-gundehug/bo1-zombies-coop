// The bundled floor plans, one per map slug (made by scripts/map-plan.mjs).
import { validPlan } from "../plan.js";

const PLANS = {};

/** The plan for a map, or null when there is none (or it is broken). */
export function planFor(slug) {
  const plan = PLANS[slug];
  return plan && validPlan(plan) ? plan : null;
}
