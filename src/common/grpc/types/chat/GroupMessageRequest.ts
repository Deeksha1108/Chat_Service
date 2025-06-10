// Original file: src/common/grpc/proto/chat.proto


export interface GroupMessageRequest {
  'groupId'?: (string);
  'senderId'?: (string);
  'content'?: (string);
}

export interface GroupMessageRequest__Output {
  'groupId': (string);
  'senderId': (string);
  'content': (string);
}
