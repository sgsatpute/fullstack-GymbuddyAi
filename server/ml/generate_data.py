import random
import pandas as pd

rows = []

for _ in range(3000):
    gym = random.choice([0, 1])
    goal = random.choice([0, 1])
    experience = random.choice([0, 1])
    time = random.choice([0, 1])

    # logical compatibility rule
    score = gym*0.35 + goal*0.3 + experience*0.2 + time*0.15
    label = 1 if score >= 0.6 else 0

    rows.append([gym, goal, experience, time, label])

df = pd.DataFrame(
    rows,
    columns=["gym", "goal", "experience", "time", "match"]
)

df.to_csv("training_data.csv", index=False)
print("✓ training_data.csv generated")
