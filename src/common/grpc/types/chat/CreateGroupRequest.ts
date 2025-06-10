// Original file: src/common/grpc/proto/chat.proto


export interface CreateGroupRequest {
  'groupName'?: (string);
  'creatorId'?: (string);
  'memberIds'?: (string)[];
}

export interface CreateGroupRequest__Output {
  'groupName': (string);
  'creatorId': (string);
  'memberIds': (string)[];
}
