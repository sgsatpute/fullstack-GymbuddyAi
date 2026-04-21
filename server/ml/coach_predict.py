import sys, json, joblib

model = joblib.load("coach_model.pkl")

features = json.loads(sys.argv[1])
pred = model.predict([features])[0]

print(pred)
import sys, json, joblib

model = joblib.load("coach_model.pkl")

features = json.loads(sys.argv[1])
pred = model.predict([features])[0]

print(pred)
