// Парсер свободного текста дневника питания в блюда с ингредиентами.
// Сопоставляет разговорные названия с базой продуктов (data.js).
import { PRODUCT_MAP } from "./data.js";

// Псевдонимы: ключи — подстроки (нижний регистр), порядок важен (спец. → общ.).
const ALIASES = [
  { id: "chicken_breast", keys: ["куриная грудка", "куриной грудк", "курин груд", "грудка курин", "грудка"], grams: 150 },
  { id: "chicken_thigh", keys: ["куриное бедро", "бедро кури", "куриное филе"], grams: 150 },
  { id: "turkey", keys: ["индейк"], grams: 150 },
  { id: "beef_lean", keys: ["говядин"], grams: 150 },
  { id: "pork_lean", keys: ["свинин"], grams: 120 },
  { id: "salmon", keys: ["лосос", "семг"], grams: 150 },
  { id: "pollock", keys: ["минтай", "треск"], grams: 150 },
  { id: "tuna_can", keys: ["тунец"], grams: 120 },
  { id: "shrimp", keys: ["креветк"], grams: 120 },
  { id: "squid", keys: ["кальмар"], grams: 120 },
  { id: "egg", keys: ["яйц", "яичниц", "омлет"], grams: 50, perUnit: 50, unitWord: "шт" },
  { id: "egg_white", keys: ["белок яйца", "яичный белок", "яичн белок"], grams: 60 },
  { id: "curd_5", keys: ["творог обезжир", "творог 0", "творог 2", "творог 5", "творог"], grams: 150 },
  { id: "milk_25", keys: ["молоко"], grams: 150 },
  { id: "greek_yogurt", keys: ["греческ йогурт", "йогурт"], grams: 150 },
  { id: "cheese_hard", keys: ["сыр гауд", "гауд", "сыр тверд", "сыр"], grams: 25 },
  { id: "mozzarella", keys: ["моцарелл"], grams: 30 },
  { id: "corn_groats", keys: ["кукурузн каша", "каша кукуруз", "кукурузн круп", "кукурузн", "полента"], grams: 70 },
  { id: "oats", keys: ["овсян", "геркулес", "каша овсян", "овсян хлоп"], grams: 60 },
  { id: "buckwheat", keys: ["гречк", "гречнев"], grams: 70 },
  { id: "rice_white", keys: ["рис", "каша рис"], grams: 70 },
  { id: "millet", keys: ["пшен"], grams: 70 },
  { id: "bulgur", keys: ["булгур"], grams: 70 },
  { id: "quinoa", keys: ["киноа"], grams: 70 },
  { id: "pasta", keys: ["макарон", "паста", "спагетти", "вермишель"], grams: 70 },
  { id: "lentil", keys: ["чечевиц"], grams: 60 },
  { id: "chickpea", keys: [" нут", "нут "], grams: 60 },
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
  { id: "apple", keys: ["яблок"], grams: 150 },
  { id: "banana", keys: ["банан"], grams: 120 },
  { id: "pear", keys: ["груш"], grams: 150 },
  { id: "orange", keys: ["апельсин", "мандарин"], grams: 150 },
  { id: "berries", keys: ["ягод", "малин", "клубник", "черник"], grams: 100 },
  { id: "almond", keys: ["миндал"], grams: 15 },
  { id: "walnut", keys: ["грецк орех", "орех"], grams: 15 },
  { id: "chia", keys: ["чиа"], grams: 10 },
  { id: "pb", keys: ["арахисов паст", "арахис"], grams: 15 },
  { id: "butter", keys: ["сливочн масло", "слив масло", "слив. масло", "масло слив", "топлен масло", "масло топлен", "сливочн", "слив"], grams: 10 },
  { id: "olive_oil", keys: ["оливк масло", "масло оливк", "оливк"], grams: 7 },
  { id: "oil_sunflower", keys: ["растительн масло", "растит масло", "раст. масло", "масло раст", "масло для жарк", "растит", "подсолнечн"], grams: 7 },
  { id: "coconut_oil", keys: ["кокосовое масло", "кокосовое", "масло кокос"], grams: 7 },
  { id: "bread_rye", keys: ["хлеб ржан"], grams: 40 },
  { id: "bread_ww", keys: ["хлеб цельнозерн", "хлеб зерн"], grams: 40 },
  { id: "bread_rye", keys: ["хлеб", "лаваш"], grams: 40 },
  { id: "flour_ww", keys: ["мука цельнозерн", "мука зерн", "мука"], grams: 30 },
  { id: "honey", keys: ["мед", "мёд"], grams: 10 },
  { id: "chocolate_dark", keys: ["темн шоколад", "горьк шоколад", "темный шоколад"], grams: 20 },
  { id: "chocolate_milk", keys: ["молочн шоколад", "шоколад молочн", "шоколад"], grams: 20 },
  { id: "butter", keys: ["масло"], grams: 10 }, // запасное: просто «масло»
];

const MEAL_WORDS = ["завтрак", "обед", "ужин", "перекус", "полдник"];

function normalize(s) {
  return s.toLowerCase().replace(/ё/g, "е").replace(/[^a-zа-я0-9 .%]/gi, " ").replace(/\s+/g, " ").trim();
}

// Сопоставляет продукты в нормализованной фразе, затирая найденные ключи.
function scanAliases(norm) {
  const found = [];
  let s = " " + norm + " ";
  for (const a of ALIASES) {
    for (const key of a.keys) {
      const idx = s.indexOf(key);
      if (idx >= 0) {
        found.push(a);
        s = s.slice(0, idx) + " ".repeat(key.length) + s.slice(idx + key.length);
        break;
      }
    }
  }
  return found;
}

function parsePhrase(phrase) {
  const norm = normalize(phrase);
  if (!norm) return [];
  const gramsMatch = norm.match(/(\d+(?:[.,]\d+)?)\s*г/);
  const shtMatch = norm.match(/(\d+)\s*шт/);
  const aliases = scanAliases(norm);
  const result = [];
  for (const a of aliases) {
    if (!PRODUCT_MAP[a.id]) continue;
    let grams = a.grams;
    if (a.unitWord && shtMatch) grams = parseInt(shtMatch[1], 10) * a.perUnit;
    else if (aliases.length === 1 && gramsMatch) grams = parseFloat(gramsMatch[1].replace(",", "."));
    result.push({ productId: a.id, grams });
  }
  return result;
}

export function parseDiary(text) {
  const meals = [];
  const lines = (text || "").split(/\n+/);
  // Собираем все вхождения ключевых слов приёмов пищи
  const re = /(завтрак|обед|ужин|перекус|полдник)/gi;
  const flat = lines.join(" \n ");
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
    for (const ph of phrases) {
      for (const ing of parsePhrase(ph)) ings.push(ing);
    }
    if (ings.length) meals.push({ name, ingredients: ings });
  }
  return meals;
}
