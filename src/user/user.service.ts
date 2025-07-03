import { Inject, Injectable, Logger, OnModuleInit } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { UserResponse, UserServiceClient } from './user.interface';
import { USER_SERVICE } from 'src/grpc/clients/grpc.constants';

@Injectable()
export class UserGrpcService implements OnModuleInit {
  private userService: UserServiceClient;

  constructor(@Inject(USER_SERVICE) private readonly client: ClientGrpc) {}

  onModuleInit() {
    this.userService = this.client.getService<UserServiceClient>('UserService');
  }

  async findUserById(id: string): Promise<UserResponse | null> {
    try {
      return await lastValueFrom(this.userService.FindOne({ id }));
    } catch (error) {
      Logger.warn(`User fetch failed via gRPC: ${error.message}`);
      return null;
    }
  }
  async getUserName(
    id: string,
  ): Promise<{ fullName: string; username: string } | null> {
    try {
      const res = await lastValueFrom(
        this.userService.GetUserName({ userId: id }),
      );
      return {
        fullName: res.fullName,
        username: res.username,
      };
    } catch (error) {
      Logger.warn(`getUserName failed via gRPC: ${error.message}`);
      return null;
    }
  }
}
