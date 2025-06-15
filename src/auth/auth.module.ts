import { Module } from '@nestjs/common';
import { PassportModule } from '@nestjs/passport';
import { JwtStrategy } from 'src/strategies/jwt.strategy';
import { GrpcClientModule } from 'src/grpc/clients/grpc-clients.module';

@Module({
  imports: [PassportModule, GrpcClientModule],
  providers: [JwtStrategy],
})
export class AuthModule {}
