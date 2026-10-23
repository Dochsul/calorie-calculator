// Zero-dependency tests for calcBmr and calcChildCalories.
// Run: node tests/calc.test.js
var assert = require("assert");
var calc = require("../calc.js");

var passed = 0;
var failed = 0;

function test(name, fn) {
    try {
        fn();
        passed++;
        console.log("  ok - " + name);
    } catch (e) {
        failed++;
        console.log("FAIL - " + name + ": " + e.message);
    }
}

function closeTo(actual, expected) {
    assert.ok(
        Math.abs(actual - expected) < 1e-6,
        "expected " + expected + ", got " + actual
    );
}

// --- calcBmr: Миффлина-Сан Жеора ---
test("mifflin: male 70kg/175cm/30y = 1648.75", function () {
    closeTo(calc.calcBmr(70, 175, 30, "male", "mifflin"), 1648.75);
});

test("mifflin: female 70kg/175cm/30y = 1482.75", function () {
    closeTo(calc.calcBmr(70, 175, 30, "female", "mifflin"), 1482.75);
});

test("mifflin: female 60kg/160cm/25y = 1314", function () {
    closeTo(calc.calcBmr(60, 160, 25, "female", "mifflin"), 1314);
});

// --- calcBmr: Харриса-Бенедикта ---
test("harris: male 70kg/175cm/30y = 1695.36", function () {
    closeTo(calc.calcBmr(70, 175, 30, "male", "harris"), 1695.36);
});

test("harris: female 70kg/175cm/30y = 1505.1", function () {
    closeTo(calc.calcBmr(70, 175, 30, "female", "harris"), 1505.1);
});

test("harris: male 90kg/190cm/45y = 1949.86", function () {
    closeTo(calc.calcBmr(90, 190, 45, "male", "harris"), 1949.86);
});

// --- calcBmr: крайние значения ---
test("mifflin: boundary ages 1 and 120 stay finite", function () {
    closeTo(calc.calcBmr(10, 75, 1, "male", "mifflin"), 568.75);
    closeTo(calc.calcBmr(70, 175, 120, "female", "mifflin"), 1032.75);
});

// --- calcChildCalories: фиксированные нормы для всех групп и пола ---
test("infant: 800 kcal for both genders", function () {
    assert.strictEqual(calc.calcChildCalories("infant", "male"), 800);
    assert.strictEqual(calc.calcChildCalories("infant", "female"), 800);
});

test("toddler: 1200 kcal for both genders", function () {
    assert.strictEqual(calc.calcChildCalories("toddler", "male"), 1200);
    assert.strictEqual(calc.calcChildCalories("toddler", "female"), 1200);
});

test("child4_8: 1600 kcal for both genders", function () {
    assert.strictEqual(calc.calcChildCalories("child4_8", "male"), 1600);
    assert.strictEqual(calc.calcChildCalories("child4_8", "female"), 1600);
});

test("child9_13: male 1800, female 1600", function () {
    assert.strictEqual(calc.calcChildCalories("child9_13", "male"), 1800);
    assert.strictEqual(calc.calcChildCalories("child9_13", "female"), 1600);
});

test("teen14_18: male 2400, female 2000", function () {
    assert.strictEqual(calc.calcChildCalories("teen14_18", "male"), 2400);
    assert.strictEqual(calc.calcChildCalories("teen14_18", "female"), 2000);
});

test("unknown age group returns null", function () {
    assert.strictEqual(calc.calcChildCalories("unknown", "male"), null);
    assert.strictEqual(calc.calcChildCalories("", "female"), null);
});

console.log("");
console.log(passed + " passed, " + failed + " failed");
if (failed > 0) process.exit(1);
