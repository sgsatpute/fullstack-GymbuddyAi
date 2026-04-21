import joblib
import sys
import json

model = joblib.load("model.pkl")

features = json.loads(sys.argv[1])
probability = model.predict_proba([features])[0][1]

print(probability)
