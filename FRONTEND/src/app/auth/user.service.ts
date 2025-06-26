
import { Injectable } from '@angular/core';

export interface User {
  username: string;
  rol_id: number;
  group_id: number;
  // otros campos si quieres
}

@Injectable({
  providedIn: 'root'
})
export class UserService {
  private user: User | null = null;

  setUserFromToken(token: string) {
    const payload = JSON.parse(atob(token.split('.')[1]));
    this.user = {

      username: payload.username,
    
      rol_id: payload.rol_id,
      group_id: payload.group_id
    };
  }

  setUser(user: User) {
    this.user = user;
  }

  getUser(): User | null {
    return this.user;
  }

  getUsername(): string | null {
    return this.user?.username ?? 'Invitado';
  }
  getRolId(): number {
    return this.user?.rol_id ?? 0;
  }

  getGroupId(): number {
    return this.user?.group_id ?? 0;
  }

  clearUser() {
    this.user = null;
  }

  isAuthenticated(): boolean {
    return !!this.user;
  }
}
