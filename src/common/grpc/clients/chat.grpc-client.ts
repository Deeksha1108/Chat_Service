import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { join } from 'path';

export const ChatClient = ClientProxyFactory.create({
  transport: Transport.GRPC,
  options: {
    package: 'chat',
    protoPath: join(__dirname, '../proto/chat.proto'),
    url: 'localhost:5002', // ✅ Replace with actual chat service URL/port
  },
});
