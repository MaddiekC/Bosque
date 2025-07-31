import { Injectable } from '@angular/core';
import { BehaviorSubject, Observable } from 'rxjs';

@Injectable({
  providedIn: 'root'
})
export class PermissionService {
  private perms$ = new BehaviorSubject<number[]>([]);

  /** Invocado tras la llamada al backend */
  setPermissions(list: number[]) {
    this.perms$.next(list);
  } 

  has(code: number): boolean {
    return this.perms$.value.includes(code);
  }

  /** Opcional: exponer Observable para reaccionar si cambian */
  get permissions$(): Observable<number[]> {
    return this.perms$.asObservable();
  }
  constructor() { }
}
