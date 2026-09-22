import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';
import { provideHttpClient, withInterceptorsFromDi } from '@angular/common/http';
import { importProvidersFrom } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { HTTP_INTERCEPTORS } from '@angular/common/http';
import { JwtInterceptor } from './app/auth/jwt.interceptor';



bootstrapApplication(AppComponent, {
   providers: [
    provideRouter(routes),

    // Le dices a Angular que use tu interceptor
    provideHttpClient(
      withInterceptorsFromDi()
    ),

    importProvidersFrom(FormsModule),

    // Registras JwtInterceptor como HTTP_INTERCEPTORS
    {
      provide: HTTP_INTERCEPTORS,
      useClass: JwtInterceptor,
      multi: true
    }
  ]
});

