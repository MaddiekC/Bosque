import { Injectable } from '@angular/core';
import { HttpEvent, HttpHandler, HttpInterceptor, HttpRequest } from '@angular/common/http';
import { Observable } from 'rxjs';
import { AuthserviceService } from './authservice.service';


@Injectable()
export class JwtInterceptor implements HttpInterceptor {
  constructor(private auth: AuthserviceService) { }

  intercept(req: HttpRequest<any>, next: HttpHandler): Observable<HttpEvent<any>> {
    const token = this.auth.getToken();

    let headers = req.headers.set('Accept', 'application/json');
    if (token) {
      headers = headers.set('Authorization', `Bearer ${token}`);
    }

    const cloned = req.clone({ headers });
    return next.handle(cloned);
  }
  //     const token = this.auth.getToken();

  //   if (token) {
  //     const cloned = req.clone({
  //       headers: req.headers.set('Authorization', `Bearer ${token}`)
  //     });
  //     return next.handle(cloned);
  //   }

  //   return next.handle(req);
  // }
}





