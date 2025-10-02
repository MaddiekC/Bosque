import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { PermissionService } from '../../services/permission.service';
import { MenuItem } from '../../settings/menu.interface';
import { Subscription } from 'rxjs';
//import { MenuItem } from '../../settings/menu.interface';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.css'
})
export class NavComponent {
  @Input() menuItems: any[] = [];
  //@Input() userRole!: number;
  //@Input() userGroup!: number;

  filteredMenu: any[] = [];
  private sub = new Subscription();

  constructor(private permissionService: PermissionService) { }
  ngOnInit() {
    // Si los permisos llegan async, nos suscribimos y recalculamos el menú
    this.sub.add(
      this.permissionService.permissions$.subscribe(perms => {
        this.filteredMenu = this.filterMenuByPermissions(this.menuItems, perms);
        console.log('Filtered Menu:', this.filteredMenu);
      })
    );

  }

  ngOnDestroy() {
    this.sub.unsubscribe();
  }

  private filterMenuByPermissions(items: MenuItem[], perms: number[]): MenuItem[] {
    return items
      .map(item => {
        // Hacer copia ligera
        const copy: MenuItem = { ...item };

        // Filtrar submenus recursivamente (si existen)
        if (copy.submenus && copy.submenus.length) {
          copy.submenus = this.filterMenuByPermissions(copy.submenus, perms);
        }

        // Decidir si mostrar el item:
        const requires = copy.permission ?? null; // permiso requerido (o null si público)
        let allowed: boolean;
        if (requires === null || requires === undefined) {
          allowed = true;
        } else if (Array.isArray(requires)) {
          allowed = requires.some((req: number) => perms.includes(req));
        } else {
          allowed = perms.includes(requires);
        }

        // Conservar item solo si está permitido y
        //  - tiene route, o
        //  - tiene submenus visibles (si era un grupo)
        if (!allowed) return null;
        if (copy.submenus && copy.submenus.length === 0 && !copy.route) return null;

        return copy;
      })
      .filter(Boolean) as MenuItem[];
  }
  toggleDropdown(item: any): void {
    item.active = !item.active;
  }
}
