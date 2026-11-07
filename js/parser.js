// Парсер свободного текста дневника питания в блюда с ингредиентами.
// Сопоставляет разговорные названия с базой продуктов (data.js).
// Поддерживает граммовки (г/гр/грамм, диапазоны 100-150 г), меры
// (ст.л./ч.л./стакан/шт/ломтик/кусок), bare-числа для штучных продуктов
// и привязку количества к ближайшему/следующему продукту.
import { PRODUCT_MAP } from "./data.js";

// Псевдонимы: ключи — подстроки (нижний регистр), порядок важен (спец. → общ.).
const ALIASES = [
  { id: "chicken_breast", keys: ["куриная грудка", "куриной грудк", "курин груд", "грудка курин", "грудк", "грудка"], grams: 150 },
  { id: "chicken_thigh", keys: ["куриное бедро", "бедро кури", "куриное филе"], grams: 150 },
  { id: "turkey", keys: ["индейк"], grams: 150 },
  { id: "beef_lean", keys: ["говядин"], grams: 150 },
  { id: "pork_lean", keys: ["свинин"], grams: 120 },
  { id: "salmon", keys: ["лосос", "семг"], grams: 150 },
  { id: "pollock", keys: ["минтай", "треск"], grams: 150 },
  { id: "tuna_can", keys: ["тунец"], grams: 120 },
  { id: "shrimp", keys: ["креветк"], grams: 120 },
  { id: "squid", keys: ["кальмар"], grams: 120 },
  { id: "egg", keys: ["яйц", "яичниц", "омлет"], grams: 50, perUnit: 50 },
  { id: "egg_white", keys: ["белок яйца", "яичный белок", "яичн белок"], grams: 60 },
  { id: "curd_0", keys: ["творог обезжир", "творога обезжир", "творог 0", "творога 0", "творог 0%", "творога 0%"], grams: 150 },
  { id: "curd_5", keys: ["творог 2", "творога 2", "творог 5", "творога 5", "творог"], grams: 150 },
  { id: "milk_25", keys: ["молоко"], grams: 150 },
  { id: "greek_yogurt", keys: ["греческ йогурт", "йогурт"], grams: 150 },
  { id: "cheese_hard", keys: ["сыр гауд", "гауд", "сыр тверд", "сыр"], grams: 25 },
  { id: "mozzarella", keys: ["моцарелл"], grams: 30 },
  { id: "corn_groats", keys: ["кукурузн каша", "каша кукуруз", "кукурузн круп", "кукурузн", "полента"], grams: 70 },
  { id: "oats", keys: ["овсян", "геркулес", "каша овсян", "овсян хлоп"], grams: 60 },
  { id: "buckwheat", keys: ["гречк", "гречнев"], grams: 70 },
  { id: "rice_brown", keys: ["рис бур", "рис коричн"], grams: 70 },
  { id: "rice_white", keys: ["рис", "каша рис"], grams: 70 },
  { id: "millet", keys: ["пшен"], grams: 70 },
  { id: "bulgur", keys: ["булгур"], grams: 70 },
  { id: "quinoa", keys: ["киноа"], grams: 70 },
  { id: "pasta_ww", keys: ["макарон цельнозерн", "паста цельнозерн"], grams: 70 },
  { id: "pasta", keys: ["макарон", "паста", "спагетти", "вермишель"], grams: 70 },
  { id: "lentil", keys: ["чечевиц"], grams: 60 },
  { id: "chickpea", keys: ["нут"], grams: 60 },
  { id: "beans_red", keys: ["фасол"], grams: 60 },
  { id: "tomato", keys: ["помидор", "томат"], grams: 100 },
  { id: "cucumber", keys: ["огурец"], grams: 100 },
  { id: "broccoli", keys: ["броккол"], grams: 120 },
  { id: "cauliflower", keys: ["цветн капуста", "капуста цветн", "цветн"], grams: 120 },
  { id: "cabbage", keys: ["капуста"], grams: 100 },
  { id: "carrot", keys: ["морков"], grams: 80 },
  { id: "zucchini", keys: ["кабачок", "цуккини"], grams: 120 },
  { id: "pepper_bell", keys: ["болгарск перец", "перец болгарск", "сладк перец", "болгарск", "перец"], grams: 100 },
  { id: "spinach", keys: ["шпинат"], grams: 80 },
  { id: "potato", keys: ["картоф"], grams: 100 },
  { id: "onion", keys: ["лук"], grams: 50 },
  { id: "garlic", keys: ["чеснок"], grams: 5 },
  { id: "apple", keys: ["яблок"], grams: 150, perUnit: 150 },
  { id: "banana", keys: ["банан"], grams: 120, perUnit: 120 },
  { id: "pear", keys: ["груш"], grams: 150, perUnit: 150 },
  { id: "orange", keys: ["апельсин", "мандарин"], grams: 150, perUnit: 150 },
  { id: "berries", keys: ["ягод", "малин", "клубник", "черник"], grams: 100 },
  { id: "almond", keys: ["миндал"], grams: 15 },
  { id: "walnut", keys: ["грецк орех", "орех"], grams: 15 },
  { id: "chia", keys: ["чиа"], grams: 10 },
  { id: "pb", keys: ["арахисов паст", "арахис"], grams: 15 },
  { id: "butter", keys: ["сливочн масло", "слив масло", "слив. масло", "масло слив", "топлен масло", "масло топлен", "сливочн", "слив"], grams: 10 },
  { id: "olive_oil", keys: ["оливк масло", "масло оливк", "оливк"], grams: 7 },
  { id: "oil_sunflower", keys: ["растительн масло", "растит масло", "раст. масло", "масло раст", "масло для жарк", "растит", "подсолнечн"], grams: 7 },
  { id: "coconut_oil", keys: ["кокосовое масло", "кокосовое", "масло кокос"], grams: 7 },
  { id: "bread_ww", keys: ["хлеб цельнозерн", "хлеб зерн"], grams: 40 },
  { id: "bread_rye", keys: ["хлеб ржан", "лаваш"], grams: 40 },
  { id: "bread_rye", keys: ["хлеб"], grams: 40 },
  { id: "flour_ww", keys: ["мука цельнозерн", "мука зерн", "мука"], grams: 30 },
  { id: "honey", keys: ["мед", "мёд"], grams: 10 },
  { id: "chocolate_dark", keys: ["темн шоколад", "горьк шоколад", "темный шоколад"], grams: 20 },
  { id: "chocolate_milk", keys: ["молочн шоколад", "шоколад молочн", "шоколад"], grams: 20 },
  { id: "butter", keys: ["масло"], grams: 10 }, // запасное: просто «масло»
];

