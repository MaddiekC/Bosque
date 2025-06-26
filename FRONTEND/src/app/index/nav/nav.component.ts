import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';
import { RouterModule } from '@angular/router';
import { MenuItem } from '../../settings/menu.interface';

@Component({
  selector: 'app-nav',
  standalone: true,
  imports: [CommonModule, RouterModule],
  templateUrl: './nav.component.html',
  styleUrl: './nav.component.css'
})
export class NavComponent {
  @Input() menuItems: any[] = [];
  @Input() userRole!: number;
  @Input() userGroup!: number;

  filteredMenu: any[] = [];

  ngOnInit() {
    this.filteredMenu = this.menuItems
      .filter(item => this.hasAccess(item)) // filtra por rol/grupo
      .map(item => ({
        ...item,
        submenus: item.submenus?.filter((sub: MenuItem) => this.hasAccess(sub)) || []
      }))
      .filter(item =>
        item.submenus?.length > 0 || !!item.route // ✅ conserva si tiene submenús o un route directo
      );
      console.log('Filtered Menu:', this.filteredMenu);
  }


  toggleDropdown(item: any) {
    this.filteredMenu.forEach(i => {
      if (i !== item) i.active = false;
    });
    item.active = !item.active;
  }

  hasAccess(item: any): boolean {
    const roleAllowed = !item.roles || item.roles.includes(this.userRole);
    const groupAllowed = !item.grupos || item.grupos.includes(this.userGroup);
    return roleAllowed && groupAllowed;
  }
}
