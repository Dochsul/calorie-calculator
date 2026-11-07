/**
 * AINA MENU — База продуктов
 * Пищевая ценность на 100 г съедобной части.
 * Источники: USDA FoodData Central, российские таблицы химического состава.
 * yield — коэффициент выхода: для shrink < 1 (мясо теряет вес),
 *         для expand > 1 (крупа впитывает воду), 1.0 — без изменений.
 * yieldType: "shrink" | "expand" | "none"
 */

// Глобальный объект для views (загружается первым)
const Views = {};

const PRODUCT_CATEGORIES = {
  meat: 'Мясо и птица',
  fish: 'Рыба и морепродукты',
  eggs: 'Яйца',
  dairy: 'Молочные продукты',
  cheese: 'Сыры',
  grain: 'Крупы',
  pasta: 'Макаронные изделия',
  bread: 'Хлеб и выпечка',
  legume: 'Бобовые',
  vegetable: 'Овощи',
  fruit: 'Фрукты',
  berry: 'Ягоды',
  nut: 'Орехи',
  oil: 'Масла',
  sweet: 'Сахар и сладости',
  flour: 'Мука',
  other: 'Другое'
};

const PRODUCTS = [
  // ── Мясо и птица (сырые) ──
  {id:'chicken_breast',name:'Куриная грудка',cat:'meat',state:'сырая',kcal:113,protein:23.6,fat:1.9,carbs:0,fiber:0,yield:0.72,yt:'shrink',edible:1.0,methods:['Варка','Запекание','Жарка','Гриль','На пару'],src:'USDA FoodData Central'},
  {id:'chicken_thigh',name:'Куриное бедро',cat:'meat',state:'сырое',kcal:185,protein:19.4,fat:11.3,carbs:0,fiber:0,yield:0.76,yt:'shrink',edible:1.0,methods:['Варка','Запекание','Жарка','Тушение'],src:'USDA'},
  {id:'turkey_breast',name:'Индейка (грудка)',cat:'meat',state:'сырая',kcal:84,protein:24.0,fat:1.0,carbs:0,fiber:0,yield:0.73,yt:'shrink',edible:1.0,methods:['Варка','Запекание','Жарка','На пару'],src:'USDA'},
  {id:'beef',name:'Говядина',cat:'meat',state:'сырая',kcal:250,protein:26.0,fat:15.0,carbs:0,fiber:0,yield:0.68,yt:'shrink',edible:1.0,methods:['Варка','Тушение','Запекание','Жарка'],src:'USDA'},
  {id:'pork_lean',name:'Свинина (нежирная)',cat:'meat',state:'сырая',kcal:242,protein:27.0,fat:14.0,carbs:0,fiber:0,yield:0.70,yt:'shrink',edible:1.0,methods:['Варка','Тушение','Запекание','Жарка'],src:'USDA'},
  {id:'ground_beef',name:'Фарш говяжий',cat:'meat',state:'сырой',kcal:254,protein:17.0,fat:20.0,carbs:0,fiber:0,yield:0.72,yt:'shrink',edible:1.0,methods:['Жарка','Тушение','Запекание'],src:'USDA'},

  // ── Рыба и морепродукты ──
  {id:'pollock',name:'Минтай',cat:'fish',state:'сырой',kcal:72,protein:16.0,fat:1.0,carbs:0,fiber:0,yield:0.78,yt:'shrink',edible:1.0,methods:['Варка','Запекание','Жарка','На пару'],src:'USDA'},
  {id:'salmon',name:'Лосось (семга)',cat:'fish',state:'сырой',kcal:208,protein:20.0,fat:15.0,carbs:0,fiber:0,yield:0.80,yt:'shrink',edible:1.0,methods:['Запекание','Жарка','На пару'],src:'USDA'},
  {id:'cod',name:'Треска',cat:'fish',state:'сырая',kcal:82,protein:18.0,fat:0.7,carbs:0,fiber:0,yield:0.78,yt:'shrink',edible:1.0,methods:['Варка','Запекание','Жарка','На пару'],src:'USDA'},
  {id:'shrimp',name:'Креветки',cat:'fish',state:'сырые',kcal:99,protein:24.0,fat:0.3,carbs:0.2,fiber:0,yield:0.85,yt:'shrink',edible:1.0,methods:['Варка','Жарка'],src:'USDA'},

  // ── Яйца ──
  {id:'egg',name:'Яйцо куриное',cat:'eggs',state:'сырое',kcal:157,protein:12.7,fat:10.9,carbs:0.7,fiber:0,yield:0.90,yt:'shrink',edible:1.0,methods:['Варка','Жарка','Запекание'],src:'USDA'},
  {id:'egg_white',name:'Яичный белок',cat:'eggs',state:'сырой',kcal:52,protein:10.8,fat:0.3,carbs:0.7,fiber:0,yield:0.95,yt:'shrink',edible:1.0,methods:['Жарка','Варка'],src:'USDA'},

  // ── Молочные продукты ──
  {id:'milk_32',name:'Молоко 3.2%',cat:'dairy',state:'готовое',kcal:60,protein:2.9,fat:3.2,carbs:4.7,fiber:0,yield:1.0,yt:'none',edible:1.0,methods:['—'],src:'USDA'},
  {id:'kefir',name:'Кефир 2.5%',cat:'dairy',state:'готовое',kcal:53,protein:3.0,fat:2.5,carbs:4.0,fiber:0,yield:1.0,yt:'none',edible:1.0,methods:['—'],src:'USDA'},
  {id:'yogurt_natural',name:'Йогурт натуральный',cat:'dairy',state:'готовое',kcal:60,protein:4.0,fat:3.2,carbs:6.0,fiber:0,yield:1.0,yt:'none',edible:1.0,methods:['—'],src:'USDA'},
  {id:'sour_cream_15',name:'Сметана 15%',cat:'dairy',state:'готовая',kcal:162,protein:3.0,fat:15.0,carbs:3.0,fiber:0,yield:1.0,yt:'none',edible:1.0,methods:['—'],src:'USDA'},
  {id:'cottage_5',name:'Творог 5%',cat:'dairy',state:'готовый',kcal:121,protein:17.2,fat:5.0,carbs:1.8,fiber:0,yield:1.0,yt:'none',edible:1.0,methods:['—'],src:'USDA'},
  {id:'cottage_9',name:'Творог 9%',cat:'dairy',state:'готовый',kcal:185,protein:16.7,fat:9.0,carbs:2.0,fiber:0,yield:1.0,yt:'none',edible:1.0,methods:['—'],src:'USDA'},
  {id:'cottage_0',name:'Творог 0%',cat:'dairy',state:'готовый',kcal:85,protein:18.0,fat:0.5,carbs:1.8,fiber:0,yield:1.0,yt:'none',edible:1.0,methods:['—'],src:'USDA'},
  {id:'butter',name:'Масло сливочное',cat:'dairy',state:'готовое',kcal:748,protein:0.5,fat:82.5,carbs:0.8,fiber:0,yield:1.0,yt:'none',edible:1.0,methods:['—'],src:'USDA'},

  // ── Сыры ──
  {id:'cheese_russian',name:'Сыр (средний)',cat:'cheese',state:'готовый',kcal:350,protein:25.0,fat:30.0,carbs:0,fiber:0,yield:1.0,yt:'none',edible:1.0,methods:['—'],src:'USDA'},
  {id:'cheese_mozzarella',name:'Моцарелла',cat:'cheese',state:'готовая',kcal:280,protein:28.0,fat:20.0,carbs:3.0,fiber:0,yield:1.0,yt:'none',edible:1.0,methods:['—'],src:'USDA'},
  {id:'feta',name:'Фета',cat:'cheese',state:'готовая',kcal:264,protein:14.0,fat:21.0,carbs:4.0,fiber:0,yield:1.0,yt:'none',edible:1.0,methods:['—'],src:'USDA'},

  // ── Крупы (сухие) ──
  {id:'buckwheat',name:'Гречка',cat:'grain',state:'сухая',kcal:313,protein:12.6,fat:2.6,carbs:68.0,fiber:10.0,yield:2.5,yt:'expand',edible:1.0,methods:['Варка'],src:'USDA'},
  {id:'rice_white',name:'Рис белый',cat:'grain',state:'сухой',kcal:333,protein:7.0,fat:1.0,carbs:74.0,fiber:1.0,yield:2.8,yt:'expand',edible:1.0,methods:['Варка'],src:'USDA'},
  {id:'rice_brown',name:'Рис бурый',cat:'grain',state:'сухой',kcal:370,protein:7.5,fat:2.5,carbs:76.0,fiber:3.0,yield:2.6,yt:'expand',edible:1.0,methods:['Варка'],src:'USDA'},
  {id:'oats',name:'Овсянка (геркулес)',cat:'grain',state:'сухая',kcal:389,protein:13.0,fat:6.5,carbs:67.0,fiber:10.0,yield:2.6,yt:'expand',edible:1.0,methods:['Варка'],src:'USDA'},
  {id:'millet',name:'Пшено',cat:'grain',state:'сухое',kcal:348,protein:11.5,fat:3.3,carbs:73.0,fiber:8.0,yield:2.8,yt:'expand',edible:1.0,methods:['Варка'],src:'USDA'},
  {id:'quinoa',name:'Киноа',cat:'grain',state:'сухая',kcal:368,protein:14.0,fat:6.0,carbs:64.0,fiber:7.0,yield:2.8,yt:'expand',edible:1.0,methods:['Варка'],src:'USDA'},
  {id:'semolina',name:'Манная крупа',cat:'grain',state:'сухая',kcal:333,protein:10.0,fat:1.0,carbs:73.0,fiber:1.0,yield:3.0,yt:'expand',edible:1.0,methods:['Варка'],src:'USDA'},

  // ── Макаронные изделия (сухие) ──
  {id:'pasta',name:'Макароны',cat:'pasta',state:'сухие',kcal:350,protein:12.0,fat:1.5,carbs:71.0,fiber:3.0,yield:2.3,yt:'expand',edible:1.0,methods:['Варка'],src:'USDA'},
  {id:'spaghetti',name:'Спагетти',cat:'pasta',state:'сухие',kcal:350,protein:12.0,fat:1.5,carbs:71.0,fiber:3.0,yield:2.3,yt:'expand',edible:1.0,methods:['Варка'],src:'USDA'},

  // ── Хлеб и выпечка ──
  {id:'bread_white',name:'Хлеб белый',cat:'bread',state:'готовый',kcal:265,protein:8.0,fat:2.0,carbs:50.0,fiber:2.5,yield:1.0,yt:'none',edible:1.0,methods:['—'],src:'USDA'},
  {id:'bread_whole',name:'Хлеб цельнозерновой',cat:'bread',state:'готовый',kcal:247,protein:13.0,fat:3.4,carbs:41.0,fiber:7.0,yield:1.0,yt:'none',edible:1.0,methods:['—'],src:'USDA'},
  {id:'tortilla',name:'Тортилья',cat:'bread',state:'готовая',kcal:310,protein:8.0,fat:7.0,carbs:52.0,fiber:3.0,yield:1.0,yt:'none',edible:1.0,methods:['—'],src:'USDA'},
  {id:'lavash',name:'Лаваш',cat:'bread',state:'готовый',kcal:277,protein:9.0,fat:1.5,carbs:56.0,fiber:2.0,yield:1.0,yt:'none',edible:1.0,methods:['—'],src:'USDA'},

  // ── Бобовые (сухие) ──
  {id:'beans_dry',name:'Фасоль (сухая)',cat:'legume',state:'сухая',kcal:333,protein:21.0,fat:1.5,carbs:62.0,fiber:25.0,yield:2.5,yt:'expand',edible:1.0,methods:['Варка'],src:'USDA'},
  {id:'lentils_dry',name:'Чечевица (сухая)',cat:'legume',state:'сухая',kcal:353,protein:24.0,fat:1.5,carbs:60.0,fiber:31.0,yield:2.5,yt:'expand',edible:1.0,methods:['Варка'],src:'USDA'},
  {id:'chickpeas_dry',name:'Нут (сухой)',cat:'legume',state:'сухой',kcal:364,protein:19.0,fat:6.0,carbs:61.0,fiber:17.0,yield:2.5,yt:'expand',edible:1.0,methods:['Варка'],src:'USDA'},

  // ── Овощи (сырые) ──
  {id:'potato',name:'Картофель',cat:'vegetable',state:'сырой',kcal:77,protein:2.0,fat:0.4,carbs:16.0,fiber:2.0,yield:0.90,yt:'shrink',edible:1.0,methods:['Варка','Запекание','Жарка','На пару'],src:'USDA'},
  {id:'carrot',name:'Морковь',cat:'vegetable',state:'сырая',kcal:41,protein:1.0,fat:0.2,carbs:10.0,fiber:2.8,yield:0.88,yt:'shrink',edible:1.0,methods:['Варка','Тушение','Жарка','На пару'],src:'USDA'},
  {id:'onion',name:'Лук репчатый',cat:'vegetable',state:'сырой',kcal:40,protein:1.4,fat:0.2,carbs:9.0,fiber:1.7,yield:0.85,yt:'shrink',edible:1.0,methods:['Жарка','Варка','Тушение'],src:'USDA'},
  {id:'tomato',name:'Помидор',cat:'vegetable',state:'сырой',kcal:18,protein:0.9,fat:0.2,carbs:3.9,fiber:1.2,yield:1.0,yt:'none',edible:1.0,methods:['—','Жарка','Тушение'],src:'USDA'},
  {id:'cucumber',name:'Огурец',cat:'vegetable',state:'сырой',kcal:15,protein:0.7,fat:0.1,carbs:3.0,fiber:1.0,yield:1.0,yt:'none',edible:1.0,methods:['—'],src:'USDA'},
  {id:'cabbage',name:'Капуста белокочанная',cat:'vegetable',state:'сырая',kcal:25,protein:1.3,fat:0.1,carbs:5.8,fiber:2.5,yield:0.85,yt:'shrink',edible:1.0,methods:['Варка','Тушение','Жарка'],src:'USDA'},
  {id:'pepper_sweet',name:'Перец сладкий',cat:'vegetable',state:'сырой',kcal:26,protein:1.0,fat:0.3,carbs:6.0,fiber:2.0,yield:0.88,yt:'shrink',edible:1.0,methods:['Жарка','Тушение','Запекание'],src:'USDA'},
  {id:'lettuce',name:'Салат листовой',cat:'vegetable',state:'сырой',kcal:15,protein:1.4,fat:0.2,carbs:2.0,fiber:1.0,yield:1.0,yt:'none',edible:1.0,methods:['—'],src:'USDA'},
  {id:'beet',name:'Свекла',cat:'vegetable',state:'сырая',kcal:43,protein:1.6,fat:0.2,carbs:9.6,fiber:2.8,yield:0.90,yt:'shrink',edible:1.0,methods:['Варка','Запекание'],src:'USDA'},
  {id:'broccoli',name:'Брокколи',cat:'vegetable',state:'сырая',kcal:34,protein:2.8,fat:0.4,carbs:7.0,fiber:2.6,yield:0.90,yt:'shrink',edible:1.0,methods:['Варка','На пару','Жарка'],src:'USDA'},
  {id:'zucchini',name:'Кабачок',cat:'vegetable',state:'сырой',kcal:24,protein:0.6,fat:0.3,carbs:4.6,fiber:1.5,yield:0.88,yt:'shrink',edible:1.0,methods:['Жарка','Тушение','Запекание','На пару'],src:'USDA'},
  {id:'eggplant',name:'Баклажан',cat:'vegetable',state:'сырой',kcal:25,protein:1.0,fat:0.2,carbs:6.0,fiber:2.5,yield:0.85,yt:'shrink',edible:1.0,methods:['Жарка','Запекание','Тушение'],src:'USDA'},
  {id:'spinach',name:'Шпинат',cat:'vegetable',state:'сырой',kcal:23,protein:2.9,fat:0.4,carbs:3.6,fiber:2.2,yield:0.80,yt:'shrink',edible:1.0,methods:['Варка','Тушение','На пару'],src:'USDA'},
  {id:'green_onion',name:'Зелёный лук',cat:'vegetable',state:'сырой',kcal:20,protein:1.3,fat:0.1,carbs:3.2,fiber:1.2,yield:1.0,yt:'none',edible:1.0,methods:['—'],src:'USDA'},
  {id:'garlic',name:'Чеснок',cat:'vegetable',state:'сырой',kcal:149,protein:6.4,fat:0.5,carbs:33.0,fiber:2.1,yield:0.90,yt:'shrink',edible:0.85,methods:['Жарка','Варка'],src:'USDA'},
  {id:'corn',name:'Кукуруза',cat:'vegetable',state:'сырая',kcal:86,protein:3.3,fat:1.4,carbs:19.0,fiber:2.7,yield:0.95,yt:'shrink',edible:1.0,methods:['Варка'],src:'USDA'},

  // ── Фрукты ──
  {id:'apple',name:'Яблоко',cat:'fruit',state:'сырое',kcal:52,protein:0.3,fat:0.2,carbs:14.0,fiber:2.4,yield:1.0,yt:'none',edible:0.90,methods:['—','Запекание'],src:'USDA'},
  {id:'banana',name:'Банан',cat:'fruit',state:'сырой',kcal:89,protein:1.1,fat:0.3,carbs:23.0,fiber:2.6,yield:1.0,yt:'none',edible:0.65,methods:['—'],src:'USDA'},
  {id:'pear',name:'Груша',cat:'fruit',state:'сырая',kcal:42,protein:0.4,fat:0.1,carbs:11.0,fiber:3.1,yield:1.0,yt:'none',edible:0.85,methods:['—'],src:'USDA'},
  {id:'orange',name:'Апельсин',cat:'fruit',state:'сырой',kcal:47,protein:0.9,fat:0.1,carbs:12.0,fiber:2.4,yield:1.0,yt:'none',edible:0.75,methods:['—'],src:'USDA'},
  {id:'avocado',name:'Авокадо',cat:'fruit',state:'сырое',kcal:160,protein:2.0,fat:15.0,carbs:9.0,fiber:7.0,yield:1.0,yt:'none',edible:0.75,methods:['—'],src:'USDA'},

  // ── Ягоды ──
  {id:'strawberry',name:'Клубника',cat:'berry',state:'сырая',kcal:32,protein:0.7,fat:0.3,carbs:7.7,fiber:2.0,yield:1.0,yt:'none',edible:1.0,methods:['—'],src:'USDA'},
  {id:'blueberry',name:'Голубика',cat:'berry',state:'сырая',kcal:57,protein:0.7,fat:0.3,carbs:14.0,fiber:2.4,yield:1.0,yt:'none',edible:1.0,methods:['—'],src:'USDA'},
  {id:'raspberry',name:'Малина',cat:'berry',state:'сырая',kcal:53,protein:1.2,fat:0.7,carbs:12.0,fiber:6.5,yield:1.0,yt:'none',edible:1.0,methods:['—'],src:'USDA'},

  // ── Орехи ──
  {id:'walnut',name:'Грецкий орех',cat:'nut',state:'сухой',kcal:654,protein:15.0,fat:65.0,carbs:14.0,fiber:6.7,yield:1.0,yt:'none',edible:0.50,methods:['—'],src:'USDA'},
  {id:'almond',name:'Миндаль',cat:'nut',state:'сухой',kcal:579,protein:21.0,fat:50.0,carbs:22.0,fiber:12.0,yield:1.0,yt:'none',edible:0.60,methods:['—'],src:'USDA'},
  {id:'peanut',name:'Арахис',cat:'nut',state:'сухой',kcal:567,protein:26.0,fat:49.0,carbs:16.0,fiber:8.0,yield:1.0,yt:'none',edible:0.70,methods:['—'],src:'USDA'},
  {id:'cashew',name:'Кешью',cat:'nut',state:'сухой',kcal:553,protein:18.0,fat:44.0,carbs:30.0,fiber:3.3,yield:1.0,yt:'none',edible:0.65,methods:['—'],src:'USDA'},

  // ── Масла ──
  {id:'oil_sunflower',name:'Масло подсолнечное',cat:'oil',state:'готовое',kcal:899,protein:0,fat:99.9,carbs:0,fiber:0,yield:1.0,yt:'none',edible:1.0,methods:['Жарка','—'],src:'USDA'},
  {id:'oil_olive',name:'Масло оливковое',cat:'oil',state:'готовое',kcal:898,protein:0,fat:99.8,carbs:0,fiber:0,yield:1.0,yt:'none',edible:1.0,methods:['Жарка','—'],src:'USDA'},
  {id:'oil_coconut',name:'Масло кокосовое',cat:'oil',state:'готовое',kcal:892,protein:0,fat:99.0,carbs:0,fiber:0,yield:1.0,yt:'none',edible:1.0,methods:['Жарка','—'],src:'USDA'},

  // ── Сахар и сладости ──
  {id:'sugar',name:'Сахар',cat:'sweet',state:'готовый',kcal:387,protein:0,fat:0,carbs:99.8,fiber:0,yield:1.0,yt:'none',edible:1.0,methods:['—'],src:'USDA'},
  {id:'honey',name:'Мёд',cat:'sweet',state:'готовый',kcal:304,protein:0.3,fat:0,carbs:82.0,fiber:0.2,yield:1.0,yt:'none',edible:1.0,methods:['—'],src:'USDA'},
  {id:'chocolate_dark',name:'Шоколад тёмный',cat:'sweet',state:'готовый',kcal:546,protein:7.0,fat:31.0,carbs:61.0,fiber:7.0,yield:1.0,yt:'none',edible:1.0,methods:['—'],src:'USDA'},

  // ── Мука ──
  {id:'flour_wheat',name:'Мука пшеничная',cat:'flour',state:'сухая',kcal:334,protein:10.0,fat:1.0,carbs:73.0,fiber:2.7,yield:1.0,yt:'none',edible:1.0,methods:['Выпечка','Жарка'],src:'USDA'},
  {id:'flour_whole',name:'Мука цельнозерновая',cat:'flour',state:'сухая',kcal:340,protein:13.0,fat:2.5,carbs:71.0,fiber:11.0,yield:1.0,yt:'none',edible:1.0,methods:['Выпечка','Жарка'],src:'USDA'},

  // ── Другое ──
  {id:'water',name:'Вода',cat:'other',state:'готовая',kcal:0,protein:0,fat:0,carbs:0,fiber:0,yield:0.95,yt:'shrink',edible:1.0,methods:['Варка'],src:'—'},
  {id:'tomato_paste',name:'Томатная паста',cat:'other',state:'готовая',kcal:82,protein:4.5,fat:0.5,carbs:18.0,fiber:2.5,yield:1.0,yt:'none',edible:1.0,methods:['—'],src:'USDA'},
];

