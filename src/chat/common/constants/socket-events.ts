export const SocketEvents = {
  CONNECTION: 'connection',
  DISCONNECT: 'disconnect',
  ERROR: 'chat-error',

  PRIVATE: {
    MESSAGE: 'private-message',
    MESSAGE_ACK: 'private-message-ack',
    TYPING: 'typing-indicator',
    ONLINE_STATUS: 'presence-update',
    READ_RECEIPT: 'message-read',
    NOTIFICATION: 'new-chat-notification',
  },

  GROUP: {
    CREATE: 'group-create',
    JOIN: 'group-join',
    LEAVE: 'group-leave',
    MESSAGE: 'group-message',
    UPDATE: 'group-update',
    ADD_MEMBER: 'group-add-member',
    REMOVE_MEMBER: 'group-remove-member',
    PROMOTE_ADMIN: 'group-promote-admin',
    TYPING: 'group-typing-indicator',
    NOTIFICATION: 'new-group-notification',
  },

  PUBSUB: {
    GROUP_MESSAGES: 'group-messages',
    PRIVATE_MESSAGES: 'private-messages',
    PRESENCE_UPDATES: 'presence-updates',
  },
} as const;

export type SocketEventType = typeof SocketEvents;
