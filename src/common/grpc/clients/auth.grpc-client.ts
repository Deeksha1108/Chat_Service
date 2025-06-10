import { ClientProxyFactory, Transport } from '@nestjs/microservices';
import { join } from 'path';

export const AuthClient = ClientProxyFactory.create({
  transport: Transport.GRPC,
  options: {
    package: 'auth',
    protoPath: join(__dirname, 'src/common/grpc/proto/auth.proto'),
    url: 'localhost:5001',
  },
});
