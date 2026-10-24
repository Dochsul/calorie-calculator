// Zero-dependency tests for calcBmr, calcChildCalories and calcTotalCalories.
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

// Базовый взрослый сценарий: male 70kg/175cm/30y, mifflin, активность 1.2
function baseline(overrides) {
    var input = {
        weight: 70,
        height: 175,
        age: 30,
        gender: "male",
        formula: "mifflin",
        activity: 1.2,
        isPregnant: false,
        isBreastfeeding: false,
        isCycle: false,
        goal: "maintain"
    };
    for (var key in overrides) input[key] = overrides[key];
    return input;
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

// --- calcTotalCalories: активность и цели (mifflin male 70/175/30: BMR 1648.75) ---
test("maintain: BMR * 1.2 = 1978.5", function () {
    closeTo(calc.calcTotalCalories(baseline({})), 1978.5);
});

test("lose20: total * 0.8 = 1582.8", function () {
    closeTo(calc.calcTotalCalories(baseline({ goal: "lose20" })), 1582.8);
});

test("lose15: total * 0.85 = 1681.725", function () {
    closeTo(calc.calcTotalCalories(baseline({ goal: "lose15" })), 1681.725);
});

test("muscleGain: total * 1.15 = 2275.275", function () {
    closeTo(calc.calcTotalCalories(baseline({ goal: "muscleGain" })), 2275.275);
});

test("harris formula with high activity = 2627.808", function () {
    closeTo(calc.calcTotalCalories(baseline({ formula: "harris", activity: 1.55 })), 2627.808);
});

test("female mifflin with light activity = 2038.78125", function () {
    closeTo(
        calc.calcTotalCalories(baseline({ gender: "female", activity: 1.375 })),
        2038.78125
    );
});

// --- calcTotalCalories: надбавки ---
test("pregnancy adds 300 after activity", function () {
    closeTo(calc.calcTotalCalories(baseline({ isPregnant: true })), 2278.5);
});

test("breastfeeding adds 500 after activity", function () {
    closeTo(calc.calcTotalCalories(baseline({ isBreastfeeding: true })), 2478.5);
});

test("cycle adds 100 after activity", function () {
    closeTo(calc.calcTotalCalories(baseline({ isCycle: true })), 2078.5);
});

test("extras combine before goal correction: female = 2022.405", function () {
    closeTo(
        calc.calcTotalCalories(
            baseline({ gender: "female", isBreastfeeding: true, isCycle: true, goal: "lose15" })
        ),
        2022.405
    );
});

// --- calcTotalCalories: дети ---
test("child toddler with activity 1.2 = 1440", function () {
    closeTo(calc.calcTotalCalories({ isChild: true, childAgeGroup: "toddler", gender: "female", activity: 1.2 }), 1440);
});

test("child child9_13 female with activity 1.2 = 1920", function () {
    closeTo(calc.calcTotalCalories({ isChild: true, childAgeGroup: "child9_13", gender: "female", activity: 1.2 }), 1920);
});

test("child teen14_18 male with activity 1.725 = 4140", function () {
    closeTo(calc.calcTotalCalories({ isChild: true, childAgeGroup: "teen14_18", gender: "male", activity: 1.725 }), 4140);
});

test("child: goal and adult extras are ignored", function () {
    closeTo(
        calc.calcTotalCalories({
            isChild: true, childAgeGroup: "toddler", gender: "male",
            activity: 1.2, goal: "muscleGain", isPregnant: true, isBreastfeeding: true
        }),
        1440
    );
});

test("child: unknown age group returns null", function () {
    assert.strictEqual(
        calc.calcTotalCalories({ isChild: true, childAgeGroup: "nope", gender: "male", activity: 1.2 }),
        null
    );
});

// --- Доп. покрытие: calcBmr, другие фигуры и дробные значения ---
test("harris: female 60kg/160cm/25y = 1388.1", function () {
    closeTo(calc.calcBmr(60, 160, 25, "female", "harris"), 1388.1);
});

test("mifflin: female 90kg/190cm/45y = 1701.5", function () {
    closeTo(calc.calcBmr(90, 190, 45, "female", "mifflin"), 1701.5);
});

test("mifflin: male 68.5kg/172.5cm/31.5y = 1610.625", function () {
    closeTo(calc.calcBmr(68.5, 172.5, 31.5, "male", "mifflin"), 1610.625);
});

test("mifflin: zero weight stays finite (948.75, no NaN)", function () {
    closeTo(calc.calcBmr(0, 175, 30, "male", "mifflin"), 948.75);
});

// --- Доп. покрытие: дети, остальные группы и активности ---
test("child: every age group returns a number for both genders", function () {
    for (var group in calc.CHILD_CALORIES) {
        assert.strictEqual(typeof calc.calcChildCalories(group, "male"), "number", group + ": male");
        assert.strictEqual(typeof calc.calcChildCalories(group, "female"), "number", group + ": female");
    }
});

test("child infant with activity 1.55 = 1240", function () {
    closeTo(calc.calcTotalCalories({ isChild: true, childAgeGroup: "infant", gender: "male", activity: 1.55 }), 1240);
});

test("child child9_13 male with activity 1.375 = 2475", function () {
    closeTo(calc.calcTotalCalories({ isChild: true, childAgeGroup: "child9_13", gender: "male", activity: 1.375 }), 2475);
});

test("child teen14_18 female with activity 1.375 = 2750", function () {
    closeTo(calc.calcTotalCalories({ isChild: true, childAgeGroup: "teen14_18", gender: "female", activity: 1.375 }), 2750);
});

test("child: cycle extra and lose20 goal are ignored too", function () {
    closeTo(
        calc.calcTotalCalories({
            isChild: true, childAgeGroup: "toddler", gender: "male",
            activity: 1.2, isCycle: true, goal: "lose20"
        }),
        1440
    );
});

// --- Доп. покрытие: комбинации формулы, активности, надбавок и цели ---
test("harris female maintain with high activity = 2332.905", function () {
    closeTo(
        calc.calcTotalCalories(baseline({ gender: "female", formula: "harris", activity: 1.55 })),
        2332.905
    );
});

test("all extras combine: female mifflin = 2679.3", function () {
    closeTo(
        calc.calcTotalCalories(
            baseline({ gender: "female", isPregnant: true, isBreastfeeding: true, isCycle: true })
        ),
        2679.3
    );
});

test("pregnancy with lose20: female = 1663.44", function () {
    closeTo(
        calc.calcTotalCalories(baseline({ gender: "female", isPregnant: true, goal: "lose20" })),
        1663.44
    );
});

test("breastfeeding + cycle with lose20: female = 1903.44", function () {
    closeTo(
        calc.calcTotalCalories(
            baseline({ gender: "female", isBreastfeeding: true, isCycle: true, goal: "lose20" })
        ),
        1903.44
    );
});

test("muscleGain with harris and high activity: male = 3363.1704", function () {
    closeTo(
        calc.calcTotalCalories(baseline({ formula: "harris", activity: 1.725, goal: "muscleGain" })),
        3363.1704
    );
});

console.log("");
console.log(passed + " passed, " + failed + " failed");
if (failed > 0) process.exit(1);
