import { Role } from '../constants/roles';
export interface AuthenticatedUser { id: string; email: string; username: string; roles: Role[]; }