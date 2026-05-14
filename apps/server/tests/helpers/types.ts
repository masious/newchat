export type AuthTokenRow = {
  id: number;
  token: string;
  telegramId: string | null;
  status: "pending" | "confirmed" | "expired";
  userId: number | null;
  createdAt: Date;
  updatedAt: Date;
};

export type UserRow = {
  id: number;
  telegramId: string;
  username: string | null;
  firstName: string;
  lastName: string | null;
  avatarUrl: string | null;
  hasCompletedOnboarding: boolean;
  notificationChannel: "web" | "telegram" | "both" | "none";
  createdAt: Date;
  updatedAt: Date;
  lastSeenAt: Date | null;
};

export type PushSubscriptionRow = {
  id: number;
  userId: number;
  endpoint: string;
  p256dh: string;
  auth: string;
  createdAt: Date;
};

export type IdRow = {
  id: number;
};
