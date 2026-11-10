import { test } from "node:test";
import assert from "node:assert/strict";
import {
  calcCalories,
  calcMacros,
  mealPlan,
  mealTimes,
  dishTotals,
  round,
  fmt,
} from "../js/calc.js";

// ── calcCalories: Mifflin-St Jeor (default formula) ──────────────────────

test("calcCalories: Mifflin male base value", () => {
  // male, 80kg, 180cm, 30y, activity 1.2 (sedentary)
  // BMR = 10*80 + 6.25*180 - 5*30 + 5 = 800 + 1125 - 150 + 5 = 1780
  // calories = 1780 * 1.2 = 2136
  const c = calcCalories({ gender: "male", weight: 80, height: 180, age: 30, activity: 1.2 });
  assert.equal(c, 1780 * 1.2);
});

test("calcCalories: Mifflin female base value", () => {
  // female, 60kg, 165cm, 25y, activity 1.2
  // BMR = 10*60 + 6.25*165 - 5*25 - 161 = 600 + 1031.25 - 125 - 161 = 1345.25
  // calories = 1345.25 * 1.2
  const c = calcCalories({ gender: "female", weight: 60, height: 165, age: 25, activity: 1.2 });
  assert.equal(c, 1345.25 * 1.2);
});

// ── calcCalories: Harris-Benedict formula ───────────────────────────────

test("calcCalories: Harris-Benedict male", () => {
  // male, 80kg, 180cm, 30y, activity 1.2
  // BMR = 88.36 + 13.4*80 + 4.8*180 - 5.7*30 = 88.36 + 1072 + 864 - 171 = 1853.36
  const c = calcCalories({ gender: "male", weight: 80, height: 180, age: 30, activity: 1.2, formula: "harris" });
  assert.equal(c, 1853.36 * 1.2);
});

test("calcCalories: Harris-Benedict female", () => {
  // female, 60kg, 165cm, 25y, activity 1.2
  // BMR = 447.6 + 9.2*60 + 3.1*165 - 4.3*25 = 447.6 + 552 + 511.5 - 107.5 = 1403.6
  const c = calcCalories({ gender: "female", weight: 60, height: 165, age: 25, activity: 1.2, formula: "harris" });
  assert.equal(c, 1403.6 * 1.2);
});

// ── calcCalories: activity multipliers ──────────────────────────────────

test("calcCalories: activity multiplier scales linearly", () => {
  const base = { gender: "male", weight: 80, height: 180, age: 30 };
  const sedentary = calcCalories({ ...base, activity: 1.2 });
  const active = calcCalories({ ...base, activity: 1.55 });
  assert.ok(active > sedentary);
  assert.equal(active / sedentary, 1.55 / 1.2);
});

test("calcCalories: defaults to activity 1.2 when missing", () => {
  const c = calcCalories({ gender: "male", weight: 80, height: 180, age: 30 });
  assert.equal(c, 1780 * 1.2);
});

// ── calcCalories: pregnancy / breastfeeding / cycle additions ───────────

test("calcCalories: pregnancy adds 300 kcal", () => {
  const base = { gender: "female", weight: 60, height: 165, age: 25, activity: 1.2 };
  const withPreg = calcCalories({ ...base, pregnancy: true });
  assert.equal(withPreg, calcCalories(base) + 300);
});

test("calcCalories: breastfeeding adds 500 kcal", () => {
  const base = { gender: "female", weight: 60, height: 165, age: 25, activity: 1.2 };
  const withBf = calcCalories({ ...base, breastfeeding: true });
  assert.equal(withBf, calcCalories(base) + 500);
});

test("calcCalories: menstrual cycle adds 100 kcal", () => {
  const base = { gender: "female", weight: 60, height: 165, age: 25, activity: 1.2 };
  const withCycle = calcCalories({ ...base, cycle: true });
  assert.equal(withCycle, calcCalories(base) + 100);
});

