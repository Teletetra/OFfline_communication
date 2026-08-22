import * as crypto from 'crypto';
export const randomToken = (bytes = 32) => crypto.randomBytes(bytes).toString('hex');
export const sha256 = (value: string) => crypto.createHash('sha256').update(value).digest('hex');
export const timingSafeEqual = (a: string, b: string) => { const aa=Buffer.from(a); const bb=Buffer.from(b); return aa.length===bb.length && crypto.timingSafeEqual(aa,bb); };