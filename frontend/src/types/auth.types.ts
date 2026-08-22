export interface AuthUser{id:string;username:string;email?:string;avatarUrl?:string|null;isOnline?:boolean;}
export interface AuthTokens{token:string;refreshToken?:string;}
export interface LoginPayload{email:string;password:string;}
export interface RegisterPayload{username:string;email:string;password:string;}
