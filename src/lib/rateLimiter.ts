// Simple client-side rate limiter for various actions
interface RateLimitConfig {
  maxAttempts: number;
  windowMs: number;
}

interface RateLimitStore {
  [key: string]: {
    attempts: number;
    resetTime: number;
  };
}

const store: RateLimitStore = {};

const defaultConfigs: Record<string, RateLimitConfig> = {
  message: { maxAttempts: 30, windowMs: 60000 }, // 30 messages per minute
  voice_note: { maxAttempts: 5, windowMs: 60000 }, // 5 voice notes per minute
  friend_request: { maxAttempts: 20, windowMs: 300000 }, // 20 requests per 5 minutes
  // file_upload and conversation are now unlimited - no rate limiting
};

export const checkRateLimit = (userId: string, action: string): { allowed: boolean; retryAfter?: number } => {
  const config = defaultConfigs[action];
  if (!config) return { allowed: true };

  const key = `${userId}:${action}`;
  const now = Date.now();

  if (!store[key] || now > store[key].resetTime) {
    store[key] = {
      attempts: 1,
      resetTime: now + config.windowMs,
    };
    return { allowed: true };
  }

  if (store[key].attempts >= config.maxAttempts) {
    const retryAfter = Math.ceil((store[key].resetTime - now) / 1000);
    return { allowed: false, retryAfter };
  }

  store[key].attempts++;
  return { allowed: true };
};

export const getRateLimitMessage = (action: string, retryAfter: number): string => {
  const actionNames: Record<string, string> = {
    message: 'sending messages',
    file_upload: 'uploading files',
    voice_note: 'sending voice notes',
    friend_request: 'sending friend requests',
    conversation: 'creating conversations',
  };
  
  return `Too many ${actionNames[action] || 'requests'}. Please wait ${retryAfter} seconds.`;
};
