// Pure calculation functions of the calorie calculator.
// Shared by index.html (browser, functions stay global) and tests/calc.test.js
// (Node, exported via module.exports below).

// Нормы калорийности для детей (ккал/сутки)
var CHILD_CALORIES = {
    infant: 800,
    toddler: 1200,
    child4_8: 1600,
    child9_13: { male: 1800, female: 1600 },
    teen14_18: { male: 2400, female: 2000 }
};

// Расчёт BMR по выбранной формуле для взрослых
function calcBmr(weight, height, age, gender, formula) {
    if (formula === "mifflin") {
        return gender === "male"
            ? 10 * weight + 6.25 * height - 5 * age + 5
            : 10 * weight + 6.25 * height - 5 * age - 161;
    }
    return gender === "male"
        ? 88.36 + 13.4 * weight + 4.8 * height - 5.7 * age
        : 447.6 + 9.2 * weight + 3.1 * height - 4.3 * age;
}

// Расчёт калорий для детей по возрастной группе
function calcChildCalories(childAgeGroup, gender) {
    var norm = CHILD_CALORIES[childAgeGroup];
    if (!norm) return null;
    return typeof norm === "object" ? norm[gender] : norm;
}

// Экспорт для Node (тесты); в браузере module не определён
if (typeof module !== "undefined" && module.exports) {
    module.exports = {
        CHILD_CALORIES: CHILD_CALORIES,
        calcBmr: calcBmr,
        calcChildCalories: calcChildCalories
    };
}
