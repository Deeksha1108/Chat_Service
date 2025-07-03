import { Module } from '@nestjs/common';
import { ClientsModule, Transport } from '@nestjs/microservices';
import { join } from 'path';

export const AUTH_SERVICE = 'AUTH_SERVICE';
export const USER_SERVICE = 'USER_SERVICE';

@Module({
  imports: [
    ClientsModule.register([
      {
        name: AUTH_SERVICE,
        transport: Transport.GRPC,
        options: {
          loader: {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true,
          },
          package: 'auth',
          protoPath: join(process.cwd(), 'src/grpc/proto/auth.proto'),
          url: process.env.AUTH_SERVICE_URL || 'localhost:50054',
        },
      },
      {
        name: USER_SERVICE,
        transport: Transport.GRPC,
        options: {
          loader: {
            keepCase: true,
            longs: String,
            enums: String,
            defaults: true,
            oneofs: true,
          },
          package: 'user',
          protoPath: join(process.cwd(), 'src/grpc/proto/user.proto'),
          url: process.env.USER_SERVICE_URL || 'localhost:50051',
        },
      },
    ]),
  ],
  exports: [ClientsModule],
})
export class GrpcClientModule {}
