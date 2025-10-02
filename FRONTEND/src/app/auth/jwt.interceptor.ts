import { Injectable } from '@angular/core';
import { HttpInterceptor, HttpRequest, HttpHandler, HttpEvent, HttpErrorResponse } from '@angular/common/http';
import { Observable, throwError, BehaviorSubject } from 'rxjs';
import { catchError, switchMap, filter, take } from 'rxjs/operators';
import { AuthserviceService } from './authservice.service';
import { Router } from '@angular/router';

@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  private isRefreshing = false;
  private refreshTokenSubject: BehaviorSubject<string | null> = new BehaviorSubject<string | null>(null);

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
        if (err.status === 401) {
          // intentar refresh
          if (!this.isRefreshing) {
            this.isRefreshing = true;
            this.refreshTokenSubject.next(null);

            return this.auth.refreshToken().pipe(
              switchMap(newToken => {
                this.isRefreshing = false;
                this.refreshTokenSubject.next(newToken);
                // reintento de la petición original con el nuevo token
                const authReq = req.clone({
                  headers: req.headers.set('Authorization', `Bearer ${newToken}`)
                });
                return next.handle(authReq);
              }),
              catchError(refreshErr => {
                // refresh falló -> cerrar sesión y redirigir
                this.isRefreshing = false;
                this.auth.logout();
                this.router.navigate(['/login']);
                return throwError(() => refreshErr);
              })
            );
          } else {
            // si ya está refrescando, esperamos a que termine
            return this.refreshTokenSubject.pipe(
              filter(t => t != null),
              take(1),
              switchMap((tok) => {
                const authReq = req.clone({
                  headers: req.headers.set('Authorization', `Bearer ${tok}`)
                });
                return next.handle(authReq);
              })
            );
          }
        }

        return throwError(() => err);
      })
    );
  }
}

// import { Injectable } from '@angular/core';
// import { HttpErrorResponse, HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
// import { Observable, throwError } from 'rxjs';
// import { AuthserviceService } from './authservice.service';
// import { catchError } from 'rxjs/operators';
// import { Router } from '@angular/router';


// @Injectable()
// export class JwtInterceptor implements HttpInterceptor {
//   constructor(private auth: AuthserviceService, private router: Router) { }

//   intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
//     const token = this.auth.getToken();

//     let headers = req.headers.set('Accept', 'application/json');
//     if (token) {
//       headers = headers.set('Authorization', `Bearer ${token}`);
//     }

//     const cloned = req.clone({ headers });
//     return next.handle(cloned).pipe(
//       catchError((err: HttpErrorResponse) => {
//         // Si recibimos 401, token expirado o inválido
//         if (err.status === 401) {
//           alert('Sesión Exprirada')
//           // Limpiamos el estado de login
//           this.auth.logout();
//           // Redirigimos al login
//           this.router.navigate(['/login']);
//         }
//         // Re‑lanza el error para que otras partes (ej. componentes) puedan manejarlo si quieren
//         return throwError(() => err);
//       })
//     );
//   }
// }


