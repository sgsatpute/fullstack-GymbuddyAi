import pandas as pd
from sklearn.linear_model import LogisticRegression
from sklearn.model_selection import train_test_split
from sklearn.metrics import accuracy_score, classification_report
import sqlite3
import joblib
import os

# =========================
# LOAD SYNTHETIC DATA
# =========================
df_synth = pd.read_csv("training_data.csv")

# =========================
# LOAD REAL USER FEEDBACK
# =========================
db_path = "../gymbuddy.db"
if os.path.exists(db_path):
    conn = sqlite3.connect(db_path)

    query = """
    SELECT
      (u1.gym = u2.gym) AS gym,
      (u1.goal = u2.goal) AS goal,
      (u1.experience = u2.experience) AS experience,
      (u1.preferredTime = u2.preferredTime) AS time,
      f.label AS match
    FROM match_feedback f
    JOIN users u1 ON u1.id = f.userA
    JOIN users u2 ON u2.id = f.userB
    """

    try:
        df_real = pd.read_sql(query, conn)
        if len(df_real) >= 20:
            df = pd.concat([df_synth, df_real])
        else:
            df = df_synth
    except:
        df = df_synth
else:
    df = df_synth

# =========================
# TRAIN MODEL
# =========================
X = df[["gym", "goal", "experience", "time"]]
y = df["match"]

X_train, X_test, y_train, y_test = train_test_split(
    X, y, test_size=0.2, random_state=42
)

model = LogisticRegression()
model.fit(X_train, y_train)

# =========================
# EVALUATION
# =========================
preds = model.predict(X_test)
acc = accuracy_score(y_test, preds)
report = classification_report(y_test, preds)

# =========================
# SAVE ARTIFACTS
# =========================
joblib.dump(model, "model.pkl")

with open("metrics.txt", "w") as f:
    f.write(f"Accuracy: {acc}\n\n")
    f.write(report)

print("✓ Model trained")
print("Accuracy:", acc)
