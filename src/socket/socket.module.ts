import { Module } from '@nestjs/common';
import { SocketIoProvider } from './socket.provider';

@Module({
  providers: [SocketIoProvider],
  exports: [SocketIoProvider],
})
export class SocketModule {}
