import { Module } from '@nestjs/common';
import { AuthClient } from './auth.grpc-client';
import { ChatClient } from './chat.grpc-client';

@Module({
  providers: [
    {
      provide: 'AUTH_SERVICE',
      useFactory: () => AuthClient,
    },
    {
      provide: 'CHAT_SERVICE',
      useFactory: () => ChatClient,
    },
  ],
  exports: ['AUTH_SERVICE', 'CHAT_SERVICE'],
})
export class GrpcClientModule {}
