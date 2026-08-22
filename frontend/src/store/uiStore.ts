import {create} from 'zustand';
interface UiState{sidebarOpen:boolean;mobileMenuOpen:boolean;activeModal:string|null;setSidebarOpen:(v:boolean)=>void;setMobileMenuOpen:(v:boolean)=>void;openModal:(name:string)=>void;closeModal:()=>void;}
export const useUiStore=create<UiState>((set)=>({sidebarOpen:true,mobileMenuOpen:false,activeModal:null,setSidebarOpen:(sidebarOpen)=>set({sidebarOpen}),setMobileMenuOpen:(mobileMenuOpen)=>set({mobileMenuOpen}),openModal:(activeModal)=>set({activeModal}),closeModal:()=>set({activeModal:null})}));