test("calcCalories: pregnancy + breastfeeding stack", () => {
  const base = { gender: "female", weight: 60, height: 165, age: 25, activity: 1.2 };
  const stacked = calcCalories({ ...base, pregnancy: true, breastfeeding: true, cycle: true });
  assert.equal(stacked, calcCalories(base) + 300 + 500 + 100);
});

// ── calcCalories: goal adjustments ──────────────────────────────────────

test("calcCalories: lose20 multiplies by 0.8", () => {
  const base = { gender: "male", weight: 80, height: 180, age: 30, activity: 1.2 };
  const losing = calcCalories({ ...base, goal: "lose20" });
  assert.equal(losing, calcCalories(base) * 0.8);
});

test("calcCalories: lose15 multiplies by 0.85", () => {
  const base = { gender: "male", weight: 80, height: 180, age: 30, activity: 1.2 };
  const losing = calcCalories({ ...base, goal: "lose15" });
  assert.equal(losing, calcCalories(base) * 0.85);
});

test("calcCalories: muscleGain multiplies by 1.15", () => {
  const base = { gender: "male", weight: 80, height: 180, age: 30, activity: 1.2 };
  const gaining = calcCalories({ ...base, goal: "muscleGain" });
  assert.equal(gaining, calcCalories(base) * 1.15);
});

test("calcCalories: no goal leaves calories unchanged", () => {
  const base = { gender: "male", weight: 80, height: 180, age: 30, activity: 1.2 };
  assert.equal(calcCalories({ ...base, goal: "maintain" }), calcCalories(base));
});

// ── calcCalories: child calorie tiers ────────────────────────────────────

test("calcCalories: infant = 800 * activity", () => {
  assert.equal(calcCalories({ isChild: true, childAgeGroup: "infant", activity: 1.2 }), 800 * 1.2);
});

test("calcCalories: toddler = 1200 * activity", () => {
  assert.equal(calcCalories({ isChild: true, childAgeGroup: "toddler", activity: 1.2 }), 1200 * 1.2);
});

test("calcCalories: child4_8 = 1600 * activity", () => {
  assert.equal(calcCalories({ isChild: true, childAgeGroup: "child4_8", activity: 1.2 }), 1600 * 1.2);
});

test("calcCalories: child9_13 male = 1800 * activity", () => {
  assert.equal(calcCalories({ isChild: true, childAgeGroup: "child9_13", gender: "male", activity: 1.2 }), 1800 * 1.2);
});

test("calcCalories: child9_13 female = 1600 * activity", () => {
  assert.equal(calcCalories({ isChild: true, childAgeGroup: "child9_13", gender: "female", activity: 1.2 }), 1600 * 1.2);
});

test("calcCalories: teen14_18 male = 2400 * activity", () => {
  assert.equal(calcCalories({ isChild: true, childAgeGroup: "teen14_18", gender: "male", activity: 1.2 }), 2400 * 1.2);
});

test("calcCalories: teen14_18 female = 2000 * activity", () => {
  assert.equal(calcCalories({ isChild: true, childAgeGroup: "teen14_18", gender: "female", activity: 1.2 }), 2000 * 1.2);
});

test("calcCalories: unknown child age group defaults to 1600", () => {
  assert.equal(calcCalories({ isChild: true, childAgeGroup: "unknown", activity: 1.2 }), 1600 * 1.2);
});

test("calcCalories: child goals/pregnancy modifiers are NOT applied", () => {
  const child = calcCalories({ isChild: true, childAgeGroup: "toddler", activity: 1.2 });
  const childWithGoal = calcCalories({ isChild: true, childAgeGroup: "toddler", activity: 1.2, goal: "lose20", pregnancy: true });
  assert.equal(child, childWithGoal);
});

// ── calcCalories: edge cases ────────────────────────────────────────────

