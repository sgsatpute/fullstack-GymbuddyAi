import pandas as pd
from sklearn.ensemble import RandomForestClassifier
import joblib

df = pd.read_csv("coach_training_data.csv")

# Encode
goal_map = {"muscle":0, "fatloss":1, "fitness":2}
eng_map = {"low":0, "medium":1, "high":2}

df["goal"] = df["goal"].map(goal_map)
df["engagement"] = df["engagement"].map(eng_map)

X = df[["streak","consistency","goal","engagement"]]
y = df["action"]

model = RandomForestClassifier(n_estimators=50, random_state=42)
model.fit(X, y)

joblib.dump(model, "coach_model.pkl")
print("✅ Coach model trained")
