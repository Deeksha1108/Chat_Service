<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<p align="center">
  A private messaging API built using <a href="http://nestjs.com/" target="_blank">NestJS</a> with support for one-to-one conversations, message delivery tracking, read status, and offline message handling via Redis.
</p>

---

## Description

This backend service is designed for real-time private messaging between users. Built with **NestJS**, it supports:

- One-to-one chat conversations
- Message sending, editing, and soft-deletion
- Delivery and read receipt tracking
- Offline message queuing using Redis
- MongoDB for message persistence
- DTO validation and custom pipes

---

## Installation

```bash
npm install
```

---

## Running the Project

```bash
# Start in development mode
npm run start:dev

# Start in production mode
npm run start:prod
```

---

## Tech Stack

- **NestJS** (Node.js Framework)
- **MongoDB** with Mongoose
- **Redis** for storing offline messages
- **gRPC** for communicate with Auth Service
- **JWTAuthGuard** for validate the token from auth
- **TypeScript**
- **class-validator** for input validation
- **Custom Pipes** like `ObjectIdPipe`

---

## API Endpoints

### Conversations

#### `POST /chat/conversation`

Create or retrieve a conversation between two users.

**Request Body:**

```json
{
  "user1": "<UserID>",
  "user2": "<UserID>"
}
```

#### `GET /chat/conversations/:userId`

Fetch all conversations involving a user.

---

### Messages

#### `POST /chat/messages`

Send a message to another user.

**Request Body:**

```json
{
  "senderId": "<UserID>",
  "receiverId": "<UserID>",
  "roomId": "<RoomID>",
  "content": "Hello there!"
}
```

#### `GET /chat/messages/:roomId?userId=<UserID>`

Fetch all messages in a room. Optionally pass `userId` to customize visibility or filtering.

#### `PUT /chat/message/:messageId`

Edit an existing message (allowed only within 15 minutes of sending).

**Request Body:**

```json
{
  "senderId": "<UserID>",
  "content": "Updated message"
}
```

#### `DELETE /chat/message/:messageId/:requesterId`

Soft-delete a message (only the sender can delete their own message).

---

### Delivery & Read Status

#### `PATCH /chat/messages/delivered`

Bulk mark multiple messages as delivered.

**Request Body:**

```json
{
  "messageIds": ["<MessageID>", "<MessageID>"]
}
```

#### `PATCH /chat/message/:id/delivered`

Mark a single message as delivered.

#### `PATCH /chat/message/read/:messageId`

Mark a specific message as read.

#### `PATCH /chat/message/read/room/:roomId/user/:userId`

Mark all messages in a specific room as read by a user.

---

### Unread & Offline

#### `GET /chat/message/unread/:userId`

Get the total number of unread messages for a user.

#### `GET /chat/offline/:userId`

Retrieve offline messages stored in Redis for a user.

---

## Events & Payloads

| Event                   | Type     | Sent/Received | Payload                     |
| ----------------------- | -------- | ------------- | --------------------------- |
| `connect`               | Built-in | Sent          | `auth.token`                |
| `disconnect`            | Built-in | Received      | —                           |
| `join_or_create_room`   | Custom   | Sent          | `{ participantId }`         |
| `join_room_success`     | Custom   | Received      | room + user info            |
| `send_message`          | Custom   | Sent          | messageData                 |
| `receive_message`       | Custom   | Received      | message                     |
| `message_delivered`     | Custom   | Sent          | `{ messageId }`             |
| `message_delivered_ack` | Custom   | Received      | status                      |
| `message_read`          | Custom   | Sent          | `{ messageId }`             |
| `message_read_ack`      | Custom   | Received      | read info                   |
| `edit_message`          | Custom   | Sent          | `{ messageId, newContent }` |
| `edit_message_status`   | Custom   | Received      | status                      |
| `delete_message`        | Custom   | Sent          | `{ messageId }`             |
| `delete_message_status` | Custom   | Received      | status                      |

---

## Project Structure (Key Modules)

```
chat_service/
├── src/
│   ├── app.module.ts
│   ├── main.ts
│
│   ├── auth/                             # gRPC AuthService integration
│   │   └── auth.module.ts
│   │
│
│   ├── chat/
│   │   ├── private/                      # 1-on-1 chat
│   │   │   ├── dto/
│   │   │   ├── schemas/
│   │   │   ├── private.controller.ts
│   │   │   ├── private.gateway.ts
│   │   │   ├── private.service.ts
│   │   │   └── private.module.ts
│   │   │
│   │   ├── group/                        # Group chat
│   │   │   ├── dto/
│   │   │   ├── schemas/
│   │   │   ├── group.controller.ts
│   │   │   ├── group.gateway.ts
│   │   │   ├── group.service.ts
│   │   │   └── group.module.ts
│   │   │
│   │
│
│   ├── grpc/                             # gRPC-related
│   │   ├── proto/
│   │   │   ├── auth.proto
│   │   │   └── chat.proto
│   │   └── clients/
│   │       └── grpc-clients.module.ts
│
│   ├── redis/                            # Redis socket session mapping
│   │   ├── redis.adapter.ts
│   │   └── redis.constants.ts
│   │   └── redis.interface.ts
│   │   └── redis.module.ts
│   │   └── redis.service.ts
│
│   ├── guards/
│   │   ├── jwt-auth.guard.ts
│   │   └── group-admin.guard.ts
│
│   ├── socket/                           # Common WebSocket logic (adapter etc.)
│   │   ├── socket.constants.ts
│   │   │
│   │   ├── socket.module.ts                     # Socket payload & client interfaces
│   │   │
│   │   └── socket.provider.ts
│
│   ├── pipes/
│   │   └── objectid.pipe.ts              # Custom validation pipe for ObjectIds
│
│   ├── strategies/
│   │   └── jwt.strategy.ts
│
│   ├── types/
│   │   └── express.d.ts                  # AuthRequest override for Express
│
│
├── .env
├── package.json
├── tsconfig.json
└── README.md

```

---

## Author

Made by [Deeksha]

---
