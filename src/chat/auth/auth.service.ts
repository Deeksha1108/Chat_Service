import { Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthService {
  constructor(private readonly jwtService: JwtService) {}

  async login(loginDto: LoginDto) {
    const { username, password } = loginDto;

    // Mock check — replace later with real user DB call
    if (username !== 'admin' || password !== 'password') {
      throw new UnauthorizedException('Invalid credentials');
    }
    const payload = {
      id: 'user-id-123',
      username: 'admin',
      email: 'admin@example.com',
    };

    // for real user-service integration
    // const user = await this.userService.validateUser(username, password);
    // if (!user) {
    //   throw new UnauthorizedException('Invalid credentials');
    // }
    // const payload = {
    //   id: user._id,
    //   username: user.username,
    //   email: user.email,
    // };

    const token = this.jwtService.sign(payload);
    return {
      token,
      user: payload,
    };
  }
}
