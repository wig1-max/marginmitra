import {
  CanActivate,
  ExecutionContext,
  Injectable,
  UnauthorizedException
} from '@nestjs/common';

import { RequestWithUser } from '../../../common/interfaces/request-with-user';
import { AuthService } from '../auth.service';

@Injectable()
export class AppAuthGuard implements CanActivate {
  constructor(private readonly authService: AuthService) {}

  async canActivate(context: ExecutionContext): Promise<boolean> {
    const request = context.switchToHttp().getRequest<RequestWithUser>();
    const authorizationHeader = request.headers.authorization;

    if (!authorizationHeader?.startsWith('Bearer ')) {
      throw new UnauthorizedException('Missing bearer token.');
    }

    const token = authorizationHeader.slice('Bearer '.length).trim();
    request.user = await this.authService.authenticateBearerToken(token);
    return true;
  }
}