const isLetter = (ch) => /[a-zа-я]/i.test(ch);
// граница после кириллической единицы — не должна следовать буква
const NOT_LETTER = "(?![а-яa-z])";

// Сопоставляет продукты в нормализованной фразе, затирая найденные ключи.
// Требует границу слова перед ключом (чтобы «рис» не ловился внутри «ирис»).
function scanAliases(norm) {
  const found = [];
  let mask = norm;
  for (const a of ALIASES) {
    for (const key of a.keys) {
      let idx = -1, from = 0;
      while (true) {
        const i = mask.indexOf(key, from);
        if (i < 0) break;
        const before = i > 0 ? mask[i - 1] : " ";
        if (!isLetter(before)) { idx = i; break; }
        from = i + 1;
      }
      if (idx >= 0) {
        found.push({ alias: a, start: idx, end: idx + key.length, center: idx + key.length / 2 });
        mask = mask.slice(0, idx) + " ".repeat(key.length) + mask.slice(idx + key.length);
        break;
      }
    }
  }
  return found;
}

// Собирает все упоминания количеств в нормализованной фразе.
function scanQuantities(norm) {
  const out = [];
  function collect(re, kind) {
    const r = new RegExp(re, "gi");
    let m;
    while ((m = r.exec(norm)) !== null) {
      const nums = m.slice(1).filter((x) => x !== undefined).map((x) => parseFloat(String(x).replace(",", ".")));
      out.push({ start: m.index, end: m.index + m[0].length, kind, nums, n: nums.length ? nums[0] : 1 });
    }
  }
  // масса: 100 г / 100г / 100 гр / 100 грамм, с диапазоном 100-150 г
  collect("(\\d+(?:[.,]\\d+)?)\\s*(?:[-–—]\\s*(\\d+(?:[.,]\\d+)?))?\\s*(?:граммов|грамм|гр|г)" + NOT_LETTER, "mass");
  // ст.л. / столовая ложка
  collect("(\\d+(?:[.,]\\d+)?)?\\s*(?:ст\\.?\\s*л\\.?|ст\\s+л|столов[а-я]*\\s+ложк[а-я]*)", "tbsp");
  // ч.л. / чайная ложка
  collect("(\\d+(?:[.,]\\d+)?)?\\s*(?:ч\\.?\\s*л\\.?|ч\\s+л|чайн[а-я]*\\s+ложк[а-я]*)", "tsp");
  // стакан
  collect("(\\d+(?:[.,]\\d+)?)?\\s*стакан[а-я]*", "cup");
  // штуки
  collect("(\\d+)\\s*(?:шт|шту[а-я]*)" + NOT_LETTER, "sht");
  // ломтик / кусок / долька
  collect("(\\d+)\\s*(?:ломтик[а-я]*|кусок|куска|кусков|дольку|дольки|долька|долек)" + NOT_LETTER, "piece");
  // bare-число (только для штучных продуктов с perUnit) — собирается последним,
  // чтобы дедуплицироваться при наличии явной меры на той же позиции
  collect("(\\d+)\\s+", "bare");
  out.sort((a, b) => a.start - b.start);
  const res = [];
  let lastEnd = -1;
  for (const q of out) {
    if (q.start < lastEnd) continue;
    res.push(q);
    lastEnd = q.end;
  }
  return res;
}

