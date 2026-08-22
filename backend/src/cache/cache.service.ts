import { Injectable } from '@nestjs/common';
@Injectable()
export class CacheService {
  private readonly store=new Map<string,{value:any,expiresAt:number}>();
  async get<T>(key:string):Promise<T|undefined>{ const item=this.store.get(key); if(!item)return undefined; if(item.expiresAt && item.expiresAt<Date.now()){this.store.delete(key);return undefined;} return item.value as T; }
  async set<T>(key:string,value:T,ttlSeconds=60){this.store.set(key,{value,expiresAt:ttlSeconds?Date.now()+ttlSeconds*1000:0});return true;}
  async del(key:string){this.store.delete(key);return true;}
  async reset(){this.store.clear();}
}