"""
PROMPT 2: ML Workout Recommendation Engine
Random Forest Classifier with 1000 training samples
12 different personalized workout plans
"""

import json
import pickle
import numpy as np
from sklearn.ensemble import RandomForestClassifier
from sklearn.preprocessing import LabelEncoder
from sklearn.model_selection import train_test_split, cross_val_score
from sklearn.metrics import accuracy_score, classification_report

# Define 12 workout plans
WORKOUT_PLANS = {
    'beginner_strength': {'name': 'Beginner Strength', 'days': 3, 'intensity': 'Low', 'duration': 45},
    'beginner_cardio': {'name': 'Beginner Cardio', 'days': 3, 'intensity': 'Low-Medium', 'duration': 30},
    'intermediate_strength': {'name': 'Intermediate Strength', 'days': 4, 'intensity': 'Medium', 'duration': 60},
    'intermediate_hypertrophy': {'name': 'Intermediate Hypertrophy', 'days': 4, 'intensity': 'Medium-High', 'duration': 75},
    'intermediate_cardio': {'name': 'Intermediate Cardio', 'days': 4, 'intensity': 'Medium-High', 'duration': 45},
    'advanced_strength': {'name': 'Advanced Strength', 'days': 5, 'intensity': 'High', 'duration': 90},
    'advanced_hypertrophy': {'name': 'Advanced Hypertrophy', 'days': 5, 'intensity': 'High', 'duration': 90},
    'advanced_endurance': {'name': 'Advanced Endurance', 'days': 6, 'intensity': 'High', 'duration': 120},
    'calisthenics': {'name': 'Calisthenics Progression', 'days': 4, 'intensity': 'Medium-High', 'duration': 60},
    'flexibility': {'name': 'Flexibility & Mobility', 'days': 4, 'intensity': 'Low', 'duration': 45},
    'mixed_fitness': {'name': 'Mixed Fitness', 'days': 5, 'intensity': 'Medium', 'duration': 60},
    'sport_specific': {'name': 'Sport Specific', 'days': 5, 'intensity': 'High', 'duration': 90},
}

def generate_training_data(n_samples=1000):
    """Generate 1000 realistic training samples"""
    np.random.seed(42)
    data = []
    
    for _ in range(n_samples):
        age = np.random.randint(18, 70)
        goal = np.random.choice(['muscle', 'weight_loss', 'strength', 'endurance', 'flexibility'])
        experience = np.random.choice(['beginner', 'intermediate', 'advanced'])
        bmi = np.random.uniform(18.5, 32.0)
        
        if experience == 'beginner':
            fitness_level = np.random.uniform(1, 3)
            weekly_activity = np.random.randint(0, 2)
        elif experience == 'intermediate':
            fitness_level = np.random.uniform(3, 6)
            weekly_activity = np.random.randint(2, 4)
        else:
            fitness_level = np.random.uniform(6, 10)
            weekly_activity = np.random.randint(4, 7)
        
        # Assign plan based on features
        if experience == 'beginner':
            plan = 'beginner_strength' if goal == 'strength' else 'beginner_cardio'
        elif experience == 'intermediate':
            if goal == 'muscle': plan = 'intermediate_hypertrophy'
            elif goal == 'strength': plan = 'intermediate_strength'
            else: plan = 'intermediate_cardio'
        else:
            if goal == 'muscle': plan = 'advanced_hypertrophy'
            elif goal == 'strength': plan = 'advanced_strength'
            elif goal == 'endurance': plan = 'advanced_endurance'
            else: plan = 'mixed_fitness'
        
        data.append({
            'age': age, 'goal': goal, 'experience': experience,
            'bmi': bmi, 'fitness_level': fitness_level,
            'weekly_activity': weekly_activity, 'plan': plan,
        })
    
    return data

def train_model(data):
    """Train Random Forest classifier"""
    goal_enc = LabelEncoder()
    exp_enc = LabelEncoder()
    plan_enc = LabelEncoder()
    
    goals = [d['goal'] for d in data]
    exps = [d['experience'] for d in data]
    plans = [d['plan'] for d in data]
    
    goal_enc.fit(goals)
    exp_enc.fit(exps)
    plan_enc.fit(plans)
    
    features = np.array([[
        d['age'],
        goal_enc.transform([d['goal']])[0],
        exp_enc.transform([d['experience']])[0],
        d['bmi'], d['fitness_level'], d['weekly_activity'],
    ] for d in data])
    
    targets = plan_enc.transform(plans)
    
    X_train, X_test, y_train, y_test = train_test_split(
        features, targets, test_size=0.2, random_state=42
    )
    
    model = RandomForestClassifier(n_estimators=100, max_depth=15, random_state=42, n_jobs=-1)
    model.fit(X_train, y_train)
    
    accuracy = accuracy_score(y_test, model.predict(X_test))
    cv_scores = cross_val_score(model, features, targets, cv=5)
    
    feature_names = ['age', 'goal', 'experience', 'bmi', 'fitness_level', 'weekly_activity']
    feature_importance = dict(zip(feature_names, model.feature_importances_))
    
    return {
        'model': model,
        'encoders': {'goal': goal_enc, 'experience': exp_enc, 'plan': plan_enc},
        'metrics': {
            'accuracy': accuracy,
            'cv_mean': cv_scores.mean(),
            'cv_std': cv_scores.std(),
            'feature_importance': feature_importance,
        },
        'feature_names': feature_names,
    }

if __name__ == '__main__':
    print("=" * 60)
    print("ML WORKOUT RECOMMENDATION ENGINE - TRAINING")
    print("=" * 60)
    
    print("\n📊 Generating 1000 training samples...")
    training_data = generate_training_data(1000)
    
    print("🤖 Training Random Forest classifier (100 trees)...")
    model_info = train_model(training_data)
    metrics = model_info['metrics']
    
    print(f"\n✅ Model trained successfully!")
    print(f"  • Test Accuracy: {metrics['accuracy']:.2%}")
    print(f"  • Cross-Val Mean: {metrics['cv_mean']:.2%} ± {metrics['cv_std']:.4f}")
    
    print(f"\n🎯 Feature Importance:")
    for feat, imp in sorted(metrics['feature_importance'].items(), key=lambda x: x[1], reverse=True):
        print(f"  • {feat}: {imp:.4f}")
    
    print("\n💾 Saving model...")
    with open('coach_model.pkl', 'wb') as f:
        pickle.dump(model_info, f)
    
    with open('metrics.txt', 'w') as f:
        f.write(json.dumps(model_info['metrics'], indent=2, default=str))
    
    print("✅ Complete! Model saved to coach_model.pkl")
