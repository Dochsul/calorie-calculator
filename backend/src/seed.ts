// Сид-скрипт: заполняет базу продуктов, рецептов, тарифов и админа.
import prisma from "./lib/prisma.js";
import bcrypt from "bcryptjs";
import { FOODS } from "./data/foods.js";
import { RECIPES } from "./data/recipes.js";

async function main() {
  console.log("🌱 Начало сидинга...");

  // 1. Продукты
  console.log("  → Продукты...");
  for (const f of FOODS) {
    await prisma.food.upsert({
      where: { id: f.id },
      create: {
        id: f.id,
        name: f.name,
        category: f.category,
        kcal: f.kcal,
        protein: f.protein,
        fat: f.fat,
        carbs: f.carbs,
        yield: f.yield,
        tags: f.tags,
        units: f.units,
      },
      update: {
        name: f.name,
        category: f.category,
        kcal: f.kcal,
        protein: f.protein,
        fat: f.fat,
        carbs: f.carbs,
        yield: f.yield,
        tags: f.tags,
        units: f.units,
      },
    });
  }
  console.log(`    ✓ ${FOODS.length} продуктов`);

  // 2. Рецепты
  console.log("  → Рецепты...");
  for (const r of RECIPES) {
    await prisma.recipe.create({
      data: {
        name: r.name,
        mealType: r.mealType,
        prepTime: r.prepTime,
        cookTime: r.cookTime,
        difficulty: r.difficulty,
        servings: r.servings,
        steps: r.steps,
        ingredients: r.ingredients,
        tags: r.tags,
      },
    }).catch(() => {}); // пропускаем дубликаты
  }
  console.log(`    ✓ ${RECIPES.length} рецептов`);

  // 3. Тарифные планы
  console.log("  → Тарифы...");
  const plans = [
    { code: "monthly", name: "Месячный", priceCents: 1290, currency: "eur", interval: "month", durationDays: 30 },
    { code: "quarterly", name: "Квартальный", priceCents: 3490, currency: "eur", interval: "quarter", durationDays: 90 },
    { code: "yearly", name: "Годовой", priceCents: 11990, currency: "eur", interval: "year", durationDays: 365 },
  ];
  for (const p of plans) {
    await prisma.subscriptionPlan.upsert({
      where: { code: p.code },
      create: p,
      update: { priceCents: p.priceCents, name: p.name },
    });
  }
  console.log(`    ✓ ${plans.length} тарифов`);

  // 4. Админ-пользователь
  console.log("  → Админ...");
  const adminEmail = process.env.ADMIN_EMAIL || "admin@aina-evidence.com";
  const adminPassword = process.env.ADMIN_PASSWORD || "admin123456";
  const existingAdmin = await prisma.user.findUnique({ where: { email: adminEmail } });
  if (!existingAdmin) {
    const passwordHash = await bcrypt.hash(adminPassword, 10);
    await prisma.user.create({
      data: { email: adminEmail, passwordHash, name: "Администратор", role: "admin" },
    });
    console.log(`    ✓ Админ создан: ${adminEmail} (пароль: ${adminPassword})`);
  } else {
    console.log("    ✓ Админ уже существует");
  }

  console.log("✅ Сидинг завершён!");
}

main()
  .catch((e) => {
    console.error("Сидинг error:", e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
