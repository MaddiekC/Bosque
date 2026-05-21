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
  private modalInstance: any;
  private confirmModalInstance: any;
  private pendingDeleteId!: number;

  constructor(private apiService: ApiService) {}

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
}
