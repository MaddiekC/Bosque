
import { HostListener, OnInit } from '@angular/core';
import { Component } from '@angular/core';
import { NavigationEnd, Router, RouterModule } from '@angular/router';

import { AuthserviceService } from '../../auth/authservice.service';
import { UserService } from '../../auth/user.service';
import { MenuItem } from '../../settings/menu.interface';
import { MenuService } from '../../settings/menu.service';
import { NavComponent } from '../nav/nav.component';

@Component({
  selector: 'app-main',
  standalone: true,
  imports: [NavComponent, RouterModule],
  templateUrl: './main.component.html',
  styleUrl: './main.component.css'
})
export class MainComponent implements OnInit {
  username: string = '';
  menuItems: MenuItem[] = [];
  userRole = 0;
  userGroup = 0;
  isSidebarVisible = true;
  constructor(
    public userService: UserService,
    private menuService: MenuService,
    private authService: AuthserviceService,
    private router: Router
  ) { }

  ngOnInit() {
    const u = this.authService.getUserInfo();      // string | null
    this.username = u ?? 'Invitado';
    console.log('Usuario:', this.username);
    this.userRole = Number(this.userService.getRolId()) || 1;
    this.userGroup = Number(this.userService.getGroupId()) || 1;
    this.menuItems = this.menuService.getMenuByUser(this.userRole, this.userGroup);
    this.updateSidebarVisibility();
    console.log('rol:', this.userRole, 'grupo:', this.userGroup);
    console.log(this.menuItems)
  }

  @HostListener('window:resize', ['$event'])
  onResize() {
    this.updateSidebarVisibility();
  }
  updateSidebarVisibility() {
    this.isSidebarVisible = window.innerWidth >= 768;
  }

  toggleSidebar() {
    this.isSidebarVisible = !this.isSidebarVisible;
  }

  logout() {
    this.authService.logout();
    this.router.navigate(['/login']);
  }
}
