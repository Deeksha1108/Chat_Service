import { Module } from '@nestjs/common';
import { UserGrpcService } from './user.service';
import { GrpcClientModule } from 'src/grpc/clients/grpc-clients.module';

@Module({
  imports: [GrpcClientModule],
  providers: [UserGrpcService],
  exports: [UserGrpcService],
})
export class UserModule {}
