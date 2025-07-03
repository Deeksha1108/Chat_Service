import { ExtractJwt, Strategy } from 'passport-jwt';
import {
  Inject,
  Injectable,
  Logger,
  UnauthorizedException,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { PassportStrategy } from '@nestjs/passport';
import { lastValueFrom, Observable } from 'rxjs';
import { ClientGrpc } from '@nestjs/microservices';

interface AuthGrpcService {
  ValidateToken(data: { access_token: string }): Observable<any>;
}

@Injectable()
export class JwtStrategy extends PassportStrategy(Strategy, 'jwt') {
  private authService: AuthGrpcService;
  private readonly logger = new Logger(JwtStrategy.name);

  constructor(
    @Inject('AUTH_SERVICE') private readonly client: ClientGrpc,
    private readonly configService: ConfigService,
  ) {
    super({
      jwtFromRequest: ExtractJwt.fromAuthHeaderAsBearerToken(),
      ignoreExpiration: false,
      secretOrKey: configService.get('JWT_ACCESS_SECRET') || 'Akshita@123',
      passReqToCallback: true,
    });
    this.logger.log('[JwtStrategy] Constructed');
  }

  onModuleInit() {
    this.logger.log('[JwtStrategy] onModuleInit called');
    this.authService = this.client.getService<AuthGrpcService>('AuthService');
  }

  async validate(req: any, payload: any) {
    const token = ExtractJwt.fromAuthHeaderAsBearerToken()(req);
    this.logger.log('Extracted Token:', token);

    if (!token) throw new UnauthorizedException('Token not found');

    try {
      this.logger.log(
        'Sending token to gRPC:',
        JSON.stringify({ access_token: token }, null, 2),
      );

      const user = await lastValueFrom(
        this.authService.ValidateToken({ access_token: token }),
      );
      console.log(user);
      this.logger.log('gRPC response read:', JSON.stringify(user, null, 2));

      if (!user || !user.userId) {
        this.logger.warn(
          'Token validated but userId missing or invalid:',
          JSON.stringify(user, null, 2),
        );
        throw new UnauthorizedException('Unauthorized: Invalid user');
      }
      const userObject = {
        id: user.userId,
        email: user.email,
        role: user.role,
      };

      this.logger.log(
        'Returning validated user:',
        JSON.stringify(userObject, null, 2),
      );

      return userObject;
    } catch (err) {
      this.logger.error('Token validation failed:', err.message || err);
      throw new UnauthorizedException('Invalid or expired token');
    }
  }
}
