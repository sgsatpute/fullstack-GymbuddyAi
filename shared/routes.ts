
import { z } from 'zod';
import { insertUserSchema, insertMessageSchema, insertReportSchema, users, messages } from './schema';

export const api = {
  users: {
    register: {
      method: 'POST',
      path: '/api/register',
      input: insertUserSchema,
    },
    list: {
      method: 'GET',
      path: '/api/users',
    },
    get: {
      method: 'GET',
      path: '/api/users/:id',
    }
  },
  matches: {
    get: {
      method: 'GET',
      path: '/api/matches/:userId',
    }
  },
  chat: {
    history: {
      method: 'GET',
      path: '/api/chat/:userId/:targetId',
    },
    send: {
      method: 'POST',
      path: '/api/chat',
      input: insertMessageSchema
    }
  },
  actions: {
    checkin: {
      method: 'POST',
      path: '/api/checkin',
      input: z.object({ userId: z.number() })
    },
    report: {
      method: 'POST',
      path: '/api/report',
      input: insertReportSchema
    }
  }
};
