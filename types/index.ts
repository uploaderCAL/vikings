
export enum Gender {
  MALE = 'Homem',
  FEMALE = 'Mulher',
  OTHER = 'Outro'
}

export enum VisibilityPreference {
  EVERYONE = 'Todos',
  WOMEN = 'Mulheres',
  MEN = 'Homens'
}

export interface User {
  id: string;
  nickname: string;
  gender: Gender;
  visibility: VisibilityPreference;
  avatar: string;
  isPresent: boolean;
  joinedAt: number;
}

export interface Message {
  id: string;
  senderId: string;
  text: string;
  timestamp: number;
  reaction?: string;
  isPending?: boolean;
}

export interface Thread {
  id: string;
  participants: [string, string];
  status: 'pending' | 'accepted' | 'blocked';
  messages: Message[];
  lastActivity: number;
  isOtherTyping?: boolean;
}

export interface NightConfig {
  isNightOn: boolean;
  validWifiSSIDs: string[];
  currentWifiSSID: string | null;
  shutdownTimer: number | null;
  warningBroadcast: string | null;
}
