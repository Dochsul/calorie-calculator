import pg from "pg";

const pool = new pg.Pool({
  connectionString:
    process.env.DATABASE_URL ||
    "postgres://aina:aina_dev_2026@localhost:5432/aina",
});

export async function initDb() {
  const client = await pool.connect();
  try {
    await client.query(`
      CREATE TABLE IF NOT EXISTS users (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        email TEXT UNIQUE NOT NULL,
        password_hash TEXT NOT NULL,
        name TEXT DEFAULT '',
        is_admin BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS user_state (
        user_id UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
        data JSONB NOT NULL DEFAULT '{}',
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS subscriptions (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        stripe_subscription_id TEXT,
        stripe_customer_id TEXT,
        plan_id TEXT NOT NULL,
        status TEXT NOT NULL DEFAULT 'inactive',
        current_period_start TIMESTAMPTZ,
        current_period_end TIMESTAMPTZ,
        cancel_at_period_end BOOLEAN DEFAULT FALSE,
        created_at TIMESTAMPTZ DEFAULT NOW(),
        updated_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS payments (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        user_id UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
        stripe_payment_intent_id TEXT,
        stripe_invoice_id TEXT,
        amount INTEGER NOT NULL,
        currency TEXT DEFAULT 'eur',
        status TEXT NOT NULL DEFAULT 'pending',
        plan_id TEXT,
        type TEXT DEFAULT 'subscription',
        created_at TIMESTAMPTZ DEFAULT NOW()
      );

      CREATE TABLE IF NOT EXISTS app_settings (
        key TEXT PRIMARY KEY,
        value JSONB NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_subscriptions_user ON subscriptions(user_id);
      CREATE INDEX IF NOT EXISTS idx_payments_user ON payments(user_id);
    `);

    // Дефолтные настройки тарифов
    await client.query(`
      INSERT INTO app_settings (key, value)
      VALUES ('plans', $1)
      ON CONFLICT (key) DO NOTHING
    `, [JSON.stringify([
      { id: "monthly", interval: "month", label: "1 месяц", price: 1290, displayPrice: "12.90", currency: "eur" },
      { id: "quarterly", interval: "3-month", label: "3 месяца", price: 3490, displayPrice: "34.90", currency: "eur" },
      { id: "yearly", interval: "year", label: "12 месяцев", price: 11990, displayPrice: "119.90", currency: "eur" },
    ])]);

    await client.query(`
      INSERT INTO app_settings (key, value)
      VALUES ('init_fee', $1)
      ON CONFLICT (key) DO NOTHING
    `, [JSON.stringify({ enabled: false, amount: 2990, displayAmount: "29.90", currency: "eur" })]);

    await client.query(`
      INSERT INTO app_settings (key, value)
      VALUES ('free_features', $1)
      ON CONFLICT (key) DO NOTHING
    `, [JSON.stringify({
      questionnaire: true,
      viewResults: true,
      pantry: false,
      menu: false,
      dishes: false,
      shopping: false,
      report: false,
      templates: false,
    })]);

    console.log("Database initialized");
  } finally {
    client.release();
  }
}

export { pool };
