import { CanActivate, ExecutionContext, Injectable } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { ROLES_KEY } from '../decorators/roles.decorator';
@Injectable()
export class RolesGuard implements CanActivate {
  constructor(private readonly reflector: Reflector) {}
  canActivate(context: ExecutionContext) { const required=this.reflector.getAllAndOverride<string[]>(ROLES_KEY,[context.getHandler(),context.getClass()]); if(!required?.length) return true; const user=context.switchToHttp().getRequest().user; return required.some(role => (user?.roles || []).includes(role)); }
}