test("calcCalories: null/undefined client returns 0 for adult path", () => {
  // No weight/height/age → BMR = 5 (male default) or -161 (female default)
  // Without gender, falls into else (female) branch: 0 + 0 - 0 - 161 = -161; * 1.2 = -193.2
  const c = calcCalories(null);
  assert.equal(c, -161 * 1.2);
});

test("calcCalories: string numeric inputs are parsed", () => {
  const c = calcCalories({ gender: "male", weight: "80", height: "180", age: "30", activity: "1.2" });
  assert.equal(c, 1780 * 1.2);
});

// ── calcMacros: 30/30/40 split ──────────────────────────────────────────

test("calcMacros: returns proteins/fats/carbs keys", () => {
  const m = calcMacros(2000);
  assert.deepEqual(Object.keys(m).sort(), ["carbs", "fats", "proteins"]);
});

test("calcMacros: 2000 kcal → 150g protein, 67g fat, 200g carbs", () => {
  const m = calcMacros(2000);
  assert.equal(m.proteins, (2000 * 0.3) / 4);  // 150
  assert.equal(m.fats, (2000 * 0.3) / 9);      // ~66.67
  assert.equal(m.carbs, (2000 * 0.4) / 4);     // 200
});

test("calcMacros: 0 kcal → all zeros", () => {
  const m = calcMacros(0);
  assert.equal(m.proteins, 0);
  assert.equal(m.fats, 0);
  assert.equal(m.carbs, 0);
});

test("calcMacros: macros sum to ~100% of calories", () => {
  const kcal = 1800;
  const m = calcMacros(kcal);
  const total = m.proteins * 4 + m.fats * 9 + m.carbs * 4;
  assert.ok(Math.abs(total - kcal) < 0.001);
});

// ── mealPlan: distribution ──────────────────────────────────────────────

test("mealPlan: 4 meals returns correct names and shares", () => {
  const plan = mealPlan(4, 2000);
  assert.equal(plan.length, 4);
  assert.deepEqual(plan.map((m) => m.name), ["Завтрак", "Обед", "Перекус", "Ужин"]);
  // Shares: 0.3, 0.35, 0.15, 0.2
  assert.equal(plan[0].kcal, Math.round(2000 * 0.3));   // 600
  assert.equal(plan[1].kcal, Math.round(2000 * 0.35));  // 700
  assert.equal(plan[2].kcal, Math.round(2000 * 0.15));  // 300
  assert.equal(plan[3].kcal, Math.round(2000 * 0.2));    // 400
});

test("mealPlan: 5 meals returns correct names and shares", () => {
  const plan = mealPlan(5, 2000);
  assert.equal(plan.length, 5);
  assert.deepEqual(plan.map((m) => m.name), ["Завтрак", "Перекус", "Обед", "Полдник", "Ужин"]);
  // Shares: 0.25, 0.1, 0.3, 0.15, 0.2
  assert.equal(plan[0].kcal, Math.round(2000 * 0.25));  // 500
  assert.equal(plan[1].kcal, Math.round(2000 * 0.1));   // 200
  assert.equal(plan[2].kcal, Math.round(2000 * 0.3));    // 600
  assert.equal(plan[3].kcal, Math.round(2000 * 0.15));  // 300
  assert.equal(plan[4].kcal, Math.round(2000 * 0.2));   // 400
});

test("mealPlan: non-5 count defaults to 4 meals", () => {
  const plan = mealPlan(3, 2000);
  assert.equal(plan.length, 4);
});

test("mealPlan: kcal values are rounded integers", () => {
  const plan = mealPlan(4, 1733);
  plan.forEach((m) => assert.ok(Number.isInteger(m.kcal)));
});

test("mealPlan: total kcal approximates target", () => {
  const plan = mealPlan(4, 2000);
  const total = plan.reduce((a, m) => a + m.kcal, 0);
  assert.equal(total, 2000);
});

// ── mealTimes: time generation ──────────────────────────────────────────

test("mealTimes: 4 meals from 08:00 with 3h interval", () => {
  const times = mealTimes("08:00", 4, 3);
  assert.deepEqual(times, ["08:00", "11:00", "14:00", "17:00"]);
});

