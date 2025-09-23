import { Injectable } from '@angular/core';
import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable, throwError } from 'rxjs';
import { AuthserviceService } from './authservice.service';
import { catchError } from 'rxjs/operators';
import { Router } from '@angular/router';


@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  constructor(private auth: AuthserviceService, private router: Router) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.auth.getToken();

    let headers = req.headers.set('Accept', 'application/json');
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    const cloned = req.clone({ headers });
    return next.handle(cloned).pipe(
      catchError((err: HttpErrorResponse) => {
        // Si recibimos 401, token expirado o inválido
        if (err.status === 401) {
          alert('Sesión Exprirada')
          // Limpiamos el estado de login
          this.auth.logout();
          // Redirigimos al login
          this.router.navigate(['/login']);
        }
        // Re‑lanza el error para que otras partes (ej. componentes) puedan manejarlo si quieren
        return throwError(() => err);
      })
    );
  }
}


// import { Injectable } from '@angular/core';
// import {
//   HttpErrorResponse,
//   HttpEvent,
//   HttpHandler,
//   HttpInterceptor,
//   HttpRequest,
//   HttpResponse
// } from '@angular/common/http';
// import { Observable, BehaviorSubject, throwError, of } from 'rxjs';
// import { catchError, filter, switchMap, take, tap, finalize } from 'rxjs/operators';
// import { AuthserviceService } from './authservice.service';
// import { Router } from '@angular/router';

// @Injectable()
// export class JwtInterceptor implements HttpInterceptor {
//   private isRefreshing = false;
//   private refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

//   constructor(private auth: AuthserviceService, private router: Router) { }

//   intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
//     const token = this.auth.getToken();
//     let headers = req.headers.set('Accept', 'application/json');

//     if (token) {
//       headers = headers.set('Authorization', `Bearer ${token}`);
//     }

//     const clonedReq = req.clone({ headers });

//     return next.handle(clonedReq).pipe(
//       tap(evt => {
//         // Si el backend devuelve un token nuevo en la cabecera Authorization, guardarlo
//         if (evt instanceof HttpResponse) {
//           const authHeader = evt.headers.get('Authorization') || evt.headers.get('authorization');
//           if (authHeader && authHeader.startsWith('Bearer ')) {
//             const newToken = authHeader.substring(7);
//             this.auth.setToken(newToken);
//           } else {
//             // si el body trae token como { token: '...' } o { access_token: '...' }
//             try {
//               const body: any = evt.body;
//               if (body && (body.token || body.access_token)) {
//                 const newToken = body.token || body.access_token;
//                 this.auth.setToken(newToken);
//               }
//             } catch (e) {
//               // ignore
//             }
//           }
//         }
//       }),
//       catchError(err => {
//         // Si 401 -> intentar refresh y reintentar
//         if (err instanceof HttpErrorResponse && err.status === 401) {
//           return this.handle401Error(clonedReq, next);
//         }
//         return throwError(() => err);
//       })
//     );
//   }

//   private handle401Error(req: HttpRequest<any>, next: HttpHandler) {
//     // Si ya estamos refrescando, esperamos al resultado
//     if (this.isRefreshing) {
//       return this.refreshTokenSubject.pipe(
//         filter(token => token != null),
//         take(1),
//         switchMap((tkn) => {
//           // reintentar petición con nuevo token
//           const headers = req.headers.set('Authorization', `Bearer ${tkn}`);
//           return next.handle(req.clone({ headers }));
//         })
//       );
//     } else {
//       this.isRefreshing = true;
//       this.refreshTokenSubject.next(null);

//       // Llamar al refresh token del servicio
//       return this.auth.refreshToken().pipe(
//         switchMap((newToken) => {
//           if (newToken) {
//             this.refreshTokenSubject.next(newToken);
//             // reintentar la petición original con el token nuevo
//             const headers = req.headers.set('Authorization', `Bearer ${newToken}`);
//             return next.handle(req.clone({ headers }));
//           }
//           // si refresh no devolvió token -> forzar logout
//           this.auth.logout();
//           this.router.navigate(['/login']);
//           return throwError(() => new Error('No se pudo refrescar token'));
//         }),
//         catchError((err) => {
//           // refresh falló (token inválido / refresh caducado)
//           this.auth.logout();
//           this.router.navigate(['/login']);
//           return throwError(() => err);
//         }),
//         finalize(() => {
//           this.isRefreshing = false;
//         })
//       );
//     }
//   }
// }


