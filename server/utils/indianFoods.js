const INDIAN_FOODS = [
  { key: "roti", name: "Roti / Chapati", servingSize: "1 pc", calories: 70, protein: 3, carbs: 15, fat: 0.4 },
  { key: "chapati", name: "Roti / Chapati", servingSize: "1 pc", calories: 70, protein: 3, carbs: 15, fat: 0.4 },
  { key: "dal", name: "Dal", servingSize: "1 cup", calories: 180, protein: 12, carbs: 24, fat: 4 },
  { key: "rice", name: "Rice", servingSize: "1 cup cooked", calories: 206, protein: 4, carbs: 45, fat: 0.4 },
  { key: "idli", name: "Idli", servingSize: "1 pc", calories: 39, protein: 2, carbs: 8, fat: 0.2 },
  { key: "dosa", name: "Dosa", servingSize: "1 pc", calories: 168, protein: 4, carbs: 30, fat: 3 },
  { key: "paneer", name: "Paneer", servingSize: "100 g", calories: 265, protein: 18, carbs: 6, fat: 20 },
  { key: "samosa", name: "Samosa", servingSize: "1 pc", calories: 130, protein: 3, carbs: 17, fat: 6 },
  { key: "chole", name: "Chole", servingSize: "1 cup", calories: 269, protein: 15, carbs: 35, fat: 8 },
  { key: "rajma", name: "Rajma", servingSize: "1 cup", calories: 225, protein: 15, carbs: 40, fat: 1 },
  { key: "poha", name: "Poha", servingSize: "1 cup", calories: 244, protein: 5, carbs: 38, fat: 8 },
  { key: "upma", name: "Upma", servingSize: "1 cup", calories: 177, protein: 4, carbs: 31, fat: 4 },
  { key: "paratha", name: "Paratha", servingSize: "1 pc", calories: 126, protein: 3, carbs: 18, fat: 5 },
  { key: "biryani", name: "Biryani", servingSize: "1 cup", calories: 290, protein: 10, carbs: 34, fat: 12 },
  { key: "chicken curry", name: "Chicken Curry", servingSize: "1 cup", calories: 240, protein: 25, carbs: 8, fat: 12 },
  { key: "egg", name: "Egg", servingSize: "1 whole", calories: 78, protein: 6, carbs: 0.6, fat: 5 },
  { key: "banana", name: "Banana", servingSize: "1 medium", calories: 105, protein: 1, carbs: 27, fat: 0.3 },
  { key: "apple", name: "Apple", servingSize: "1 medium", calories: 95, protein: 0.5, carbs: 25, fat: 0.3 },
  { key: "milk", name: "Milk", servingSize: "1 glass", calories: 150, protein: 8, carbs: 12, fat: 8 },
  { key: "curd", name: "Curd / Yogurt", servingSize: "1 cup", calories: 149, protein: 8, carbs: 11, fat: 8 },
  { key: "yogurt", name: "Curd / Yogurt", servingSize: "1 cup", calories: 149, protein: 8, carbs: 11, fat: 8 },
  { key: "lassi", name: "Lassi", servingSize: "1 glass", calories: 200, protein: 6, carbs: 28, fat: 7 },
  { key: "puri", name: "Puri", servingSize: "1 pc", calories: 100, protein: 2, carbs: 11, fat: 5 },
  { key: "pakora", name: "Pakora", servingSize: "3 pcs", calories: 150, protein: 4, carbs: 14, fat: 8 },
  { key: "halwa", name: "Halwa", servingSize: "1 cup", calories: 380, protein: 6, carbs: 60, fat: 12 },
  { key: "khichdi", name: "Khichdi", servingSize: "1 cup", calories: 190, protein: 7, carbs: 33, fat: 3 },
  { key: "sprouts", name: "Sprouts", servingSize: "1 cup", calories: 31, protein: 3, carbs: 6, fat: 0.2 },
];

function toSearchResult(food) {
  return {
    name: food.name,
    calories: food.calories,
    protein: food.protein,
    carbs: food.carbs,
    fat: food.fat,
    servingSize: food.servingSize,
    brand: "Indian staples",
    source: "indianFoods",
  };
}

export function findIndianFoods(query) {
  const search = String(query ?? "").trim().toLowerCase();
  if (!search) {
    return [];
  }

  return INDIAN_FOODS.filter((food) =>
    food.key.includes(search) || food.name.toLowerCase().includes(search)
  ).map(toSearchResult);
}

export function getIndianFoodsCatalog() {
  return INDIAN_FOODS.map(toSearchResult);
}
