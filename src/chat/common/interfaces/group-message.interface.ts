interface GroupMessage {
  groupId: string;
  senderId: string;
  content: string;
  timestamp: Date;
  type?: 'member-joined' | 'member-left';
  userId?: string;
}