// Допустимый диапазон веса одного ингредиента (граммы).
export const MIN_GRAMS = 1;
export const MAX_GRAMS = 2000;

// Валидация: только положительные конечные значения веса (>=1 г).
export const validGrams = (g) => (Number.isFinite(g) && g > 0 ? g : null);
// Валидация калорийности продукта: конечное неотрицательное число.
export const validKcal = (k) => (Number.isFinite(k) && k >= 0 ? k : null);

// Валидация ввода веса пользователем (поле дневника): ограничивает значение
// диапазоном [MIN_GRAMS, MAX_GRAMS] (1–2000 г). Некорректные/неположительные
// значения сбрасываются к минимуму, превышающие максимум — к максимуму.
export const clampInputGrams = (v) => {
  const g = parseFloat(v);
  if (!Number.isFinite(g) || g < MIN_GRAMS) return MIN_GRAMS;
  if (g > MAX_GRAMS) return MAX_GRAMS;
  return g;
};

// Ограничиваем вес разумным диапазоном, чтобы исключить абсурдные значения
// (например, «99999 г»), которые дали бы невозможную калорийность.
const clampGrams = (g) => Math.min(MAX_GRAMS, Math.max(MIN_GRAMS, Math.round(g * 10) / 10));

// Комплексная проверка ингредиента: корректный вес и корректные данные
// калорийности продукта — иначе ингредиент нельзя использовать.
export function validIngredient(ing) {
  if (!ing || validGrams(ing.grams) == null) return false;
  const p = PRODUCT_MAP[ing.productId];
  if (!p || validKcal(p.kcal) == null) return false;
  return true;
}

