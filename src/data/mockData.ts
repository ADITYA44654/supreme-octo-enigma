export interface User {
  id: string;
  username: string;
  email: string;
  avatar?: string;
  bio?: string;
  isOnline: boolean;
  lastSeen?: Date;
}

export interface Message {
  id: string;
  senderId: string;
  content: string;
  type: 'text' | 'image' | 'video' | 'file' | 'voice';
  timestamp: Date;
  isRead: boolean;
  fileUrl?: string;
  fileName?: string;
}

export interface Conversation {
  id: string;
  type: 'direct' | 'group';
  name?: string;
  avatar?: string;
  participants: User[];
  lastMessage?: Message;
  unreadCount: number;
  isTyping?: boolean;
}

export const mockUsers: User[] = [
  {
    id: '1',
    username: 'Aditya Chauhan',
    email: 'aditya@chitchat.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Aditya',
    bio: 'Founder of ChitChat',
    isOnline: true,
  },
  {
    id: '2',
    username: 'Sarah Johnson',
    email: 'sarah@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Sarah',
    bio: 'Software Developer',
    isOnline: true,
  },
  {
    id: '3',
    username: 'Mike Chen',
    email: 'mike@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Mike',
    bio: 'UI/UX Designer',
    isOnline: false,
    lastSeen: new Date(Date.now() - 1000 * 60 * 30),
  },
  {
    id: '4',
    username: 'Emily Davis',
    email: 'emily@example.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Emily',
    bio: 'Product Manager',
    isOnline: true,
  },
  {
    id: '5',
    username: 'Team ChitChat',
    email: 'team@chitchat.com',
    avatar: 'https://api.dicebear.com/7.x/avataaars/svg?seed=Team',
    bio: 'Official ChitChat Team',
    isOnline: true,
  },
];

export const mockConversations: Conversation[] = [
  {
    id: 'conv1',
    type: 'direct',
    participants: [mockUsers[0], mockUsers[1]],
    lastMessage: {
      id: 'm1',
      senderId: '2',
      content: 'Hey! How are you doing? 👋',
      type: 'text',
      timestamp: new Date(Date.now() - 1000 * 60 * 2),
      isRead: false,
    },
    unreadCount: 2,
    isTyping: false,
  },
  {
    id: 'conv2',
    type: 'direct',
    participants: [mockUsers[0], mockUsers[2]],
    lastMessage: {
      id: 'm2',
      senderId: '1',
      content: 'The new design looks amazing!',
      type: 'text',
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      isRead: true,
    },
    unreadCount: 0,
  },
  {
    id: 'conv3',
    type: 'group',
    name: 'Project Alpha',
    avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=Alpha',
    participants: [mockUsers[0], mockUsers[1], mockUsers[2], mockUsers[3]],
    lastMessage: {
      id: 'm3',
      senderId: '4',
      content: 'Meeting at 3 PM today',
      type: 'text',
      timestamp: new Date(Date.now() - 1000 * 60 * 45),
      isRead: true,
    },
    unreadCount: 0,
  },
  {
    id: 'conv4',
    type: 'direct',
    participants: [mockUsers[0], mockUsers[3]],
    lastMessage: {
      id: 'm4',
      senderId: '4',
      content: 'Can you review the PRD?',
      type: 'text',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 2),
      isRead: true,
    },
    unreadCount: 0,
    isTyping: true,
  },
  {
    id: 'conv5',
    type: 'group',
    name: 'ChitChat Team',
    avatar: 'https://api.dicebear.com/7.x/shapes/svg?seed=ChitChat',
    participants: mockUsers,
    lastMessage: {
      id: 'm5',
      senderId: '5',
      content: 'Welcome to ChitChat! 🎉',
      type: 'text',
      timestamp: new Date(Date.now() - 1000 * 60 * 60 * 24),
      isRead: true,
    },
    unreadCount: 0,
  },
];

export const mockMessages: Record<string, Message[]> = {
  conv1: [
    {
      id: 'm1-1',
      senderId: '2',
      content: 'Hey Aditya! 👋',
      type: 'text',
      timestamp: new Date(Date.now() - 1000 * 60 * 10),
      isRead: true,
    },
    {
      id: 'm1-2',
      senderId: '1',
      content: 'Hi Sarah! How\'s everything going?',
      type: 'text',
      timestamp: new Date(Date.now() - 1000 * 60 * 8),
      isRead: true,
    },
    {
      id: 'm1-3',
      senderId: '2',
      content: 'Great! I just finished the new feature implementation',
      type: 'text',
      timestamp: new Date(Date.now() - 1000 * 60 * 6),
      isRead: true,
    },
    {
      id: 'm1-4',
      senderId: '1',
      content: 'That\'s awesome! Can\'t wait to see it 🚀',
      type: 'text',
      timestamp: new Date(Date.now() - 1000 * 60 * 4),
      isRead: true,
    },
    {
      id: 'm1-5',
      senderId: '2',
      content: 'Hey! How are you doing? 👋',
      type: 'text',
      timestamp: new Date(Date.now() - 1000 * 60 * 2),
      isRead: false,
    },
  ],
  conv2: [
    {
      id: 'm2-1',
      senderId: '3',
      content: 'Check out these new mockups!',
      type: 'text',
      timestamp: new Date(Date.now() - 1000 * 60 * 60),
      isRead: true,
    },
    {
      id: 'm2-2',
      senderId: '1',
      content: 'Wow, these look incredible!',
      type: 'text',
      timestamp: new Date(Date.now() - 1000 * 60 * 45),
      isRead: true,
    },
    {
      id: 'm2-3',
      senderId: '1',
      content: 'The new design looks amazing!',
      type: 'text',
      timestamp: new Date(Date.now() - 1000 * 60 * 15),
      isRead: true,
    },
  ],
};

export const currentUser: User = mockUsers[0];
