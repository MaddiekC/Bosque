import { Component } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { NgxPaginationModule } from 'ngx-pagination';
import { FormsModule } from '@angular/forms';
import { AfterViewInit } from '@angular/core';

declare const bootstrap: any;

interface Contrato {
  id: number;
  cliente_id: number;
  anio: number;
  fecha: Date;
}

@Component({
  selector: 'app-contrato',
  standalone: true,
  imports: [CommonModule, RouterModule, NgxPaginationModule, FormsModule],
  templateUrl: './contrato.component.html',
  styleUrl: './contrato.component.css'
})
export class ContratoComponent implements AfterViewInit {
  listContrato: any[] = [];
  contratosFiltrados: any[] = [];
  // valores de filtro
  filtroCliente: number | null = null;
  filtroAnio: number | null = null;
  filtroFecha: Date | null = null;

  // paginación
  paginaActual: number = 1;
  itemsPorPagina: number = 15;

  // listas de opciones para los selects
  clientes: any[] = [];

  nuevoContrato: any = {
    cliente_id: null,
    anio: new Date().getFullYear(),
    fecha: null
  };

  //Edicion 
  contratoEditando: any = null;

  constructor(private contratoService: ApiService, private route: ActivatedRoute) { }

    ngOnInit(): void {

    this.contratoService.getContratos().subscribe(
      exito => {
        console.log(exito);
        this.listContrato = exito
        this.getContratosFiltrados();
      },
      error => {
        console.log(error);
      }
    );
    this.contratoService.getClientes().subscribe(
      exito => {
        console.log(exito);
        this.clientes = exito;
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

  getClienteId(clienteId: number) {
    const client = this.clientes?.find((b: any) => b.id == clienteId);
    return client? client.nombre : '';
  }

  
  getContratosFiltrados() {
    return this.contratosFiltrados = this.listContrato.filter(b =>
      (!this.filtroCliente || b.cliente_id == this.filtroCliente)
      && (!this.filtroAnio || b.anio == this.filtroAnio)
      && (!this.filtroFecha || new Date(b.fecha).toDateString() === new Date(this.filtroFecha).toDateString())
    );
  }

  eliminarContrato(id: number): void {
    this.contratoService.putContratoInactive(id).subscribe(
      exito => {
        console.log(exito);
        this.listContrato = this.listContrato.filter(contrato => contrato.id !== id);
        this.getContratosFiltrados();

        const totalItems = this.contratosFiltrados.length;
        const totalPages = Math.ceil(totalItems / this.itemsPorPagina);
        if (this.paginaActual > totalPages) {
          this.paginaActual = totalPages || 1;
        }
      },
      error => {
        console.log(error);
      }
    );
  }

  // Editar
  startEdit(id: number) {
    const original = this.listContrato.find(s => s.id === id);
    if (!original) return;

    // Crear una copia para editar
    this.contratoEditando = {
      ...original
    };
    const modal = new bootstrap.Modal(document.getElementById('editarModal'));
    modal.show();
  }

  // Cancelar edición
  cancelEdit() {
    this.contratoEditando = null;
  }

  saveEdit() {
    if (!this.contratoEditando) return;
    this.contratoService.putContrato(this.contratoEditando.id, this.contratoEditando).subscribe(
      updated => {
        const idx = this.listContrato.findIndex(s => s.id === updated.id);
        if (idx !== -1) this.listContrato[idx] = updated;
        this.listContrato[idx] = {
          ...this.listContrato[idx]
        };
        this.getContratosFiltrados();

        // 2) Cierra el modal manualmente
        const modalEl = document.getElementById('editarModal')!;
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        modalInstance?.hide();

        // 3) Limpia el objeto de edición
        this.contratoEditando = null;
      },
      err => {
        console.error('Error al editar:', err);
        alert('Se ha sobrepasado las has.');
      }
    );
  }

  onSave() {
    this.contratoService.postContrato(this.nuevoContrato)
      .subscribe({
        next: exito => {
          // formatear y añadir a la lista
          const nuevo = {
            ...exito
          };
          this.listContrato.push(nuevo);
          this.getContratosFiltrados();

          // cerrar el modal manualmente
          const modalEl = document.getElementById('miModal')!;
          const modal = bootstrap.Modal.getInstance(modalEl);
          modal?.hide();
        },
        error: err => {
          console.error(err);
          //console.log('fecha', f.fecha);
        }
      });
  }

    onFechaChange(fechaISO: string) {
    if (fechaISO) {
      const año = new Date(fechaISO).getFullYear();
      this.nuevoContrato.anio = año;
    } else {
      // si limpian la fecha, opcionalmente vacías el año:
      this.nuevoContrato.anio = null;
    }
  }

}
