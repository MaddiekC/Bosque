import { Component } from '@angular/core';
import { RouterModule } from '@angular/router';
import { HasPermissionDirective } from '../../services/has-permission.directive';

@Component({
  selector: 'app-menu',
  standalone: true,
  imports: [RouterModule, HasPermissionDirective],
  templateUrl: './menu.component.html',
  styleUrl: './menu.component.css'
})
export class MenuComponent {
}
