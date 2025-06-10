import { Inject, Injectable } from '@nestjs/common';
import { ClientGrpc } from '@nestjs/microservices';
import { lastValueFrom } from 'rxjs';
import { ValidateTokenResponse } from 'src/types/auth.types';

interface ChatServiceGrpc {
  SendPrivateMessage(data: any): any;
  GetPrivateChatHistory(data: any): any;
  SendGroupMessage(data: any): any;
  GetGroupChatHistory(data: any): any;
}

interface AuthServiceGrpc {
  ValidateToken(data: { accessToken: string }): any;
}

@Injectable()
export class GrpcChatService {
  private chatService: ChatServiceGrpc;
  private authService: AuthServiceGrpc;

  constructor(
    @Inject('CHAT_SERVICE') private readonly chatClient: ClientGrpc,
    @Inject('AUTH_SERVICE') private readonly authClient: ClientGrpc,
  ) {}

  onModuleInit() {
    this.chatService = this.chatClient.getService<ChatServiceGrpc>('ChatService');
    this.authService = this.authClient.getService<AuthServiceGrpc>('AuthService');
  }

  async validateToken(accessToken: string): Promise<ValidateTokenResponse> {
    return await lastValueFrom(this.authService.ValidateToken({ accessToken }));
  }

  async sendPrivateMessage(data: any) {
    return await lastValueFrom(this.chatService.SendPrivateMessage(data));
  }

  async getPrivateChatHistory(data: any) {
    return await lastValueFrom(this.chatService.GetPrivateChatHistory(data));
  }

  async sendGroupMessage(data: any) {
    return await lastValueFrom(this.chatService.SendGroupMessage(data));
  }

  async getGroupChatHistory(data: any) {
    return await lastValueFrom(this.chatService.GetGroupChatHistory(data));
  }
}
