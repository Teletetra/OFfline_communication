import { Catch, ArgumentsHost, WsExceptionFilter } from '@nestjs/common';
import { WsException } from '@nestjs/websockets';
@Catch(WsException)
export class WebsocketExceptionFilter implements WsExceptionFilter { catch(exception: WsException, host: ArgumentsHost) { return { success:false, message:exception.getError() }; } }