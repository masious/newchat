export interface ChatListContext {
  isTyping?: boolean;
  typingUserName: string | null;
  isFetchingOlder: boolean;
  hasOlderMessages: boolean;
}