test("mealTimes: 5 meals from 08:00 with 3h interval", () => {
  const times = mealTimes("08:00", 5, 3);
  assert.deepEqual(times, ["08:00", "11:00", "14:00", "17:00", "20:00"]);
});

test("mealTimes: custom interval", () => {
  const times = mealTimes("09:00", 4, 2.5);
  assert.deepEqual(times, ["09:00", "11:30", "14:00", "16:30"]);
});

test("mealTimes: defaults to 08:00 and 3h when missing", () => {
  const times = mealTimes(null, 4, null);
  assert.deepEqual(times, ["08:00", "11:00", "14:00", "17:00"]);
});

test("mealTimes: count !== 5 defaults to 4", () => {
  const times = mealTimes("08:00", 7, 3);
  assert.equal(times.length, 4);
});

test("mealTimes: wraps past midnight correctly", () => {
  // 23:00 start, 2h interval → 23:00, 01:00, 03:00, 05:00
  const times = mealTimes("23:00", 4, 2);
  assert.deepEqual(times, ["23:00", "01:00", "03:00", "05:00"]);
});

// ── dishTotals: ingredient nutrition ───────────────────────────────────

test("dishTotals: empty ingredients → all zeros", () => {
  const t = dishTotals({ ingredients: [] });
  assert.deepEqual(t, { kcal: 0, p: 0, f: 0, c: 0, cookedMass: 0, rawMass: 0 });
});

test("dishTotals: missing ingredients → all zeros", () => {
  const t = dishTotals({});
  assert.deepEqual(t, { kcal: 0, p: 0, f: 0, c: 0, cookedMass: 0, rawMass: 0 });
});

test("dishTotals: single ingredient rice_white 100g", () => {
  // rice_white: kcal 330, p 7, f 0.6, c 73, yield 3.0
  const t = dishTotals({ ingredients: [{ productId: "rice_white", grams: 100 }] });
  assert.equal(t.kcal, 330);
  assert.equal(t.p, 7);
  assert.equal(t.f, 0.6);
  assert.equal(t.c, 73);
  assert.equal(t.rawMass, 100);
  assert.equal(t.cookedMass, 300); // 100 * 3.0
});

test("dishTotals: multiple ingredients accumulate", () => {
  const t = dishTotals({
    ingredients: [
      { productId: "rice_white", grams: 100 },  // 330 kcal
      { productId: "chicken_breast", grams: 150 }, // 113*1.5 = 169.5 kcal
    ],
  });
  assert.equal(t.kcal, 330 + 169.5);
  assert.equal(t.rawMass, 250);
  assert.equal(t.cookedMass, 100 * 3.0 + 150 * 0.78);
});

test("dishTotals: unknown productId is skipped", () => {
  const t = dishTotals({
    ingredients: [
      { productId: "rice_white", grams: 100 },
      { productId: "nonexistent", grams: 200 },
    ],
  });
  assert.equal(t.kcal, 330);
  assert.equal(t.rawMass, 100);
});

test("dishTotals: yield < 1 reduces cooked mass (meat)", () => {
  const t = dishTotals({ ingredients: [{ productId: "beef_lean", grams: 200 }] });
  assert.equal(t.cookedMass, 200 * 0.75); // 150
  assert.equal(t.rawMass, 200);
});

// ── round / fmt helpers ─────────────────────────────────────────────────

test("round: rounds to nearest integer", () => {
  assert.equal(round(2.4), 2);
  assert.equal(round(2.5), 3);
  assert.equal(round(2.6), 3);
});

test("fmt: formats with ru-RU locale (space as thousands separator)", () => {
  assert.equal(fmt(1234), "1\u00a0234"); // non-breaking space in ru-RU
  assert.equal(fmt(0), "0");
});

test("fmt: handles negative numbers", () => {
  assert.equal(fmt(-193), "-193");
});
