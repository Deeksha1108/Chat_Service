<p align="center">
  <a href="http://nestjs.com/" target="blank"><img src="https://nestjs.com/img/logo-small.svg" width="120" alt="Nest Logo" /></a>
</p>

<p align="center">
  A private messaging API built using <a href="http://nestjs.com/" target="_blank">NestJS</a> with support for one-to-one conversations, message delivery tracking, read status, and offline message handling via Redis.
</p>

---

## 🚀 Description

This backend service is designed for real-time private messaging between users. Built with **NestJS**, it supports:

- One-to-one chat conversations
- Message sending, editing, and soft-deletion
- Delivery and read receipt tracking
- Offline message queuing using Redis
- MongoDB for message persistence
- DTO validation and custom pipes

---

## 📦 Installation

```bash
npm install
```

---

## 🔧 Running the Project

```bash
# Start in development mode
npm run start:dev

# Start in production mode
npm run start:prod
```

---

## 🛠️ Tech Stack

- **NestJS** (Node.js Framework)
- **MongoDB** with Mongoose
- **Redis** for storing offline messages
- **TypeScript**
- **class-validator** for input validation
- **Custom Pipes** like `ObjectIdPipe`

---

## 📘 API Endpoints

### 🔁 Conversations

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

### ✉️ Messages

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

### ✅ Delivery & Read Status

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

### 📥 Unread & Offline

#### `GET /chat/message/unread/:userId`

Get the total number of unread messages for a user.

#### `GET /chat/offline/:userId`

Retrieve offline messages stored in Redis for a user.

---

## 📂 Project Structure (Key Modules)

```
src/
├── chat/
│   ├── chat.controller.ts
│   ├── chat.service.ts
│   ├── dto/
│   └── ...
├── redis/
│   └── redis.service.ts
├── pipes/
│   └── objectid.pipe.ts
```

---

## 👨‍💻 Author

Made with ❤️ by [Deeksha]

---

## 📄 License

This project is licensed under the MIT License.
