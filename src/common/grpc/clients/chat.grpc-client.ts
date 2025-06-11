import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { join } from 'path';

export const ChatClient = ClientProxyFactory.create({
  transport: Transport.GRPC,
  options: {
    package: 'chat',
    protoPath: join(process.cwd(), 'src/common/grpc/proto/chat.proto'),
    url: 'localhost:5002',
  },
});
