import json
import sys

import joblib


model = joblib.load("coach_model.pkl")

features = json.loads(sys.argv[1])
prediction = model.predict([features])[0]

print(prediction)
