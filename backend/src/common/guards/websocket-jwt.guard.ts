import { CanActivate, ExecutionContext, Injectable, UnauthorizedException } from '@nestjs/common';
import { JwtService } from '@nestjs/jwt';
@Injectable()
export class WebsocketJwtGuard implements CanActivate {
  constructor(private readonly jwtService: JwtService) {}
  canActivate(context: ExecutionContext) { const client=context.switchToWs().getClient(); const token=client.handshake?.auth?.token; if(!token) throw new UnauthorizedException('Missing socket token'); try { client.user=this.jwtService.verify(token); return true; } catch { throw new UnauthorizedException('Invalid socket token'); } }
}