import { Component } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgxPaginationModule } from 'ngx-pagination';
import { FormsModule } from '@angular/forms';
import { AfterViewInit } from '@angular/core';


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

  bosqueEditando: Bosque | null = null;

  constructor(private bosqueService: ApiService) { }

  // usuario_creacion = this.userService.getUsername() ?? ''

  ngOnInit(): void {
    this.bosqueService.getBosques().subscribe(
      exito => {
        console.log(exito);
        this.listaBosques = exito.map((item: { hectarea: any }) => ({
          ...item,
          // si viene como string o number, lo convertimos a number y a string con dos decimales
          hectarea: Number(item.hectarea).toFixed(3),
        }));
        this.getbosquesFiltrados();
        console.log(this.bosquesFiltrados)
      },
      error => {
        console.log(error);
      }
    );
    this.bosqueService.getSecciones('seccion').subscribe(
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

  eliminarBosque(id: number): void {
      this.bosqueService.countSiembrasByBosque(id).subscribe(count => {
    if (count > 0) {
      alert('Este bosque tiene ' + count + ' siembras-rebrotres y no se puede eliminar.');
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
    this.bosqueService.postBosque(this.nuevoBosque).subscribe(
      exito => {
        console.log(exito);
        const nuevo = {
          ...exito,
          hectarea: Number(exito.hectarea).toFixed(3), // aseguramos que hectarea sea un número con 3 decimales
        };
        this.listaBosques.push(nuevo);
        this.getbosquesFiltrados();
      },
      error => {
        console.log(error);
      }
    );
  }
}