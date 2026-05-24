import json
from pathlib import Path

import joblib
import numpy as np
import pandas as pd
from sklearn.compose import ColumnTransformer
from sklearn.ensemble import RandomForestClassifier
from sklearn.metrics import accuracy_score, classification_report, confusion_matrix
from sklearn.model_selection import cross_val_score, train_test_split
from sklearn.pipeline import Pipeline
from sklearn.preprocessing import OneHotEncoder, StandardScaler

RANDOM_STATE = 42
SAMPLES = 1000
OUTPUT_DIR = Path(__file__).resolve().parent

PLAN_METADATA = {
    0: {"name": "Beginner Full Body 3x/week", "focus": "foundations"},
    1: {"name": "Intermediate Push Pull Legs", "focus": "strength split"},
    2: {"name": "Advanced Powerlifting", "focus": "max strength"},
    3: {"name": "Weight Loss HIIT Circuit", "focus": "fat loss"},
    4: {"name": "Endurance Running Program", "focus": "aerobic base"},
    5: {"name": "Flexibility Yoga Flow", "focus": "mobility"},
    6: {"name": "Muscle Gain Hypertrophy", "focus": "muscle gain"},
    7: {"name": "Beginner Cardio Mix", "focus": "conditioning"},
    8: {"name": "Intermediate Strength", "focus": "balanced strength"},
    9: {"name": "Advanced Athletic Performance", "focus": "power and speed"},
    10: {"name": "Senior Friendly Low Impact", "focus": "joint-friendly"},
    11: {"name": "Calisthenics Bodyweight", "focus": "bodyweight control"},
}

GOALS = {0: "muscle", 1: "weight_loss", 2: "endurance", 3: "flexibility"}
EXPERIENCE = {0: "beginner", 1: "intermediate", 2: "advanced"}
TIMES = {0: "morning", 1: "afternoon", 2: "evening"}


def choose_plan(sample):
    age = sample["age"]
    goal = sample["goal"]
    experience = sample["experience"]
    days = sample["days_available"]
    bmi = sample["bmi"]
    history = sample["workout_history_weeks"]

    if age >= 50 and bmi >= 30:
        return 10
    if goal == 3:
        return 5 if experience < 2 else 11
    if goal == 2:
        if experience == 0:
            return 7
        if experience == 1:
            return 4 if days >= 4 else 8
        return 9 if days >= 5 else 4
    if goal == 1:
        if experience == 0:
            return 7 if bmi < 24 else 3
        if experience == 1:
            return 3 if bmi >= 25 else 8
        return 9 if history >= 52 else 3

    if experience == 0:
        return 0 if days <= 4 else 6
    if experience == 1:
        if days >= 5 and history >= 26:
            return 1
        return 6 if bmi < 28 else 8
    if days >= 5 and history >= 78:
        return 2
    return 9 if days >= 4 else 6


def generate_training_samples(sample_count=SAMPLES):
    rng = np.random.default_rng(RANDOM_STATE)
    rows = []

    for _ in range(sample_count):
        experience = int(rng.choice([0, 1, 2], p=[0.38, 0.42, 0.20]))
        goal = int(rng.choice([0, 1, 2, 3], p=[0.35, 0.32, 0.2, 0.13]))
        age = int(rng.integers(18, 56))
        days_available = int(rng.integers(1, 8))
        preferred_time = int(rng.integers(0, 3))
        bmi = float(np.round(rng.uniform(16, 40), 1))
        workout_history_weeks = int(rng.integers(0, 105))

        if experience == 0:
            workout_history_weeks = min(workout_history_weeks, int(rng.integers(0, 20)))
        elif experience == 1:
            workout_history_weeks = max(8, min(workout_history_weeks, int(rng.integers(12, 70))))
        else:
            workout_history_weeks = max(24, workout_history_weeks)

        sample = {
            "age": age,
            "goal": goal,
            "experience": experience,
            "days_available": days_available,
            "preferred_time": preferred_time,
            "bmi": bmi,
            "workout_history_weeks": workout_history_weeks,
        }
        sample["plan_id"] = choose_plan(sample)
        rows.append(sample)

    return pd.DataFrame(rows)


