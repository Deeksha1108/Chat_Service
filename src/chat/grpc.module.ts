import { Module } from '@nestjs/common';
import { GrpcClientModule } from 'src/common/grpc/clients/grpc-clients.module';
import { GrpcChatService } from './grpc.service';
import { ChatControllerGrpc } from './grpc.controller';

@Module({
  imports: [GrpcClientModule],
  controllers: [ChatControllerGrpc],
  providers: [GrpcChatService],
})
export class ChatModuleGrpc {}
