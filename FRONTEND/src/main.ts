import { bootstrapApplication } from '@angular/platform-browser';
import { AppComponent } from './app/app.component';
import { provideRouter } from '@angular/router';
import { routes } from './app/app.routes';
import { provideHttpClient } from '@angular/common/http';
import { FormsModule } from '@angular/forms';
import { importProvidersFrom } from '@angular/core';




bootstrapApplication(AppComponent, {
  providers: [provideRouter(routes),
    provideHttpClient(),
    importProvidersFrom(FormsModule)
    ]
});

// bootstrapApplication(AppComponent, {
//   providers: [
//     provideRouter(routes),

//     // Trae HttpClientModule para habilitar HttpClient
//     importProvidersFrom(HttpClientModule, FormsModule),

//     // Registra tu interceptor de clase
//     {
//       provide: HTTP_INTERCEPTORS,
//       useClass: JwtInterceptor,
//       multi: true,
//     },
//   ]
// })
// .catch(err => console.error(err));