// Краткий справочник: синонимы названий → id продукта (для распознавания текста)
const PRODUCT_ALIASES = {
  'курица': 'chicken_breast', 'куриная грудка': 'chicken_breast', 'грудка': 'chicken_breast',
  'куриное бедро': 'chicken_thigh', 'бедро куриное': 'chicken_thigh',
  'индейка': 'turkey_breast',
  'говядина': 'beef', 'говяжий фарш': 'ground_beef', 'фарш': 'ground_beef',
  'свинина': 'pork_lean',
  'минтай': 'pollock', 'рыба': 'pollock',
  'лосось': 'salmon', 'семга': 'salmon', 'сёмга': 'salmon',
  'треска': 'cod',
  'креветки': 'shrimp', 'креветка': 'shrimp',
  'яйцо': 'egg', 'яйца': 'egg', 'яйца куриные': 'egg',
  'белок': 'egg_white', 'яичный белок': 'egg_white',
  'молоко': 'milk_32',
  'кефир': 'kefir',
  'йогурт': 'yogurt_natural',
  'сметана': 'sour_cream_15',
  'творог': 'cottage_5', 'творог 5': 'cottage_5', 'творог 9': 'cottage_9', 'творог 0': 'cottage_0',
  'масло сливочное': 'butter', 'сливочное масло': 'butter',
  'сыр': 'cheese_russian', 'моцарелла': 'cheese_mozzarella', 'фета': 'feta',
  'гречка': 'buckwheat', 'гречневая каша': 'buckwheat',
  'рис': 'rice_white', 'рис белый': 'rice_white', 'рис бурый': 'rice_brown',
  'овсянка': 'oats', 'геркулес': 'oats', 'овсянка геркулес': 'oats',
  'пшено': 'millet', 'пшёнка': 'millet',
  'киноа': 'quinoa',
  'манка': 'semolina', 'манная каша': 'semolina',
  'макароны': 'pasta', 'спагетти': 'spaghetti', 'вермишель': 'pasta', 'паста': 'pasta',
  'хлеб': 'bread_white', 'хлеб белый': 'bread_white', 'белый хлеб': 'bread_white',
  'хлеб цельнозерновой': 'bread_whole', 'цельнозерновой хлеб': 'bread_whole', 'чёрный хлеб': 'bread_whole',
  'тортилья': 'tortilla', 'лаваш': 'lavash', 'лепешка': 'tortilla', 'лепёшка': 'tortilla',
  'фасоль': 'beans_dry',
  'чечевица': 'lentils_dry', 'чечевичная': 'lentils_dry',
  'нут': 'chickpeas_dry',
  'картофель': 'potato', 'картошка': 'potato',
  'морковь': 'carrot', 'морковка': 'carrot',
  'лук': 'onion', 'лук репчатый': 'onion', 'луковица': 'onion',
  'помидор': 'tomato', 'томат': 'tomato', 'помидоры': 'tomato',
  'огурец': 'cucumber', 'огурцы': 'cucumber',
  'капуста': 'cabbage',
  'перец': 'pepper_sweet', 'болгарский перец': 'pepper_sweet', 'сладкий перец': 'pepper_sweet',
  'салат': 'lettuce', 'листовой салат': 'lettuce', 'зелень': 'lettuce',
  'свекла': 'beet', 'свёкла': 'beet',
  'брокколи': 'broccoli',
  'кабачок': 'zucchini', 'кабачки': 'zucchini',
  'баклажан': 'eggplant', 'баклажаны': 'eggplant',
  'шпинат': 'spinach',
  'зелёный лук': 'green_onion', 'зеленый лук': 'green_onion',
  'чеснок': 'garlic',
  'кукуруза': 'corn',
  'яблоко': 'apple', 'яблоки': 'apple',
  'банан': 'banana', 'бананы': 'banana',
  'груша': 'pear', 'груши': 'pear',
  'апельсин': 'orange',
  'авокадо': 'avocado',
  'клубника': 'strawberry',
  'голубика': 'blueberry',
  'малина': 'raspberry',
  'грецкий орех': 'walnut', 'орехи': 'walnut', 'грецкие орехи': 'walnut', 'орех': 'walnut',
  'миндаль': 'almond',
  'арахис': 'peanut', 'арахисовая паста': 'peanut',
  'кешью': 'cashew',
  'подсолнечное масло': 'oil_sunflower', 'масло': 'oil_sunflower', 'растительное масло': 'oil_sunflower', 'масло растительное': 'oil_sunflower',
  'оливковое масло': 'oil_olive', 'масло оливковое': 'oil_olive',
  'кокосовое масло': 'oil_coconut',
  'сахар': 'sugar',
  'мёд': 'honey', 'мед': 'honey', 'мед натуральный': 'honey',
  'шоколад': 'chocolate_dark', 'тёмный шоколад': 'chocolate_dark',
  'мука': 'flour_wheat', 'пшеничная мука': 'flour_wheat',
  'цельнозерновая мука': 'flour_whole', 'мука цельнозерновая': 'flour_whole',
  'вода': 'water',
  'томатная паста': 'tomato_paste',
};

// Типовые граммовки по умолчанию (г, в сыром/сухом виде) — для предложений
const DEFAULT_PORTION_GRAMS = {
  meat: 150, fish: 150, eggs: 50, dairy: 150, cheese: 30,
  grain: 70, pasta: 70, bread: 40, legume: 60,
  vegetable: 150, fruit: 150, berry: 100, nut: 30,
  oil: 10, sweet: 15, flour: 30, other: 100
};

// Получить продукт по id
function getProduct(id) {
  return PRODUCTS.find(p => p.id === id);
}
