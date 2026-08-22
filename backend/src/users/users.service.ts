import { ConflictException, Injectable, NotFoundException } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { User } from './entities/user.entity';

@Injectable()
export class UsersService {
 constructor(@InjectRepository(User) private readonly repo:Repository<User>) {}
 async create(data:Partial<User>){ const user=this.repo.create(data); return this.repo.save(user); }
 findById(id:string){ return this.repo.findOne({where:{id}}); }
 findByEmail(email:string){ return this.repo.createQueryBuilder('user').addSelect('user.password').where('user.email = :email',{email}).getOne(); }
 findByUsername(username:string){ return this.repo.findOne({where:{username}}); }
 findByEmailOrUsername(email:string,username:string){ return this.repo.createQueryBuilder('user').where('user.email=:email OR user.username=:username',{email,username}).getOne(); }
 async update(id:string,data:Partial<User>){ const user=await this.findById(id); if(!user)throw new NotFoundException('User not found'); Object.assign(user,data); return this.repo.save(user); }
 async updateProfile(id:string,data:Partial<User>){ return this.update(id,data); }
 async updatePassword(id:string,password:string){ return this.repo.update(id,{password}); }
 async updatePrivateKey(id:string,key:string){ return this.repo.update(id,{encryptedPrivateKey:key} as any); }
 async updateLastLogin(id:string){ return this.repo.update(id,{lastSeen:new Date(),isOnline:true}); }
 async setOnline(id:string,online:boolean){ return this.repo.update(id,{isOnline:online,lastSeen:online?undefined:new Date()}); }
 async remove(id:string){ const user=await this.findById(id); if(!user)throw new NotFoundException('User not found'); await this.repo.remove(user); }
 async search(query:string,limit=20){ return this.repo.createQueryBuilder('user').where('user.username LIKE :q OR user.email LIKE :q',{q:`%${query}%`}).take(limit).getMany(); }
}