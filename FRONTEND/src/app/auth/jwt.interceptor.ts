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




