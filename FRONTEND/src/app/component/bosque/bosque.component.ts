import { Component, ElementRef, ViewChild } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgxPaginationModule } from 'ngx-pagination';
import { FormsModule } from '@angular/forms';
import { AfterViewInit } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

declare const bootstrap: any;
interface Bosque {
  id: number;
  nombre: string;
  seccion_id: number;
  hectarea: number;
}

@Component({
  selector: 'app-bosque',
  standalone: true,
  imports: [CommonModule, RouterModule, NgxPaginationModule, FormsModule],
  templateUrl: './bosque.component.html',
  styleUrl: './bosque.component.css'
})
export class BosqueComponent implements AfterViewInit {
  @ViewChild('confirmModal') confirmModal!: ElementRef;
  private modalInstance: any;
  private pendingDeleteId!: number;

  listaBosques: any[] = [];
  bosquesFiltrados: any[] = [];
  // valores de filtro
  filtroNombre: string = '';
  filtroTipo: number | null = null;
  filtroSeccion: number | null = null;
  filtroHectarea: number | null = null;

  // paginación
  paginaActual: number = 1;
  itemsPorPagina: number = 15;

  // listas de opciones para los selects
  tipos: any[] = [];
  secciones: any[] = [];
  nuevoBosque: any = {
    nombre: '',
    seccion_id: null,
    hectarea: null
  };
  nuevoNombre: string = '';

  bosqueEditando: Bosque | null = null;

  errorMensajeNuevo: string = '';
  clearError() {
    this.errorMensajeNuevo = '';
  }

  @ViewChild('miModal') miModalEl!: ElementRef<HTMLDivElement>;

  // Auxiliar para saber si el nombre ya existe
  nombreDuplicado(nombre: string): boolean {
    const nom = nombre.trim().toLowerCase();
    return this.listaBosques.some(b => b.nombre.trim().toLowerCase() === nom);
  }

  constructor(private bosqueService: ApiService) { }

  // usuario_creacion = this.userService.getUsername() ?? ''

  ngOnInit(): void {
    this.bosqueService.getBosques().subscribe(
      exito => {
        console.log(exito);
        this.listaBosques = exito.map((item: { hectarea: any }) => ({
          ...item,
          // si viene como string o number, lo convertimos a number y a string con dos decimales
          hectarea: Number(item.hectarea).toFixed(2),
        }));
        this.getbosquesFiltrados();
        console.log(this.bosquesFiltrados)
      },
      error => {
        console.log(error);
      }
    );
    this.bosqueService.getSecciones().subscribe(
      exito => {
        console.log(exito);
        this.secciones = exito;
      },
      error => {
        console.log(error);
      }
    );
  }

  ngAfterViewInit(): void {
    this.modalInstance = new bootstrap.Modal(this.confirmModal.nativeElement);
    const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach((tooltipTriggerEl: Element) => {
      new bootstrap.Tooltip(tooltipTriggerEl);
    });
  }

  getSeccionNombre(seccionId: number): string {
    const seccion = this.secciones?.find((s: any) => s.id == seccionId);
    return seccion ? seccion.nombre : '';
  }
  // método que devuelve los bosques ya filtrados
  getbosquesFiltrados() {
    const normalizar = (texto: string) =>
      texto.toLowerCase().trim().replace(/\s+/g, ' ');
    return this.bosquesFiltrados = this.listaBosques.filter(b =>
      (!this.filtroNombre || normalizar(b.nombre).includes(normalizar(this.filtroNombre)))
      && (!this.filtroSeccion || b.seccion_id == this.filtroSeccion)
      && (!this.filtroHectarea || b.hectarea == this.filtroHectarea)
    );
  }


  // 1) Se llama al hacer clic en el icono de papelera
  openConfirmModal(id: number) {
    this.pendingDeleteId = id;
    this.modalInstance.show();
  }

  // 2) Si el usuario pulsa “Sí”
  confirmDelete() {
    this.eliminarBosque(this.pendingDeleteId);
    this.modalInstance.hide();
  }

  // 3) Si pulsa “No” o cierra el modal
  cancelDelete() {
    this.modalInstance.hide();
  }

  eliminarBosque(id: number): void {
    this.bosqueService.countSiembrasByBosque(id).subscribe(count => {
      if (count > 0) {
        alert('Este bosque tiene ' + count + ' siembra-rebrotre y no se puede eliminar.');
        return;
      }

      this.bosqueService.putBosqueInactive(id).subscribe(
        exito => {
          console.log(exito);
          this.listaBosques = this.listaBosques.filter(bosque => bosque.id !== id);
          this.getbosquesFiltrados();

          const totalItems = this.bosquesFiltrados.length;
          const totalPages = Math.ceil(totalItems / this.itemsPorPagina);
          if (this.paginaActual > totalPages) {
            this.paginaActual = totalPages || 1;
          }
        },
        error => {
          console.log(error);
        }
      );
    });
  }

  startEdit(id: number) {
    const original = this.listaBosques.find(s => s.id === id);
    if (!original) return;

    // Crear una copia para editar
    this.bosqueEditando = { ...original, seccion_id: Number(original.seccion_id) };
    const modal = new bootstrap.Modal(document.getElementById('editarModal'));
    modal.show();
  }

  cancelEdit() {
    this.bosqueEditando = null;
  }

  saveEdit() {
    if (!this.bosqueEditando) return;

    this.bosqueService.putBosque(this.bosqueEditando.id, this.bosqueEditando).subscribe(
      updated => {
        const idx = this.listaBosques.findIndex(s => s.id === updated.id);
        if (idx !== -1) this.listaBosques[idx] = updated;
        this.bosqueEditando = null;
        this.getbosquesFiltrados();
      },
      err => console.log(err)
    );
  }

  onSave() {
    this.errorMensajeNuevo = '';
    this.bosqueService.postBosque(this.nuevoBosque).subscribe(
      exito => {
        console.log(exito);
        const nuevo = {
          ...exito,
          hectarea: Number(exito.hectarea).toFixed(2), // aseguramos que hectarea sea un número con 2 decimales
        };
        this.listaBosques.push(nuevo);
        this.getbosquesFiltrados();
        this.nuevoBosque = {
          nombre: '',
          seccion_id: null,
          hectarea: null
        };
        const modalEl = document.getElementById('miModal');
        // obtener la instancia de Bootstrap (o crearla)
        const modal = modalEl
          ? (bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl))
          : null;
        modal?.hide();
      },
      error => {
        console.log(error);
        if (error.status === 422 && error.error.errors?.nombre) {
          // Laravel devuelve aquí un array errors con la clave 'nombre'
          this.errorMensajeNuevo = 'No se pudo crear: el nombre ya existe en la tabla.';
        }
      }
    );
  }

  exportToPDF() {
    const doc = new jsPDF();
    const columns = [
      { header: 'Nombre', dataKey: 'nombre' },
      { header: 'Sección', dataKey: 'seccion_id' },
      { header: 'Hectáreas', dataKey: 'hectarea' }
    ];

    const rows = this.bosquesFiltrados.map(item => ({
      nombre: item.nombre,
      seccion_id: this.getSeccionNombre(item.seccion_id),
      hectarea: item.hectarea
    }));

    doc.text('Reporte de Bosques', 14, 10);
    doc.setFontSize(10);
    autoTable(doc, {
      columns,
      body: rows,
      headStyles: {
        fillColor: [0, 127, 0],    
        textColor: 255
      },
      showHead: 'everyPage'
    });
    doc.save('reporte_bosques.pdf');
  }
}