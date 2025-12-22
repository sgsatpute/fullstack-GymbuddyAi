
import { users, type User, type InsertUser, type Message, type InsertMessage, type Report } from "@shared/schema";

export interface IStorage {
  getUser(id: number): Promise<User | undefined>;
  getAllUsers(): Promise<User[]>;
  createUser(user: InsertUser): Promise<User>;
  updateUser(id: number, updates: Partial<User>): Promise<User>;
  
  // Chat
  getMessages(user1Id: number, user2Id: number): Promise<Message[]>;
  createMessage(msg: InsertMessage): Promise<Message>;

  // Safety
  createReport(report: Report): Promise<void>;
  getBlocks(userId: number): Promise<number[]>; // Returns IDs of people blocked by userId
}

export class MemStorage implements IStorage {
  private users: Map<number, User>;
  private messages: Message[];
  private reports: Report[];
  private currentUserId: number;
  private currentMsgId: number;
  private currentReportId: number;

  constructor() {
    this.users = new Map();
    this.messages = [];
    this.reports = [];
    this.currentUserId = 1;
    this.currentMsgId = 1;
    this.currentReportId = 1;
  }

  async getUser(id: number): Promise<User | undefined> {
    return this.users.get(id);
  }

  async getAllUsers(): Promise<User[]> {
    return Array.from(this.users.values());
  }

  async createUser(insertUser: InsertUser): Promise<User> {
    // Prevent duplicate users with same name and gym (basic validation)
    const existing = Array.from(this.users.values()).find(
      u => u.name.toLowerCase() === insertUser.name.toLowerCase() && 
           u.gymName.toLowerCase() === insertUser.gymName.toLowerCase()
    );
    
    if (existing) {
      throw new Error("User with this name already exists in this gym");
    }

    const id = this.currentUserId++;
    const user: User = { 
      ...insertUser, 
      id,
      clusterId: 0, 
      consistencyScore: 0,
      streak: 0,
      lastCheckIn: null,
      isBlocked: false 
    };
    this.users.set(id, user);
    return user;
  }

  async updateUser(id: number, updates: Partial<User>): Promise<User> {
    const user = this.users.get(id);
    if (!user) throw new Error("User not found");
    const updated = { ...user, ...updates };
    this.users.set(id, updated);
    return updated;
  }

  async getMessages(user1Id: number, user2Id: number): Promise<Message[]> {
    return this.messages.filter(m => 
      (m.fromId === user1Id && m.toId === user2Id) || 
      (m.fromId === user2Id && m.toId === user1Id)
    ).sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
  }

  async createMessage(msg: InsertMessage): Promise<Message> {
    const message: Message = {
      ...msg,
      id: this.currentMsgId++,
      timestamp: new Date().toISOString()
    };
    this.messages.push(message);
    return message;
  }

  async createReport(report: Report): Promise<void> {
    this.reports.push({ ...report, id: this.currentReportId++ });
  }

  async getBlocks(userId: number): Promise<number[]> {
    return this.reports
      .filter(r => r.accuserId === userId && r.type === 'block')
      .map(r => r.accusedId);
  }
}

export const storage = new MemStorage();
