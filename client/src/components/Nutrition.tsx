import { ChangeEvent, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { apiFetch } from "../utils/api";
import {
  formatCalories,
  formatDateTime,
  formatGrams,
  formatMealType,
  formatShortDate,
} from "../utils/display";
import {
  FoodImageAnalysisResponse,
  NutritionOverview,
} from "../utils/models";

function getTodayDate() {
  return new Date().toISOString().slice(0, 10);
}

type MealFormState = {
  mealDate: string;
  mealType: string;
  title: string;
  calories: string;
  proteinGrams: string;
  carbsGrams: string;
  fatGrams: string;
  fiberGrams: string;
  notes: string;
  imageUrl: string;
  source: string;
};

const defaultMealForm = (): MealFormState => ({
  mealDate: getTodayDate(),
  mealType: "breakfast",
  title: "",
  calories: "",
  proteinGrams: "",
  carbsGrams: "",
  fatGrams: "",
  fiberGrams: "",
  notes: "",
  imageUrl: "",
  source: "manual",
});

export default function Nutrition() {
  const navigate = useNavigate();
  const [selectedDate, setSelectedDate] = useState(getTodayDate());
  const [overview, setOverview] = useState<NutritionOverview | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);
  const [analyzing, setAnalyzing] = useState(false);
  const [analysis, setAnalysis] = useState<FoodImageAnalysisResponse | null>(null);
  const [mealHint, setMealHint] = useState("");
  const [foodImage, setFoodImage] = useState<File | null>(null);
  const [form, setForm] = useState<MealFormState>(defaultMealForm);

  useEffect(() => {
    loadNutrition(selectedDate).catch(() => {});
  }, [selectedDate]);

  async function loadNutrition(date: string) {
    setLoading(true);
    setError("");

    try {
      const response = await apiFetch(`/api/nutrition?date=${encodeURIComponent(date)}`);
      const data = (await response.json()) as NutritionOverview;

      if (!response.ok) {
        setError("Could not load your nutrition tracker right now.");
        return;
      }

      setOverview(data);
      setForm((current) => ({
        ...current,
        mealDate: date,
      }));
    } catch {
      setError("Could not load your nutrition tracker right now.");
    } finally {
      setLoading(false);
    }
  }

  function updateForm<K extends keyof MealFormState>(key: K, value: MealFormState[K]) {
    setForm((current) => ({
      ...current,
      [key]: value,
    }));
  }

  function resetForm() {
    setForm({
      ...defaultMealForm(),
      mealDate: selectedDate,
    });
    setAnalysis(null);
    setFoodImage(null);
    setMealHint("");
  }

  async function handleAnalyzeImage() {
    if (!foodImage || analyzing) {
      return;
    }

    setAnalyzing(true);
    setError("");

    try {
      const formData = new FormData();
      formData.append("food", foodImage);
      if (mealHint.trim()) {
        formData.append("mealHint", mealHint.trim());
      }

      const response = await apiFetch("/api/nutrition/analyze-image", {
        method: "POST",
        body: formData,
      });
      const data = (await response.json()) as FoodImageAnalysisResponse & { error?: string };

      if (!response.ok) {
        setError(data.error || "Could not analyze this meal photo.");
        return;
      }

      setAnalysis(data);
    } catch {
      setError("Could not analyze this meal photo.");
    } finally {
      setAnalyzing(false);
    }
  }

  function useAiEstimate() {
    if (!analysis) {
      return;
    }

    updateForm("mealType", analysis.estimate.mealType);
    updateForm("title", analysis.estimate.title);
    updateForm("calories", String(analysis.estimate.calories || ""));
    updateForm("proteinGrams", String(analysis.estimate.proteinGrams || ""));
    updateForm("carbsGrams", String(analysis.estimate.carbsGrams || ""));
    updateForm("fatGrams", String(analysis.estimate.fatGrams || ""));
    updateForm("fiberGrams", String(analysis.estimate.fiberGrams || ""));
    updateForm("notes", analysis.estimate.notes);
    updateForm("imageUrl", analysis.imageUrl);
    updateForm("source", analysis.aiUsed ? "ai-photo" : "photo");
  }

  async function handleSaveMeal() {
    if (saving) {
      return;
    }

    setSaving(true);
    setError("");

    try {
      const response = await apiFetch("/api/nutrition", {
        method: "POST",
        body: JSON.stringify({
          mealDate: form.mealDate,
          mealType: form.mealType,
          title: form.title,
          calories: Number(form.calories),
          proteinGrams: Number(form.proteinGrams),
          carbsGrams: Number(form.carbsGrams),
          fatGrams: Number(form.fatGrams),
          fiberGrams: Number(form.fiberGrams),
          notes: form.notes,
          imageUrl: form.imageUrl || null,
          source: form.source,
        }),
      });
      const data = (await response.json()) as NutritionOverview & { error?: string };

      if (!response.ok) {
        setError(data.error || "Could not save this meal.");
        return;
      }

      setOverview({
        date: data.date,
        summary: data.summary,
        meals: data.meals,
        history: data.history,
      });
      resetForm();
    } catch {
      setError("Could not save this meal.");
    } finally {
      setSaving(false);
    }
  }

  function handleImageChange(event: ChangeEvent<HTMLInputElement>) {
    setFoodImage(event.target.files?.[0] ?? null);
  }

  if (loading && !overview) {
    return <div className="page-section">Loading your nutrition tracker...</div>;
  }

  const summary = overview?.summary;
  const meals = overview?.meals ?? [];
  const history = overview?.history ?? [];

  return (
    <div className="page-stack nutrition-experience">
      <section className="hero-panel nutrition-hero">
        <div>
          <span className="eyebrow">Nutrition</span>
          <h1>Track calories, macros, and photo-based meal estimates.</h1>
          <p>
            Keep protein, calories, and meal timing close enough to your goal that training actually gets supported.
          </p>
        </div>

        <div className="action-row">
          <label className="field">
            <span className="tiny-muted">Tracking date</span>
            <input
              type="date"
              value={selectedDate}
              onChange={(event) => setSelectedDate(event.target.value)}
            />
          </label>
          <button className="btn btn-secondary" onClick={() => navigate("/coach")}>
            Open Coach
          </button>
        </div>
      </section>

      {error && <div className="feedback error">{error}</div>}

      {summary && (
        <>
          <section className="stats-grid">
            <div className="card stat-card">
              <span className="eyebrow">Calories</span>
              <strong>{formatCalories(summary.totals.calories)}</strong>
              <p>{formatCalories(summary.progress.calories.remaining)} remaining</p>
              <div className="progress">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.min(summary.progress.calories.progressPercent, 100)}%` }}
                />
              </div>
            </div>
            <div className="card stat-card">
              <span className="eyebrow">Protein</span>
              <strong>{formatGrams(summary.totals.proteinGrams)}</strong>
              <p>{formatGrams(summary.progress.proteinGrams.remaining)} remaining</p>
              <div className="progress">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.min(summary.progress.proteinGrams.progressPercent, 100)}%` }}
                />
              </div>
            </div>
            <div className="card stat-card">
              <span className="eyebrow">Carbs</span>
              <strong>{formatGrams(summary.totals.carbsGrams)}</strong>
              <p>{formatGrams(summary.progress.carbsGrams.remaining)} remaining</p>
              <div className="progress">
                <div
                  className="progress-fill"
                  style={{ width: `${Math.min(summary.progress.carbsGrams.progressPercent, 100)}%` }}
                />
              </div>
            </div>
            <div className="card stat-card">
              <span className="eyebrow">Macro balance</span>
              <strong>{summary.macroBalanceScore}/100</strong>
              <p>{summary.mealCount} meals logged today</p>
              <div className="progress">
                <div
                  className="progress-fill"
                  style={{ width: `${summary.macroBalanceScore}%` }}
                />
              </div>
            </div>
          </section>

          <section className="card">
            <div className="section-head">
              <div>
                <span className="eyebrow">Coach note</span>
                <h2>How today&apos;s food is supporting training</h2>
              </div>
              <div className="chip-row">
                <span className="chip">Target {formatCalories(summary.targets.calories)}</span>
                <span className="chip">Protein {formatGrams(summary.targets.proteinGrams)}</span>
                <span className="chip">Fiber {formatGrams(summary.targets.fiberGrams)}</span>
              </div>
            </div>
            <p>{summary.coachHeadline}</p>
          </section>
        </>
      )}

      <section className="two-column">
        <div className="card form-card">
          <div>
            <span className="eyebrow">AI food photo</span>
            <h2>Upload a meal image for a macro estimate</h2>
            <p className="muted">
              Best results come from a clear single-plate photo and a short hint about what is in the meal.
            </p>
          </div>

          <label className="field">
            <span>Meal hint</span>
            <input
              placeholder="Chicken rice bowl with yogurt"
              value={mealHint}
              onChange={(event) => setMealHint(event.target.value)}
            />
          </label>

          <label className="btn btn-secondary file-button">
            {foodImage ? foodImage.name : "Choose Food Photo"}
            <input type="file" accept="image/*" onChange={handleImageChange} />
          </label>

          <button
            className="btn btn-primary"
            onClick={handleAnalyzeImage}
            disabled={!foodImage || analyzing}
          >
            {analyzing ? "Analyzing..." : "Analyze Meal Photo"}
          </button>

          {analysis && (
            <div className={`feedback ${analysis.aiUsed ? "success" : ""}`}>
              <strong>{analysis.estimate.title}</strong>
              <p>{analysis.estimate.notes}</p>
              <div className="chip-row">
                <span className="chip">{formatMealType(analysis.estimate.mealType)}</span>
                <span className="chip">{formatCalories(analysis.estimate.calories)}</span>
                <span className="chip">{formatGrams(analysis.estimate.proteinGrams)} protein</span>
                <span className="chip">{formatGrams(analysis.estimate.carbsGrams)} carbs</span>
                <span className="chip">{formatGrams(analysis.estimate.fatGrams)} fat</span>
              </div>
              <button className="btn btn-secondary" onClick={useAiEstimate}>
                Use This Estimate
              </button>
            </div>
          )}
        </div>

        <div className="card form-card">
          <div>
            <span className="eyebrow">Meal log</span>
            <h2>Save the meal and keep your day honest</h2>
          </div>

          <div className="form-grid two-up">
            <label className="field">
              <span>Date</span>
              <input
                type="date"
                value={form.mealDate}
                onChange={(event) => updateForm("mealDate", event.target.value)}
              />
            </label>

            <label className="field">
              <span>Meal type</span>
              <select
                value={form.mealType}
                onChange={(event) => updateForm("mealType", event.target.value)}
              >
                <option value="breakfast">Breakfast</option>
                <option value="lunch">Lunch</option>
                <option value="dinner">Dinner</option>
                <option value="snack">Snack</option>
                <option value="preworkout">Pre-Workout</option>
                <option value="postworkout">Post-Workout</option>
              </select>
            </label>

            <label className="field field-full">
              <span>Meal title</span>
              <input
                placeholder="Paneer wrap with fruit"
                value={form.title}
                onChange={(event) => updateForm("title", event.target.value)}
              />
            </label>

            <label className="field">
              <span>Calories</span>
              <input
                type="number"
                min={0}
                value={form.calories}
                onChange={(event) => updateForm("calories", event.target.value)}
              />
            </label>

            <label className="field">
              <span>Protein (g)</span>
              <input
                type="number"
                min={0}
                value={form.proteinGrams}
                onChange={(event) => updateForm("proteinGrams", event.target.value)}
              />
            </label>

            <label className="field">
              <span>Carbs (g)</span>
              <input
                type="number"
                min={0}
                value={form.carbsGrams}
                onChange={(event) => updateForm("carbsGrams", event.target.value)}
              />
            </label>

            <label className="field">
              <span>Fat (g)</span>
              <input
                type="number"
                min={0}
                value={form.fatGrams}
                onChange={(event) => updateForm("fatGrams", event.target.value)}
              />
            </label>

            <label className="field">
              <span>Fiber (g)</span>
              <input
                type="number"
                min={0}
                value={form.fiberGrams}
                onChange={(event) => updateForm("fiberGrams", event.target.value)}
              />
            </label>

            <label className="field field-full">
              <span>Notes</span>
              <textarea
                rows={4}
                placeholder="Pre-leg-day meal, felt light and easy to digest."
                value={form.notes}
                onChange={(event) => updateForm("notes", event.target.value)}
              />
            </label>
          </div>

          <div className="action-row">
            <button className="btn btn-primary" onClick={handleSaveMeal} disabled={saving}>
              {saving ? "Saving..." : "Log Meal"}
            </button>
            <button className="btn btn-secondary" onClick={resetForm}>
              Reset
            </button>
          </div>
        </div>
      </section>

      <section className="two-column">
        <div className="card">
          <div className="section-head">
            <div>
              <span className="eyebrow">Today&apos;s meals</span>
              <h2>What you have logged so far</h2>
            </div>
            <span className="chip">{meals.length} entries</span>
          </div>

          {meals.length === 0 ? (
            <div className="feedback">
              Start with one meal entry. Once food gets visible, the day gets easier to steer.
            </div>
          ) : (
            <div className="achievement-list">
              {meals.map((meal) => (
                <article key={meal.id} className="achievement-item">
                  <div>
                    <strong>{meal.title}</strong>
                    <p>
                      {formatMealType(meal.mealType)} · {formatCalories(meal.calories)} · {formatGrams(meal.proteinGrams)} protein
                    </p>
                    <p className="muted">{meal.notes || "No notes added."}</p>
                    {meal.imageUrl && (
                      <a
                        href={meal.imageUrl}
                        target="_blank"
                        rel="noreferrer"
                        className="tiny-muted"
                      >
                        View photo
                      </a>
                    )}
                  </div>
                  <span className="muted">{formatDateTime(meal.createdAt)}</span>
                </article>
              ))}
            </div>
          )}
        </div>

        <div className="card">
          <div className="section-head">
            <div>
              <span className="eyebrow">7-day trend</span>
              <h2>Recent nutrition consistency</h2>
            </div>
          </div>

          {history.length === 0 ? (
            <div className="feedback">
              The trend view will start filling in as soon as you log meals across a few days.
            </div>
          ) : (
            <div className="achievement-list">
              {history.map((day) => (
                <article key={day.mealDate} className="achievement-item">
                  <div>
                    <strong>{formatShortDate(day.mealDate)}</strong>
                    <p>
                      {formatCalories(day.calories)} · {formatGrams(day.proteinGrams)} protein · {day.mealCount} meals
                    </p>
                  </div>
                  <span className="muted">{formatGrams(day.carbsGrams)} carbs</span>
                </article>
              ))}
            </div>
          )}
        </div>
      </section>
    </div>
  );
}
