import { Injectable, NestMiddleware } from '@nestjs/common';
import { Request, Response, NextFunction } from 'express';
@Injectable()
export class CorsMiddleware implements NestMiddleware { use(_req:Request,res:Response,next:NextFunction){ res.header('Access-Control-Allow-Origin', process.env.CORS_ORIGIN || '*'); res.header('Access-Control-Allow-Credentials','true'); res.header('Access-Control-Allow-Headers','Origin, X-Requested-With, Content-Type, Accept, Authorization'); next(); } }