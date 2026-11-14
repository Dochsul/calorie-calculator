import { useEffect, useState } from "react";
import { api } from "../api/client";

export default function Fridge() {
  const [items, setItems] = useState<any[]>([]);
  const [foods, setFoods] = useState<any[]>([]);
  const [categories, setCategories] = useState<string[]>([]);
  const [selectedCat, setSelectedCat] = useState("");
  const [search, setSearch] = useState("");
  const [selectedFood, setSelectedFood] = useState("");
  const [amount, setAmount] = useState("");
  const [unit, setUnit] = useState("г");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    api.getFridge().then(setItems).catch(() => {});
    api.getFoods().then((r) => {
      setFoods(r.foods);
      setCategories(r.categories);
    }).catch(() => {});
  }, []);

  const filteredFoods = foods.filter((f) => {
    if (search && !f.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (selectedCat && f.category !== selectedCat) return false;
    return true;
  });

  const addItem = async () => {
    if (!selectedFood || !amount) return;
    setLoading(true);
    try {
      const item = await api.addFridgeItem({ foodId: selectedFood, amount: parseFloat(amount), unit });
      setItems([item, ...items]);
      setSelectedFood("");
      setAmount("");
    } catch (err: any) {
      alert(err.message);
    } finally {
      setLoading(false);
    }
  };

  const deleteItem = async (id: string) => {
    try {
      await api.deleteFridgeItem(id);
      setItems(items.filter((i) => i.id !== id));
    } catch (err: any) {
      alert(err.message);
    }
  };

  const selectedFoodData = foods.find((f) => f.id === selectedFood);
  const availableUnits = selectedFoodData ? Object.keys(selectedFoodData.units) : ["г"];

  return (
    <div>
      <h1 className="page-title">🧊 Что у меня есть дома?</h1>
      <p style={{ color: "var(--muted)", marginBottom: 20 }}>
        Добавьте продукты, которые есть у вас дома. Меню будет учитывать их при подборе рецептов.
      </p>

      <div className="card">
        <h2>Добавить продукт</h2>
        <div className="form-group">
          <label>Поиск продукта</label>
          <input type="text" value={search} onChange={(e) => setSearch(e.target.value)} placeholder="Например: курица, гречка, творог…" />
        </div>
        {categories.length > 0 && (
          <div className="form-group">
            <label>Категория</label>
            <select value={selectedCat} onChange={(e) => setSelectedCat(e.target.value)}>
              <option value="">Все категории</option>
              {categories.map((c) => <option key={c} value={c}>{c}</option>)}
            </select>
          </div>
        )}
        <div className="form-group">
          <label>Продукт</label>
          <select value={selectedFood} onChange={(e) => {
            setSelectedFood(e.target.value);
            const f = foods.find((x) => x.id === e.target.value);
            if (f) { setUnit(Object.keys(f.units)[0]); }
          }}>
            <option value="">— выбрать —</option>
            {filteredFoods.map((f) => <option key={f.id} value={f.id}>{f.name} ({f.category})</option>)}
          </select>
        </div>
        <div className="form-row">
          <div className="form-group">
            <label>Количество</label>
            <input type="number" min="0" step="0.1" value={amount} onChange={(e) => setAmount(e.target.value)} placeholder="500" />
          </div>
          <div className="form-group">
            <label>Единица</label>
            <select value={unit} onChange={(e) => setUnit(e.target.value)}>
              {availableUnits.map((u) => <option key={u} value={u}>{u}</option>)}
            </select>
          </div>
        </div>
        <button className="btn primary" onClick={addItem} disabled={loading || !selectedFood || !amount}>
          {loading ? "Добавление…" : "Добавить в холодильник"}
        </button>
      </div>

      <div className="card">
        <h2>Мои продукты ({items.length})</h2>
        {items.length === 0 ? (
          <p style={{ color: "var(--muted)", fontStyle: "italic" }}>Холодильник пуст. Добавьте продукты выше.</p>
        ) : (
          <div>
            {items.map((item) => (
              <div key={item.id} className="fridge-item">
                <div className="info">
                  <div className="name">{item.food.name}</div>
                  <div className="cat">{item.food.category}</div>
                </div>
                <span className="amount">{item.amount} {item.unit}</span>
                <button className="del" onClick={() => deleteItem(item.id)}>✕</button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
