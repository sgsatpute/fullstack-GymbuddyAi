import json
import sys
from pathlib import Path

import joblib
import numpy as np
import pandas as pd

MODEL_DIR = Path(__file__).resolve().parent
MODEL_BUNDLE = joblib.load(MODEL_DIR / "coach_model.pkl")
PREPROCESSOR = joblib.load(MODEL_DIR / "preprocessor.pkl")

REQUIRED_KEYS = [
    "age",
    "goal",
    "experience",
    "days_available",
    "preferred_time",
    "bmi",
    "workout_history_weeks",
]

PLAN_DETAILS = {
    0: {
        "plan": "Beginner Full Body 3x/week",
        "weekly_schedule": {
            "monday": "Full body strength",
            "tuesday": "Walk and mobility",
            "wednesday": "Full body strength",
            "thursday": "Recovery",
            "friday": "Full body strength",
            "saturday": "Light cardio",
            "sunday": "Rest",
        },
        "key_exercises": ["Goblet squat", "DB bench press", "Lat pulldown", "Romanian deadlift"],
    },
    1: {
        "plan": "Intermediate Push Pull Legs",
        "weekly_schedule": {
            "monday": "Push",
            "tuesday": "Pull",
            "wednesday": "Legs",
            "thursday": "Recovery cardio",
            "friday": "Push",
            "saturday": "Pull or legs",
            "sunday": "Rest",
        },
        "key_exercises": ["Barbell bench", "Overhead press", "Pull-up", "Back squat"],
    },
    2: {
        "plan": "Advanced Powerlifting",
        "weekly_schedule": {
            "monday": "Heavy squat",
            "tuesday": "Bench volume",
            "wednesday": "Deadlift focus",
            "thursday": "Recovery",
            "friday": "Bench intensity",
            "saturday": "Squat accessories",
            "sunday": "Rest",
        },
        "key_exercises": ["Competition squat", "Paused bench", "Deadlift", "Front squat"],
    },
    3: {
        "plan": "Weight Loss HIIT Circuit",
        "weekly_schedule": {
            "monday": "HIIT circuit",
            "tuesday": "Walk",
            "wednesday": "Strength circuit",
            "thursday": "Low intensity cardio",
            "friday": "HIIT circuit",
            "saturday": "Core and steps",
            "sunday": "Rest",
        },
        "key_exercises": ["Bike sprints", "KB swings", "Push-ups", "Walking lunges"],
    },
    4: {
        "plan": "Endurance Running Program",
        "weekly_schedule": {
            "monday": "Easy run",
            "tuesday": "Intervals",
            "wednesday": "Recovery walk",
            "thursday": "Tempo run",
            "friday": "Mobility",
            "saturday": "Long run",
            "sunday": "Rest",
        },
        "key_exercises": ["Easy run", "Tempo run", "Hill sprint", "Single-leg strength"],
    },
    5: {
        "plan": "Flexibility Yoga Flow",
        "weekly_schedule": {
            "monday": "Hip opener flow",
            "tuesday": "Breathwork and stretch",
            "wednesday": "Full body yoga",
            "thursday": "Walk",
            "friday": "Back mobility",
            "saturday": "Core and balance",
            "sunday": "Rest",
        },
        "key_exercises": ["Sun salutations", "Pigeon pose", "Cat-cow", "Thoracic rotations"],
    },
    6: {
        "plan": "Muscle Gain Hypertrophy",
        "weekly_schedule": {
            "monday": "Upper hypertrophy",
            "tuesday": "Lower hypertrophy",
            "wednesday": "Recovery walk",
            "thursday": "Push volume",
            "friday": "Pull volume",
            "saturday": "Leg accessory day",
            "sunday": "Rest",
        },
        "key_exercises": ["Incline DB press", "Romanian deadlift", "Cable row", "Leg press"],
    },
    7: {
        "plan": "Beginner Cardio Mix",
        "weekly_schedule": {
            "monday": "Brisk walk",
            "tuesday": "Bike intervals",
            "wednesday": "Recovery",
            "thursday": "Rowing or jog",
            "friday": "Bodyweight circuit",
            "saturday": "Long walk",
            "sunday": "Rest",
        },
        "key_exercises": ["Brisk walk", "Bike", "Bodyweight squat", "Farmer carry"],
    },
    8: {
        "plan": "Intermediate Strength",
        "weekly_schedule": {
            "monday": "Upper strength",
            "tuesday": "Lower strength",
            "wednesday": "Recovery cardio",
            "thursday": "Upper volume",
            "friday": "Lower volume",
            "saturday": "Conditioning",
            "sunday": "Rest",
        },
        "key_exercises": ["Bench press", "Back squat", "Row", "Hip hinge"],
    },
    9: {
        "plan": "Advanced Athletic Performance",
        "weekly_schedule": {
            "monday": "Power and sprint",
            "tuesday": "Strength upper",
            "wednesday": "Mobility",
            "thursday": "Strength lower",
            "friday": "Plyometric conditioning",
            "saturday": "Tempo work",
            "sunday": "Rest",
        },
        "key_exercises": ["Power clean", "Trap bar jump", "Sprint", "Split squat"],
    },
    10: {
        "plan": "Senior Friendly Low Impact",
        "weekly_schedule": {
            "monday": "Low impact strength",
            "tuesday": "Walk",
            "wednesday": "Chair mobility",
            "thursday": "Band strength",
            "friday": "Balance work",
            "saturday": "Easy cardio",
            "sunday": "Rest",
        },
        "key_exercises": ["Chair squat", "Band row", "Step-up", "Supported carry"],
    },
    11: {
        "plan": "Calisthenics Bodyweight",
        "weekly_schedule": {
            "monday": "Push pattern",
            "tuesday": "Pull pattern",
            "wednesday": "Mobility",
            "thursday": "Leg pattern",
            "friday": "Core and skill",
            "saturday": "Conditioning",
            "sunday": "Rest",
        },
        "key_exercises": ["Push-up", "Inverted row", "Split squat", "Hollow hold"],
    },
}


