export type Achievement = {
  key: string;
  title: string;
  description: string;
  icon: string;
  unlocked: boolean;
  progress: number;
  target: number;
  progressPercent: number;
};

export type LevelProgress = {
  level: number;
  levelStartXp: number;
  nextLevelXp: number;
  xpIntoLevel: number;
  xpNeededForNextLevel: number;
  levelProgressPercent: number;
};

export type UserStats = {
  messagesSent: number;
  unreadMessages: number;
  totalCheckins: number;
  conversationCount: number;
};

export type UserProfile = {
  id: number;
  name: string;
  age?: number | null;
  email?: string;
  gym?: string | null;
  goal?: string | null;
  experience?: string | null;
  preferredTime?: string | null;
  consistency: number;
  streak: number;
  xp: number;
  level: number;
  bio?: string | null;
  createdAt?: string;
  lastCheckIn?: string | null;
  checkedInToday?: boolean;
  profileComplete?: boolean;
  achievements?: Achievement[];
  levelProgress?: LevelProgress;
  stats?: UserStats;
  relationship?: {
    isSelf: boolean;
    hasMessaged: boolean;
    sameGym: boolean;
  };
};

export type MatchItem = {
  user: UserProfile;
  score: number;
  reasons: string[];
  tier: string;
  canChat: boolean;
};

export type ConversationSummary = {
  userId: number;
  user: UserProfile;
  lastMessage: string;
  lastMessageAt: string;
  lastMessageSenderId: number;
  unreadCount: number;
};

export type ChatMessage = {
  id?: number;
  senderId: number;
  receiverId: number;
  message: string;
  createdAt: string;
  seen?: number;
};
