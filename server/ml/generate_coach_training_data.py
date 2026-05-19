import csv
import random


actions = ["train_hard", "train_light", "cardio", "walk", "mobility", "rest"]
goals = ["muscle", "fatloss", "fitness"]

rows = []
for _ in range(500):
    streak = random.randint(0, 30)
    consistency = random.randint(0, 100)
    goal = random.choice(goals)
    engagement = "high" if streak >= 5 else "medium" if streak >= 2 else "low"

    if engagement == "high" and consistency > 70:
        action = random.choice(["train_hard", "train_hard", "cardio"])
    elif engagement == "medium":
        action = random.choice(["train_light", "cardio", "walk"])
    else:
        action = random.choice(["mobility", "rest", "walk"])

    rows.append([streak, consistency, goal, engagement, action])

with open("coach_training_data.csv", "w", newline="") as output_file:
    writer = csv.writer(output_file)
    writer.writerow(["streak", "consistency", "goal", "engagement", "action"])
    writer.writerows(rows)

print("Generated coach_training_data.csv with 500 rows")
