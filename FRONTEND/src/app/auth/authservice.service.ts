import { Injectable } from '@angular/core';
import { HttpClient, HttpHeaders } from '@angular/common/http';
import { BehaviorSubject, Observable, tap } from 'rxjs';
import { environment } from '../../environment/environment';
import { jwtDecode } from 'jwt-decode';
import { UserService } from './user.service';
import { PermissionService } from '../services/permission.service';

interface JwtPayload {
  username: string; // o usa el nombre real del campo con el username

  id: number,
  //rol_id: number;
  //group_id: number;// otros campos que incluya el token
}
interface LoginResponse {
  access_token: string;

  token_type: string;
  expires_in: number;
}


@Injectable({
  providedIn: 'root'
})


export class AuthserviceService {

  private baseUrl = environment.apiUrl;

  private tokenKey = 'jwt_token';
  private loggedIn = new BehaviorSubject<boolean>(this.hasToken());

  constructor(private http: HttpClient, private userService: UserService, private permissionService: PermissionService) {
    const token = this.getToken();
    //console.log('token 1:', token);
    if (token) {
      try {
        const decoded = jwtDecode<JwtPayload>(token);
        this.userService.setUser({
          username: decoded.username,

          id: decoded.id
          //rol_id: decoded.rol_id,
          //group_id: decoded.group_id

        })

      } catch (e) {
        console.error('Error al decodificar token en constructor', e);
        console.log('token:', token);
        this.userService.clearUser();
      }
    }
  }

  login(username: string, password: string): Observable<LoginResponse> {
    console.log('Intentando iniciar sesión con:', username);

    return this.http.post<LoginResponse>(`${this.baseUrl}/auth/login`, { username, password })
      .pipe(
        tap(response => {
          localStorage.setItem(this.tokenKey, response.access_token);
          this.loggedIn.next(true);

          const decoded = jwtDecode<JwtPayload>(response.access_token);
          //console.log('Token decodificado:', decoded);
          this.userService.setUser({
            username: decoded.username,

            id: decoded.id,
            //rol_id: decoded.rol_id,
            //group_id: decoded.group_id
          });
          this.loadPermissions().subscribe();
        })
      );
  }

  private loadPermissions(): Observable<number[]> {
    const headers = { Authorization: `Bearer ${this.getToken()}` };
    return this.http.get<number[]>(`${this.baseUrl}/me/permissions`, { headers })
      .pipe(
        tap(list => this.permissionService.setPermissions(list))
      );

  }

  logout() {
    localStorage.removeItem(this.tokenKey);
    this.loggedIn.next(false);
    this.userService.clearUser(); // << importante
  }

  isLoggedIn(): Observable<boolean> {
    return this.loggedIn.asObservable();
  }

  getToken(): string | null {
    return localStorage.getItem(this.tokenKey);
  }

  private hasToken(): boolean {
    return !!localStorage.getItem(this.tokenKey);
  }

  getUserInfo(): string | null {
    const token = this.getToken();
    if (token) {
      try {
        const decoded = jwtDecode<JwtPayload>(token);
        //console.log(decoded)
        return decoded.username; // cambia esto si el campo es distinto, como `username`
      } catch (e) {
        console.error('Token inválido:', e);
        return null;
      }
    }
    return null;
  }

  getUserId(): number | null {
    const token = this.getToken();
    if (token) {
      try {
        const decoded = jwtDecode<JwtPayload>(token);
        //console.log(decoded)
        return decoded.id;
      } catch (e) {
        console.error('Token inválido:', e);
        return null;
      }
    }
    return null;
  }
// refreshToken(): Observable<string | null> {
//     // llama al endpoint de refresh. Ajusta la ruta si tu backend usa otra.
//     return this.http.post<any>(`${this.baseUrl}/auth/refresh`, {}, { observe: 'response' })
//       .pipe(
//         map(resp => {
//           // 1) Preferimos header Authorization si existe
//           const authHeader = resp.headers.get('Authorization') || resp.headers.get('authorization');
//           if (authHeader && authHeader.startsWith('Bearer ')) {
//             const newToken = authHeader.substring(7);
//             this.setToken(newToken);
//             return newToken;
//           }
//           // 2) Si el body trae token (access_token o token)
//           const body = resp.body || {};
//           const newToken = body.access_token || body.token || null;
//           if (newToken) {
//             this.setToken(newToken);
//             return newToken;
//           }
//           // 3) si no vino token, retornar null
//           return null;
//         }),
//         // Si hay error, devolver null en vez de propagar (el interceptor decidirá qué hacer)
//         // Si quieres propagar el error, elimina catchError y deja que el interceptor lo capture.
//         // Aquí devolvemos null para que el interceptor trate el caso.
//         // catchError(() => of(null))  <-- importarlo si lo activas
//       );}
}
