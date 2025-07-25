import { Routes } from '@angular/router';
import { MainComponent } from './index/main/main.component';

import { LoginComponent } from './auth/login/login.component';
import { AuthGuard } from './auth/auth.guard';

export const routes: Routes = [
  { path: 'login', component: LoginComponent },
  {
    path: '',
    component: MainComponent,
    canActivate: [AuthGuard],
    children: [
      {
        path: '',
        loadComponent: () => import('./component/menu/menu.component').then(m => m.MenuComponent),
        data: { title: 'Menu' }
      },
      {
        path: 'bosque',
        loadComponent: () => import('./component/bosque/bosque.component').then(m => m.BosqueComponent),
        data: { title: 'Bosque' }
      },
      {
        path: 'siembra-rebrote',
        loadComponent: () => import('./component/siembra-rebrote/siembra-rebrote.component').then(m => m.SiembraRebroteComponent),
        data: { title: 'Siembra-rebrote' }
      },
      {
        path: 'siembra-rebrote/:idBosque',
        loadComponent: () => import('./component/siembra-rebrote/siembra-rebrote.component').then(m => m.SiembraRebroteComponent),
        data: { title: 'Siembra-rebrote filtrado' }
      },
      {
        path: 'contrato',
        loadComponent: () => import('./component/contrato/contrato.component').then(m => m.ContratoComponent),
        data: { title: 'Contratos' }
      },
    ]
  },
  {
    path: '**',
    loadComponent: () => import('./shared/not-found/not-found.component').then(m => m.NotFoundComponent),
    data: { title: 'Página no encontrada' }
  }
];