function resolveGrams(alias, q) {
  if (!q) return alias.grams;
  let v;
  if (q.kind === "mass") {
    const [a, b] = q.nums;
    v = b !== undefined ? Math.round(((a + b) / 2) * 10) / 10 : a; // среднее диапазона
  } else if (q.kind === "tbsp") v = q.n * 15;
  else if (q.kind === "tsp") v = q.n * 5;
  else if (q.kind === "cup") v = q.n * 200;
  else if (q.kind === "sht") v = q.n * (alias.perUnit || alias.grams);
  else if (q.kind === "piece") v = q.n * alias.grams;
  else if (q.kind === "bare") v = q.n * (alias.perUnit || alias.grams);
  else v = alias.grams;
  return validGrams(v) != null ? clampGrams(v) : alias.grams;
}

export function parsePhrase(phrase) {
  const norm = normalize(phrase);
  if (!norm) return [];
  const matches = scanAliases(norm);
  const quants = scanQuantities(norm);
  const usedM = new Set();
  const gramsByIdx = {};
  for (const q of quants) {
    let cand = matches.map((_, i) => i).filter((i) => !usedM.has(i) && PRODUCT_MAP[matches[i].alias.id]);
    if (q.kind === "bare") cand = cand.filter((i) => matches[i].alias.perUnit);
    if (!cand.length) continue;
    // мера обычно относится к следующему за ней продукту (род. падеж: «ложка мёда»);
    // если следующего нет — к ближайшему вообще
    const following = cand.filter((i) => matches[i].start >= q.start - 1);
    let pick;
    if (following.length) pick = following.sort((a, b) => matches[a].start - matches[b].start)[0];
    else pick = cand.sort((a, b) => Math.abs(matches[a].center - q.start) - Math.abs(matches[b].center - q.start))[0];
    usedM.add(pick);
    gramsByIdx[pick] = resolveGrams(matches[pick].alias, q);
  }
  const result = [];
  matches.forEach((m, i) => {
    if (!PRODUCT_MAP[m.alias.id]) return;
    const g = gramsByIdx[i] != null ? gramsByIdx[i] : m.alias.grams;
    if (validGrams(g) == null) return; // пропускаем некорректные/отрицательные значения
    const ing = { productId: m.alias.id, grams: clampGrams(g) };
    if (!validIngredient(ing)) return; // пропускаем продукты с некорректной калорийностью
    result.push(ing);
  });
  return result;
}

function normalize(s) {
  return s.toLowerCase().replace(/ё/g, "е")
    .replace(/ст\.?\s*л\.?/g, " стл ")   // ст.л. / ст л → стл (без точек, чтобы не рвать фразу)
    .replace(/ч\.?\s*л\.?/g, " чл ")     // ч.л. / ч л → чл
    .replace(/[^a-zа-я0-9 .%]/gi, " ").replace(/\s+/g, " ").trim();
}

export function parseDiary(text) {
  const meals = [];
  const lines = (text || "").split(/\n+/);
  const re = /(завтрак|обед|ужин|перекус|полдник)/gi;
  const flat = lines.join(" \n ").replace(/ст\.?\s*л\.?/gi, " стл ").replace(/ч\.?\s*л\.?/gi, " чл ");
  const marks = [];
  let m;
  while ((m = re.exec(flat)) !== null) marks.push({ name: m[1], idx: m.index });
  if (marks.length === 0) {
    const ings = parsePhrase(flat);
    if (ings.length) meals.push({ name: "Перекус", ingredients: ings });
    return meals;
  }
  for (let i = 0; i < marks.length; i++) {
    const name = marks[i].name.charAt(0).toUpperCase() + marks[i].name.slice(1);
    const start = marks[i].idx + marks[i].name.length;
    const end = i + 1 < marks.length ? marks[i + 1].idx : flat.length;
    const body = flat.slice(start, end);
    const phrases = body.split(/[.!?,;\n]+/).map((p) => p.trim()).filter(Boolean);
    const ings = [];
    for (const ph of phrases) for (const ing of parsePhrase(ph)) ings.push(ing);
    if (ings.length) meals.push({ name, ingredients: ings });
  }
  return meals;
}
