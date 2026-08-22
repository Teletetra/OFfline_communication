import { BadRequestException, Injectable, PipeTransform } from '@nestjs/common';
@Injectable()
export class FileValidationPipe implements PipeTransform { transform(file:any){ if(!file) throw new BadRequestException('File is required'); const max=Number(process.env.MAX_FILE_SIZE||10485760); if(file.size>max) throw new BadRequestException('File too large'); return file; } }