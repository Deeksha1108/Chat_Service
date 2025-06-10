// Original file: src/common/grpc/proto/chat.proto

import type * as grpc from '@grpc/grpc-js'
import type { MethodDefinition } from '@grpc/proto-loader'
import type { ChatMessageResponse as _chat_ChatMessageResponse, ChatMessageResponse__Output as _chat_ChatMessageResponse__Output } from '../chat/ChatMessageResponse';
import type { ChatMessagesResponse as _chat_ChatMessagesResponse, ChatMessagesResponse__Output as _chat_ChatMessagesResponse__Output } from '../chat/ChatMessagesResponse';
import type { CreateGroupRequest as _chat_CreateGroupRequest, CreateGroupRequest__Output as _chat_CreateGroupRequest__Output } from '../chat/CreateGroupRequest';
import type { GroupChatHistoryRequest as _chat_GroupChatHistoryRequest, GroupChatHistoryRequest__Output as _chat_GroupChatHistoryRequest__Output } from '../chat/GroupChatHistoryRequest';
import type { GroupMemberRequest as _chat_GroupMemberRequest, GroupMemberRequest__Output as _chat_GroupMemberRequest__Output } from '../chat/GroupMemberRequest';
import type { GroupMessageRequest as _chat_GroupMessageRequest, GroupMessageRequest__Output as _chat_GroupMessageRequest__Output } from '../chat/GroupMessageRequest';
import type { GroupResponse as _chat_GroupResponse, GroupResponse__Output as _chat_GroupResponse__Output } from '../chat/GroupResponse';
import type { PrivateChatHistoryRequest as _chat_PrivateChatHistoryRequest, PrivateChatHistoryRequest__Output as _chat_PrivateChatHistoryRequest__Output } from '../chat/PrivateChatHistoryRequest';
import type { PrivateMessageRequest as _chat_PrivateMessageRequest, PrivateMessageRequest__Output as _chat_PrivateMessageRequest__Output } from '../chat/PrivateMessageRequest';

export interface ChatServiceClient extends grpc.Client {
  AddGroupMember(argument: _chat_GroupMemberRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_chat_GroupResponse__Output>): grpc.ClientUnaryCall;
  AddGroupMember(argument: _chat_GroupMemberRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_chat_GroupResponse__Output>): grpc.ClientUnaryCall;
  AddGroupMember(argument: _chat_GroupMemberRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_chat_GroupResponse__Output>): grpc.ClientUnaryCall;
  AddGroupMember(argument: _chat_GroupMemberRequest, callback: grpc.requestCallback<_chat_GroupResponse__Output>): grpc.ClientUnaryCall;
  addGroupMember(argument: _chat_GroupMemberRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_chat_GroupResponse__Output>): grpc.ClientUnaryCall;
  addGroupMember(argument: _chat_GroupMemberRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_chat_GroupResponse__Output>): grpc.ClientUnaryCall;
  addGroupMember(argument: _chat_GroupMemberRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_chat_GroupResponse__Output>): grpc.ClientUnaryCall;
  addGroupMember(argument: _chat_GroupMemberRequest, callback: grpc.requestCallback<_chat_GroupResponse__Output>): grpc.ClientUnaryCall;
  
  CreateGroup(argument: _chat_CreateGroupRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_chat_GroupResponse__Output>): grpc.ClientUnaryCall;
  CreateGroup(argument: _chat_CreateGroupRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_chat_GroupResponse__Output>): grpc.ClientUnaryCall;
  CreateGroup(argument: _chat_CreateGroupRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_chat_GroupResponse__Output>): grpc.ClientUnaryCall;
  CreateGroup(argument: _chat_CreateGroupRequest, callback: grpc.requestCallback<_chat_GroupResponse__Output>): grpc.ClientUnaryCall;
  createGroup(argument: _chat_CreateGroupRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_chat_GroupResponse__Output>): grpc.ClientUnaryCall;
  createGroup(argument: _chat_CreateGroupRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_chat_GroupResponse__Output>): grpc.ClientUnaryCall;
  createGroup(argument: _chat_CreateGroupRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_chat_GroupResponse__Output>): grpc.ClientUnaryCall;
  createGroup(argument: _chat_CreateGroupRequest, callback: grpc.requestCallback<_chat_GroupResponse__Output>): grpc.ClientUnaryCall;
  