def validate_input(payload):
    missing = [key for key in REQUIRED_KEYS if key not in payload]
    if missing:
        raise ValueError(f"Missing required fields: {', '.join(missing)}")

    validated = {
        "age": int(payload["age"]),
        "goal": int(payload["goal"]),
        "experience": int(payload["experience"]),
        "days_available": int(payload["days_available"]),
        "preferred_time": int(payload["preferred_time"]),
        "bmi": float(payload["bmi"]),
        "workout_history_weeks": int(payload["workout_history_weeks"]),
    }

    if not 18 <= validated["age"] <= 55:
        raise ValueError("age must be between 18 and 55")
    if validated["goal"] not in range(0, 4):
        raise ValueError("goal must be between 0 and 3")
    if validated["experience"] not in range(0, 3):
        raise ValueError("experience must be between 0 and 2")
    if not 1 <= validated["days_available"] <= 7:
        raise ValueError("days_available must be between 1 and 7")
    if validated["preferred_time"] not in range(0, 3):
        raise ValueError("preferred_time must be between 0 and 2")
    if not 16 <= validated["bmi"] <= 40:
        raise ValueError("bmi must be between 16 and 40")
    if not 0 <= validated["workout_history_weeks"] <= 104:
        raise ValueError("workout_history_weeks must be between 0 and 104")

    return validated


def main():
    if len(sys.argv) < 2:
        raise ValueError("Expected JSON payload as the first argument")

    payload = validate_input(json.loads(sys.argv[1]))
    frame = pd.DataFrame([payload])
    transformed = PREPROCESSOR.transform(frame)

    classifier = MODEL_BUNDLE["classifier"]
    probabilities = classifier.predict_proba(transformed)[0]
    predicted_plan = int(np.argmax(probabilities))
    confidence = float(probabilities[predicted_plan])

    ranked = np.argsort(probabilities)[::-1]
    alternatives = []
    for plan_id in ranked:
        if int(plan_id) == predicted_plan:
            continue
        alternatives.append(
            {
                "plan": PLAN_DETAILS[int(plan_id)]["plan"],
                "confidence": round(float(probabilities[int(plan_id)]), 4),
            }
        )
        if len(alternatives) == 2:
            break

    plan_details = PLAN_DETAILS[predicted_plan]
    response = {
        "recommended_plan": plan_details["plan"],
        "confidence": round(confidence, 4),
        "plan_id": predicted_plan,
        "alternative_plans": alternatives,
        "weekly_schedule": plan_details["weekly_schedule"],
        "key_exercises": plan_details["key_exercises"],
        "reasoning": (
            f"This plan fits a {MODEL_BUNDLE['goals'][payload['goal']]} goal, "
            f"{MODEL_BUNDLE['experience'][payload['experience']]} experience, "
            f"{payload['days_available']} available days, and {payload['workout_history_weeks']} weeks of training history."
        ),
    }
    print(json.dumps(response))


if __name__ == "__main__":
    main()
