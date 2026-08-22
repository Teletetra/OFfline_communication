import {create} from 'zustand';
import {User} from '../types/user.types';
interface UserState{users:User[];selectedUser:User|null;setUsers:(users:User[])=>void;selectUser:(user:User|null)=>void;updatePresence:(id:string,online:boolean)=>void;}
export const useUserStore=create<UserState>((set)=>({users:[],selectedUser:null,setUsers:(users)=>set({users}),selectUser:(selectedUser)=>set({selectedUser}),updatePresence:(id,online)=>set(state=>({users:state.users.map(u=>u.id===id?{...u,isOnline:online}:u),selectedUser:state.selectedUser?.id===id?{...state.selectedUser,isOnline:online}:state.selectedUser}))}));