  GetGroupChatHistory(argument: _chat_GroupChatHistoryRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_chat_ChatMessagesResponse__Output>): grpc.ClientUnaryCall;
  GetGroupChatHistory(argument: _chat_GroupChatHistoryRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_chat_ChatMessagesResponse__Output>): grpc.ClientUnaryCall;
  GetGroupChatHistory(argument: _chat_GroupChatHistoryRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_chat_ChatMessagesResponse__Output>): grpc.ClientUnaryCall;
  GetGroupChatHistory(argument: _chat_GroupChatHistoryRequest, callback: grpc.requestCallback<_chat_ChatMessagesResponse__Output>): grpc.ClientUnaryCall;
  getGroupChatHistory(argument: _chat_GroupChatHistoryRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_chat_ChatMessagesResponse__Output>): grpc.ClientUnaryCall;
  getGroupChatHistory(argument: _chat_GroupChatHistoryRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_chat_ChatMessagesResponse__Output>): grpc.ClientUnaryCall;
  getGroupChatHistory(argument: _chat_GroupChatHistoryRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_chat_ChatMessagesResponse__Output>): grpc.ClientUnaryCall;
  getGroupChatHistory(argument: _chat_GroupChatHistoryRequest, callback: grpc.requestCallback<_chat_ChatMessagesResponse__Output>): grpc.ClientUnaryCall;
  
  GetPrivateChatHistory(argument: _chat_PrivateChatHistoryRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_chat_ChatMessagesResponse__Output>): grpc.ClientUnaryCall;
  GetPrivateChatHistory(argument: _chat_PrivateChatHistoryRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_chat_ChatMessagesResponse__Output>): grpc.ClientUnaryCall;
  GetPrivateChatHistory(argument: _chat_PrivateChatHistoryRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_chat_ChatMessagesResponse__Output>): grpc.ClientUnaryCall;
  GetPrivateChatHistory(argument: _chat_PrivateChatHistoryRequest, callback: grpc.requestCallback<_chat_ChatMessagesResponse__Output>): grpc.ClientUnaryCall;
  getPrivateChatHistory(argument: _chat_PrivateChatHistoryRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_chat_ChatMessagesResponse__Output>): grpc.ClientUnaryCall;
  getPrivateChatHistory(argument: _chat_PrivateChatHistoryRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_chat_ChatMessagesResponse__Output>): grpc.ClientUnaryCall;
  getPrivateChatHistory(argument: _chat_PrivateChatHistoryRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_chat_ChatMessagesResponse__Output>): grpc.ClientUnaryCall;
  getPrivateChatHistory(argument: _chat_PrivateChatHistoryRequest, callback: grpc.requestCallback<_chat_ChatMessagesResponse__Output>): grpc.ClientUnaryCall;
  
  RemoveGroupMember(argument: _chat_GroupMemberRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_chat_GroupResponse__Output>): grpc.ClientUnaryCall;
  RemoveGroupMember(argument: _chat_GroupMemberRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_chat_GroupResponse__Output>): grpc.ClientUnaryCall;
  RemoveGroupMember(argument: _chat_GroupMemberRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_chat_GroupResponse__Output>): grpc.ClientUnaryCall;
  RemoveGroupMember(argument: _chat_GroupMemberRequest, callback: grpc.requestCallback<_chat_GroupResponse__Output>): grpc.ClientUnaryCall;
  removeGroupMember(argument: _chat_GroupMemberRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_chat_GroupResponse__Output>): grpc.ClientUnaryCall;
  removeGroupMember(argument: _chat_GroupMemberRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_chat_GroupResponse__Output>): grpc.ClientUnaryCall;
  removeGroupMember(argument: _chat_GroupMemberRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_chat_GroupResponse__Output>): grpc.ClientUnaryCall;
  removeGroupMember(argument: _chat_GroupMemberRequest, callback: grpc.requestCallback<_chat_GroupResponse__Output>): grpc.ClientUnaryCall;
  
  SendGroupMessage(argument: _chat_GroupMessageRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_chat_ChatMessageResponse__Output>): grpc.ClientUnaryCall;
  SendGroupMessage(argument: _chat_GroupMessageRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_chat_ChatMessageResponse__Output>): grpc.ClientUnaryCall;
  SendGroupMessage(argument: _chat_GroupMessageRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_chat_ChatMessageResponse__Output>): grpc.ClientUnaryCall;
  SendGroupMessage(argument: _chat_GroupMessageRequest, callback: grpc.requestCallback<_chat_ChatMessageResponse__Output>): grpc.ClientUnaryCall;
  sendGroupMessage(argument: _chat_GroupMessageRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_chat_ChatMessageResponse__Output>): grpc.ClientUnaryCall;
  sendGroupMessage(argument: _chat_GroupMessageRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_chat_ChatMessageResponse__Output>): grpc.ClientUnaryCall;
  sendGroupMessage(argument: _chat_GroupMessageRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_chat_ChatMessageResponse__Output>): grpc.ClientUnaryCall;
  sendGroupMessage(argument: _chat_GroupMessageRequest, callback: grpc.requestCallback<_chat_ChatMessageResponse__Output>): grpc.ClientUnaryCall;
  
