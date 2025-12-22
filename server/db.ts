/**
 * DATABASE MODULE - Centralized Data Access Layer
 * 
 * This module encapsulates all database operations for GymBuddy AI.
 * It prevents scattered SQL queries throughout the codebase and ensures
 * consistent data access patterns.
 * 
 * Benefits:
 * - Single source of truth for all DB operations
 * - Easy to audit SQL queries
 * - Simplifies testing and debugging
 * - Facilitates future migrations (e.g., to PostgreSQL)
 */

import Database from 'better-sqlite3';
import path from 'path';
import { fileURLToPath } from 'url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const dbPath = path.join(__dirname, '../gymbuddy.db');
const db = new Database(dbPath);

/**
 * Initialize database schema if tables don't exist
 */
export function initializeDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      age INTEGER NOT NULL,
      email TEXT UNIQUE NOT NULL,
      gym TEXT NOT NULL,
      goal TEXT NOT NULL,
      experience TEXT NOT NULL,
      preferredTime TEXT NOT NULL,
      consistency INTEGER DEFAULT 0,
      streak INTEGER DEFAULT 0,
      lastCheckIn TEXT,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS checkins (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      userId INTEGER NOT NULL,
      date TEXT NOT NULL UNIQUE,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (userId) REFERENCES users(id)
    )
  `);

  db.exec(`
    CREATE TABLE IF NOT EXISTS blocks (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      accuserId INTEGER NOT NULL,
      accusedId INTEGER NOT NULL,
      type TEXT NOT NULL,
      createdAt TEXT DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (accuserId) REFERENCES users(id),
      FOREIGN KEY (accusedId) REFERENCES users(id)
    )
  `);

  console.log('✓ Database initialized with persistent storage');
}

/**
 * USER OPERATIONS
 */

export interface User {
  id: number;
  name: string;
  age: number;
  email: string;
  gym: string;
  goal: string;
  experience: string;
  preferredTime: string;
  consistency: number;
  streak: number;
  lastCheckIn: string | null;
  createdAt: string;
}

export function registerUser(name: string, age: number, email: string, gym: string, goal: string, experience: string, preferredTime: string): User {
  const stmt = db.prepare(`
    INSERT INTO users (name, age, email, gym, goal, experience, preferredTime)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);
  
  try {
    const info = stmt.run(name, age, email, gym, goal, experience, preferredTime);
    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(info.lastInsertRowid);
    return user as User;
  } catch (dbError: any) {
    if (dbError.message.includes('UNIQUE constraint failed')) {
      throw new Error('Email already registered');
    }
    throw dbError;
  }
}

export function getUserById(id: number): User | undefined {
  return db.prepare('SELECT * FROM users WHERE id = ?').get(id) as User | undefined;
}

export function getAllUsers(): User[] {
  return db.prepare('SELECT * FROM users').all() as User[];
}

export function getUsersExcluding(userId: number): User[] {
  return db.prepare('SELECT * FROM users WHERE id != ?').all(userId) as User[];
}

/**
 * CHECK-IN OPERATIONS
 */

export function hasCheckedInToday(userId: number): boolean {
  const today = new Date().toISOString().split('T')[0];
  const result = db.prepare('SELECT * FROM checkins WHERE userId = ? AND date = ?').get(userId, today);
  return !!result;
}

export function recordCheckIn(userId: number): void {
  const today = new Date().toISOString().split('T')[0];
  db.prepare('INSERT INTO checkins (userId, date) VALUES (?, ?)').run(userId, today);
}

export function updateUserStreak(userId: number, newStreak: number, newConsistency: number): void {
  db.prepare(
    'UPDATE users SET streak = ?, consistency = ?, lastCheckIn = ? WHERE id = ?'
  ).run(newStreak, newConsistency, new Date().toISOString(), userId);
}
