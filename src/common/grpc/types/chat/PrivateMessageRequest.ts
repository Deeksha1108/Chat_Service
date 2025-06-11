export interface PrivateMessageRequest {
  senderId?: string;
  receiverId?: string;
  content?: string;
}

export interface PrivateMessageRequest__Output {
  senderId: string;
  receiverId: string;
  content: string;
}
