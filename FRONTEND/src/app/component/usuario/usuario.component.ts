import { Component, OnInit, ElementRef, ViewChild, AfterViewInit } from '@angular/core';
import { CommonModule } from '@angular/common';
import { FormsModule } from '@angular/forms';
import { NgxPaginationModule } from 'ngx-pagination';
import { ApiService } from '../../services/api.service';
import { HasPermissionDirective } from '../../services/has-permission.directive';

declare const bootstrap: any;

@Component({
  selector: 'app-usuario',
  standalone: true,
  imports: [CommonModule, FormsModule, NgxPaginationModule, HasPermissionDirective],
  templateUrl: './usuario.component.html',
  styleUrl: './usuario.component.css'
})
export class UsuarioComponent implements OnInit, AfterViewInit {

  @ViewChild('miModal') miModal!: ElementRef;
  @ViewChild('confirmModal') confirmModal!: ElementRef;
  @ViewChild('permisosModal') permisosModal!: ElementRef;
  listUsuarios: any[] = [];
  paginaActual: number = 1;
  itemsPorPagina: number = 15;
  loading = false;

  nuevoUsuario = {
    name: '',
    surname: '',
    username: '',
    password: ''
  };

  saveError: string | null = null;
  saveSuccess: string | null = null;
  private modalInstance: any;
  private confirmModalInstance: any;
  private pendingDeleteId!: number;

  // Permisos properties
  selectedUser: any = null;
  transacciones: any[] = [];
  userTransaccionIds: number[] = [];
  loadingPermisos = false;
  savingPermisos = false;
  permisosError: string | null = null;
  private permisosModalInstance: any;

  showSuccess(message: string) {
    this.saveSuccess = message;
    setTimeout(() => {
      if (this.saveSuccess === message) {
        this.saveSuccess = null;
      }
    }, 4000);
  }
  constructor(private apiService: ApiService) { }

  ngOnInit(): void {
    this.getUsuarios();
  }

  ngAfterViewInit(): void {
    if (this.miModal) {
      this.modalInstance = new bootstrap.Modal(this.miModal.nativeElement);
    }
    if (this.confirmModal) {
      this.confirmModalInstance = new bootstrap.Modal(this.confirmModal.nativeElement);
    }
    if (this.permisosModal) {
      this.permisosModalInstance = new bootstrap.Modal(this.permisosModal.nativeElement);
    }
  }

  getUsuarios() {
    this.loading = true;
    this.apiService.getUsuarios().subscribe({
      next: (res) => {
        this.listUsuarios = res;
        this.loading = false;
      },
      error: (err) => {
        console.error('Error al obtener usuarios', err);
        this.loading = false;
      }
    });
  }

  openModal() {
    this.saveError = null;
    this.nuevoUsuario = { name: '', surname: '', username: '', password: '' };
    if (!this.modalInstance && this.miModal) {
      this.modalInstance = new bootstrap.Modal(this.miModal.nativeElement);
    }
    this.modalInstance.show();
  }

  onSave() {
    this.saveError = null;
    this.apiService.postUsuario(this.nuevoUsuario).subscribe({
      next: (res) => {
        console.log('Usuario creado', res);
        this.modalInstance.hide();
        this.getUsuarios(); // recargar
      },
      error: (err) => {
        console.error('Error al guardar', err);
        if (err.error && err.error.errors) {
          // Flatten errors
          this.saveError = Object.values(err.error.errors).flat().join(', ');
        } else {
          this.saveError = 'Error al crear el usuario. Verifique los datos o si el usuario ya existe.';
        }
      }
    });
  }

  openConfirmModal(id: number) {
    this.pendingDeleteId = id;
    this.confirmModalInstance.show();
  }

  confirmDelete() {
    this.eliminarUsuario(this.pendingDeleteId);
    this.confirmModalInstance.hide();
  }

  cancelDelete() {
    this.confirmModalInstance.hide();
  }

  eliminarUsuario(id: number) {
    this.apiService.putUsuarioInactive(id).subscribe({
      next: () => {
        this.getUsuarios();
      },
      error: (err) => {
        console.error('Error al inactivar usuario', err);
        alert('Hubo un problema al inactivar el usuario.');
      }
    });
  }

  openPermisosModal(user: any) {
    this.selectedUser = user;
    this.permisosError = null;
    this.userTransaccionIds = [];
    this.loadingPermisos = true;

    if (!this.permisosModalInstance && this.permisosModal) {
      this.permisosModalInstance = new bootstrap.Modal(this.permisosModal.nativeElement);
    }
    this.permisosModalInstance.show();

    const fetchUserPerms = () => {
      this.apiService.getUserTransacciones(user.id).subscribe({
        next: (userPerms: any[]) => {
          this.userTransaccionIds = userPerms.map((id: any) => Number(id));
          this.loadingPermisos = false;
        },
        error: (err) => {
          console.error('Error fetching user permissions', err);
          this.permisosError = 'Error al cargar los permisos del usuario.';
          this.loadingPermisos = false;
        }
      });
    };

    if (this.transacciones.length === 0) {
      this.apiService.getTransacciones().subscribe({
        next: (res: any[]) => {
          this.transacciones = res.map((t: any) => ({ ...t, id: Number(t.id) }));
          fetchUserPerms();
        },
        error: (err) => {
          console.error('Error fetching transactions list', err);
          this.permisosError = 'Error al cargar las transacciones disponibles.';
          this.loadingPermisos = false;
        }
      });
    } else {
      fetchUserPerms();
    }
  }

  isTransaccionSelected(id: any): boolean {
    return this.userTransaccionIds.includes(Number(id));
  }

  toggleTransaccion(id: any) {
    const numId = Number(id);
    const idx = this.userTransaccionIds.indexOf(numId);
    if (idx > -1) {
      this.userTransaccionIds.splice(idx, 1);
    } else {
      this.userTransaccionIds.push(numId);
    }
  }

  onSavePermisos() {
    if (!this.selectedUser) return;
    this.savingPermisos = true;
    this.permisosError = null;

    this.apiService.updateUserTransacciones(this.selectedUser.id, this.userTransaccionIds).subscribe({
      next: () => {
        this.savingPermisos = false;
        this.permisosModalInstance.hide();
        this.showSuccess(`Permisos del usuario ${this.selectedUser.username} actualizados con éxito.`);
      },
      error: (err) => {
        console.error('Error saving user permissions', err);
        this.permisosError = 'Error al guardar los permisos.';
        this.savingPermisos = false;
      }
    });
  }
}
