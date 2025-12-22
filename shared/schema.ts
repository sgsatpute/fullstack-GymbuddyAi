
import { pgTable, text, serial, integer, boolean, timestamp } from "drizzle-orm/pg-core";
import { createInsertSchema } from "drizzle-zod";
import { z } from "zod";

// Data Models
export const users = pgTable("users", {
  id: serial("id").primaryKey(),
  name: text("name").notNull(),
  age: integer("age").notNull(),
  gender: text("gender"),
  goal: text("goal").notNull(), // muscle_gain, fat_loss, general_fitness
  experience: text("experience").notNull(), // beginner, intermediate, advanced
  workoutTime: text("workout_time").notNull(), // morning, evening, night
  gymName: text("gym_name").notNull(),
  
  // System Fields
  clusterId: integer("cluster_id").default(0),
  consistencyScore: integer("consistency_score").default(0),
  streak: integer("streak").default(0),
  lastCheckIn: text("last_check_in"), // ISO Date string
  isBlocked: boolean("is_blocked").default(false),
});

export const messages = pgTable("messages", {
  id: serial("id").primaryKey(),
  fromId: integer("from_id").notNull(),
  toId: integer("to_id").notNull(),
  content: text("content").notNull(),
  timestamp: text("timestamp").notNull(), // ISO Date string
});

export const reports = pgTable("reports", {
  id: serial("id").primaryKey(),
  accuserId: integer("accuser_id").notNull(),
  accusedId: integer("accused_id").notNull(),
  type: text("type").notNull(), // block, report
});

// Zod Schemas
export const insertUserSchema = createInsertSchema(users).omit({
  id: true,
  clusterId: true,
  consistencyScore: true,
  streak: true,
  lastCheckIn: true,
  isBlocked: true
});

export const insertMessageSchema = createInsertSchema(messages).omit({
  id: true,
  timestamp: true
});

export const insertReportSchema = createInsertSchema(reports).omit({
  id: true
});

// Types
export type User = typeof users.$inferSelect;
export type InsertUser = z.infer<typeof insertUserSchema>;
export type Message = typeof messages.$inferSelect;
export type InsertMessage = z.infer<typeof insertMessageSchema>;
export type Report = typeof reports.$inferSelect;