  SendPrivateMessage(argument: _chat_PrivateMessageRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_chat_ChatMessageResponse__Output>): grpc.ClientUnaryCall;
  SendPrivateMessage(argument: _chat_PrivateMessageRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_chat_ChatMessageResponse__Output>): grpc.ClientUnaryCall;
  SendPrivateMessage(argument: _chat_PrivateMessageRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_chat_ChatMessageResponse__Output>): grpc.ClientUnaryCall;
  SendPrivateMessage(argument: _chat_PrivateMessageRequest, callback: grpc.requestCallback<_chat_ChatMessageResponse__Output>): grpc.ClientUnaryCall;
  sendPrivateMessage(argument: _chat_PrivateMessageRequest, metadata: grpc.Metadata, options: grpc.CallOptions, callback: grpc.requestCallback<_chat_ChatMessageResponse__Output>): grpc.ClientUnaryCall;
  sendPrivateMessage(argument: _chat_PrivateMessageRequest, metadata: grpc.Metadata, callback: grpc.requestCallback<_chat_ChatMessageResponse__Output>): grpc.ClientUnaryCall;
  sendPrivateMessage(argument: _chat_PrivateMessageRequest, options: grpc.CallOptions, callback: grpc.requestCallback<_chat_ChatMessageResponse__Output>): grpc.ClientUnaryCall;
  sendPrivateMessage(argument: _chat_PrivateMessageRequest, callback: grpc.requestCallback<_chat_ChatMessageResponse__Output>): grpc.ClientUnaryCall;
  
}

export interface ChatServiceHandlers extends grpc.UntypedServiceImplementation {
  AddGroupMember: grpc.handleUnaryCall<_chat_GroupMemberRequest__Output, _chat_GroupResponse>;
  
  CreateGroup: grpc.handleUnaryCall<_chat_CreateGroupRequest__Output, _chat_GroupResponse>;
  
  GetGroupChatHistory: grpc.handleUnaryCall<_chat_GroupChatHistoryRequest__Output, _chat_ChatMessagesResponse>;
  
  GetPrivateChatHistory: grpc.handleUnaryCall<_chat_PrivateChatHistoryRequest__Output, _chat_ChatMessagesResponse>;
  
  RemoveGroupMember: grpc.handleUnaryCall<_chat_GroupMemberRequest__Output, _chat_GroupResponse>;
  
  SendGroupMessage: grpc.handleUnaryCall<_chat_GroupMessageRequest__Output, _chat_ChatMessageResponse>;
  
  SendPrivateMessage: grpc.handleUnaryCall<_chat_PrivateMessageRequest__Output, _chat_ChatMessageResponse>;
  
}

export interface ChatServiceDefinition extends grpc.ServiceDefinition {
  AddGroupMember: MethodDefinition<_chat_GroupMemberRequest, _chat_GroupResponse, _chat_GroupMemberRequest__Output, _chat_GroupResponse__Output>
  CreateGroup: MethodDefinition<_chat_CreateGroupRequest, _chat_GroupResponse, _chat_CreateGroupRequest__Output, _chat_GroupResponse__Output>
  GetGroupChatHistory: MethodDefinition<_chat_GroupChatHistoryRequest, _chat_ChatMessagesResponse, _chat_GroupChatHistoryRequest__Output, _chat_ChatMessagesResponse__Output>
  GetPrivateChatHistory: MethodDefinition<_chat_PrivateChatHistoryRequest, _chat_ChatMessagesResponse, _chat_PrivateChatHistoryRequest__Output, _chat_ChatMessagesResponse__Output>
  RemoveGroupMember: MethodDefinition<_chat_GroupMemberRequest, _chat_GroupResponse, _chat_GroupMemberRequest__Output, _chat_GroupResponse__Output>
  SendGroupMessage: MethodDefinition<_chat_GroupMessageRequest, _chat_ChatMessageResponse, _chat_GroupMessageRequest__Output, _chat_ChatMessageResponse__Output>
  SendPrivateMessage: MethodDefinition<_chat_PrivateMessageRequest, _chat_ChatMessageResponse, _chat_PrivateMessageRequest__Output, _chat_ChatMessageResponse__Output>
}
