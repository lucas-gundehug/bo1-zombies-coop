// The bundled floor plans, one per map slug (made by scripts/map-plan.mjs from the dumps in scripts/map-dumps/).
import { validPlan } from "../plan.js";
import ascension from "./ascension.json" with { type: "json" };
import cotd from "./cotd.json" with { type: "json" };
import five from "./five.json" with { type: "json" };
import kino from "./kino.json" with { type: "json" };
import moon from "./moon.json" with { type: "json" };
import nacht from "./nacht.json" with { type: "json" };
import riese from "./riese.json" with { type: "json" };
import shangrila from "./shangrila.json" with { type: "json" };
import shinonuma from "./shinonuma.json" with { type: "json" };
import verruckt from "./verruckt.json" with { type: "json" };

const PLANS = { ascension, cotd, five, kino, moon, nacht, riese, shangrila, shinonuma, verruckt };

/** The plan for a map, or null when there is none (or it is broken). */
export function planFor(slug) {
  const plan = PLANS[slug];
  return plan && validPlan(plan) ? plan : null;
}
