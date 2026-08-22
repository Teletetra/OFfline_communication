import { Injectable, NestMiddleware } from '@nestjs/common';
import compression from 'compression';
@Injectable()
export class CompressionMiddleware { private readonly middleware=compression(); use(req:any,res:any,next:any){ return this.middleware(req,res,next); } }