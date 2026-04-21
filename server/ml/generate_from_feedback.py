import sqlite3
import pandas as pd

conn = sqlite3.connect("../gymbuddy.db")

query = """
SELECT 
  u1.gym = u2.gym AS gym,
  u1.goal = u2.goal AS goal,
  u1.experience = u2.experience AS experience,
  u1.preferredTime = u2.preferredTime AS time,
  f.label
FROM match_feedback f
JOIN users u1 ON u1.id = f.userA
JOIN users u2 ON u2.id = f.userB
"""

df = pd.read_sql(query, conn)

if len(df) < 20:
    print("Not enough feedback yet")
else:
    df.to_csv("real_training_data.csv", index=False)
    print("✓ Real ML data generated")
