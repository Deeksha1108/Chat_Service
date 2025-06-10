// Original file: src/common/grpc/proto/chat.proto


export interface PrivateMessageRequest {
  'senderId'?: (string);
  'receiverId'?: (string);
  'content'?: (string);
}

export interface PrivateMessageRequest__Output {
  'senderId': (string);
  'receiverId': (string);
  'content': (string);
}