def build_preprocessor():
    numeric_features = ["age", "days_available", "bmi", "workout_history_weeks"]
    categorical_features = ["goal", "experience", "preferred_time"]

    return ColumnTransformer(
        transformers=[
            ("num", StandardScaler(), numeric_features),
            ("cat", OneHotEncoder(handle_unknown="ignore"), categorical_features),
        ]
    )


def build_feature_importance(preprocessor, classifier):
    feature_names = preprocessor.get_feature_names_out()
    pairs = sorted(
        zip(feature_names, classifier.feature_importances_),
        key=lambda item: item[1],
        reverse=True,
    )
    return [{"feature": name, "importance": float(round(score, 6))} for name, score in pairs]


def train():
    data = generate_training_samples()
    numeric_features = ["age", "days_available", "bmi", "workout_history_weeks"]
    categorical_features = ["goal", "experience", "preferred_time"]
    features = numeric_features + categorical_features

    X = data[features]
    y = data["plan_id"]

    preprocessor = build_preprocessor()
    classifier = RandomForestClassifier(
        n_estimators=100,
        max_depth=10,
        random_state=RANDOM_STATE,
    )

    X_train, X_test, y_train, y_test = train_test_split(
        X,
        y,
        test_size=0.2,
        random_state=RANDOM_STATE,
        stratify=y,
    )

    X_train_processed = preprocessor.fit_transform(X_train)
    X_test_processed = preprocessor.transform(X_test)
    classifier.fit(X_train_processed, y_train)

    predictions = classifier.predict(X_test_processed)
    accuracy = accuracy_score(y_test, predictions)
    report = classification_report(
        y_test,
        predictions,
        target_names=[PLAN_METADATA[idx]["name"] for idx in sorted(PLAN_METADATA)],
        zero_division=0,
    )
    conf_matrix = confusion_matrix(y_test, predictions).tolist()

    pipeline = Pipeline(
        steps=[
            ("preprocessor", build_preprocessor()),
            (
                "classifier",
                RandomForestClassifier(
                    n_estimators=100,
                    max_depth=10,
                    random_state=RANDOM_STATE,
                ),
            ),
        ]
    )
    cv_scores = cross_val_score(pipeline, X, y, cv=5)
    feature_importance = build_feature_importance(preprocessor, classifier)

    joblib.dump(
        {
            "classifier": classifier,
            "plan_metadata": PLAN_METADATA,
            "goals": GOALS,
            "experience": EXPERIENCE,
            "times": TIMES,
        },
        OUTPUT_DIR / "coach_model.pkl",
    )
    joblib.dump(preprocessor, OUTPUT_DIR / "preprocessor.pkl")
    data.to_csv(OUTPUT_DIR / "coach_training_data.csv", index=False)

    metrics_payload = {
        "model": "RandomForestClassifier",
        "samples": int(len(data)),
        "accuracy": float(round(accuracy, 6)),
        "cross_val_score": float(round(float(cv_scores.mean()), 6)),
        "feature_importances": feature_importance,
    }
    with open(OUTPUT_DIR / "metrics.txt", "w", encoding="utf-8") as handle:
        handle.write(json.dumps(metrics_payload, indent=2))

    print("=" * 72)
    print("GYMBUDDY AI COACH MODEL TRAINING")
    print("=" * 72)
    print(f"Samples: {len(data)}")
    print(f"Train/Test Split: 80/20")
    print(f"Accuracy: {accuracy:.4f}")
    print(f"5-Fold Cross-Validation: {cv_scores.mean():.4f} ± {cv_scores.std():.4f}")
    print("\nClassification Report")
    print(report)
    print("Confusion Matrix")
    print(np.array(conf_matrix))
    print("\nFeature Importance Ranking")
    for item in feature_importance[:12]:
        print(f"- {item['feature']}: {item['importance']:.6f}")
    print("\nSaved:")
    print(f"- {OUTPUT_DIR / 'coach_model.pkl'}")
    print(f"- {OUTPUT_DIR / 'preprocessor.pkl'}")
    print(f"- {OUTPUT_DIR / 'metrics.txt'}")


if __name__ == "__main__":
    train()
