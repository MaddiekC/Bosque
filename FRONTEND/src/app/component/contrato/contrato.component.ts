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
  cliente_id: string;
  anio: number;
  fecha: Date;
}
interface detContrato {
  id: number;
  contrato_id: number;
  circunferencia: string;
  precioM3: number;
  largo: number;
  caracteristica: string;
}

@Component({
  selector: 'app-contrato',
  standalone: true,
  imports: [CommonModule, RouterModule, NgxPaginationModule, FormsModule],
  templateUrl: './contrato.component.html',
  styleUrl: './contrato.component.css'
})
export class ContratoComponent implements AfterViewInit {
  //ANTICIPO
  nuevoAnticipo: any = {
    cantidad: 0,
    factura: '',
    fecha: '',
  }

  /// DETALLES
  nuevoDetContrato: detContrato[] = [{
    contrato_id: 0,
    circunferencia: '',
    precioM3: 0,
    largo: 0,
    caracteristica: '',
    id: 0
  }];

  // DETALLES CONTRATO
  listDetContrato: any[] = [];
  selectedContratoId: number | null = null;

  //ANTICPOS
  listAnticipo: any[] = [];
  ultimoAnticipo: Record<string, number> = {};
  totalAnticipos: number = 0;

  // CONTRATOS
  listContrato: any[] = [];
  contratosFiltrados: any[] = [];

  // valores de filtro
  filtroCliente: number | null = null;
  filtroAnio: number | null = null;
  filtroFecha: Date | null = null;
  filtroEstado: string | null = null;

  // paginación
  paginaActual: number = 1;
  itemsPorPagina: number = 15;

  // listas de opciones para los selects
  clientes: any[] = [];
  estados = [
    { value: 'A', label: 'Activo' },
    { value: 'C', label: 'Cerrado' },
  ];

  nuevoContrato: any = {
    cliente_id: '',
    anio: new Date().getFullYear(),
    fecha: null
  };

  //Edicion 
  contratoEditando: Contrato | null = null;

  constructor(private contratoService: ApiService, private route: ActivatedRoute) { }

  ngOnInit(): void {

    this.contratoService.getContratos().subscribe(
      exito => {
        console.log('contrato', exito);
        this.listContrato = exito
        this.getContratosFiltrados();
        this.contratoService.getUltimosAnticipos()
          .subscribe((mapeo: Record<number, number>) => {
            this.ultimoAnticipo = mapeo;
          });
      },
      error => {
        console.log(error);
      }
    );
    this.contratoService.getClientes().subscribe(
      exito => {
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

  getClienteId(clienteId: string) {
    const client = this.clientes?.find((b: any) => b.idcliente == clienteId);
    return client ? client.NombreComercial : '';
  }


  getContratosFiltrados() {
    return this.contratosFiltrados = this.listContrato.filter(b =>
      (!this.filtroCliente || b.cliente_id == this.filtroCliente)
      && (!this.filtroAnio || b.anio == this.filtroAnio)
      && (!this.filtroFecha || new Date(b.fecha).toDateString() === new Date(this.filtroFecha).toDateString())
      && (!this.filtroEstado || b.estado == this.filtroEstado)
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

  closeAgreement(id: number): void {
    this.contratoService.putContratoClose(id).subscribe(
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

  //--------------DETALLE CONTRATO---------------------

  openDetailModal(contratoId: number) {
    this.selectedContratoId = contratoId;
    console.log('Contrato ID seleccionado:', this.selectedContratoId);
    // 1) pido al backend los detalles de ese contrato
    this.contratoService.getDetContratoByContratoId(contratoId)
      .subscribe(response => {
        this.listDetContrato = Array.isArray(response) ? response : [response];
        // 2) abro el modal
        const modalEl = document.getElementById('verdetModal')!;
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
      });
  }
  closeDetailModal() {
    const modalEl = document.getElementById('verdetModal')!;
    const modal = new bootstrap.Modal(modalEl);
    modal.hide();
    this.selectedContratoId = null; // Limpiar el ID del contrato seleccionado
  }

  openDetailModal2(contratoId: number) {
    this.selectedContratoId = contratoId;
    console.log('Contrato ID seleccionado:', this.selectedContratoId);
    // Inicializar la primera fila con el contrato actual
    this.nuevoDetContrato = [{
      contrato_id: contratoId,
      circunferencia: '',
      precioM3: 0,
      largo: 0,
      caracteristica: '',
      id: 0
    }];

    const modalEl = document.getElementById('detModal')!;
    const modal = new bootstrap.Modal(modalEl);
    modal.show();
  }

  addRow() {
    this.nuevoDetContrato.push({
      contrato_id: this.selectedContratoId!,
      circunferencia: '',
      precioM3: 0,
      largo: 0,
      caracteristica: '',
      id: 0,
    });
  }

  removeRow(i: number) {
    this.nuevoDetContrato.splice(i, 1);
  }

  onSaveDet() {
    // aquí envías this.detalles junto al contrato
    console.log('Guardando detalles:', this.nuevoDetContrato);
    this.contratoService.postDetContrato({ detalles: this.nuevoDetContrato }).subscribe(
      response => {
        console.log('Detalles guardados:', response);
        // Aquí puedes manejar la respuesta después de guardar
      },
      error => {
        console.error('Error al guardar los detalles:', error);
      }
    );
  }

  //--------------ANTICIPO---------------------
  openAnticipoModal(contratoId: number) {
    this.selectedContratoId = contratoId;
    console.log('Contrato ID seleccionado para anticipo:', this.selectedContratoId);
    this.contratoService.getAnticipo(contratoId)
      .subscribe({
        next: list => {
          this.listAnticipo = Array.isArray(list) ? list : [list];
          this.totalAnticipos = this.listAnticipo.reduce((acc, curr) => acc + (Number(curr.cantidad) || 0), 0);
          this.contratoService.getUltimoAnticipo(contratoId).subscribe(
            ultimo => {
              this.ultimoAnticipo[contratoId] = ultimo?.cantidad || 0;
              this.showAnticipoModal();
            },
            error => {
              console.error('No se pudo obtener el último anticipo:', error);
              this.ultimoAnticipo[contratoId] = 0;
              this.showAnticipoModal();
            }
          );
        },
        error: error => {
          console.error('No se pudieron obtener los anticipos:', error);
          this.listAnticipo = [];
          this.ultimoAnticipo[contratoId] = 0;
          this.showAnticipoModal();
        }
      });
  }

  private showAnticipoModal() {
    const modalEl = document.getElementById('anticipoModal')!;
    new bootstrap.Modal(modalEl).show();
  }
  addAnticipo() {
    if (this.selectedContratoId === null) return;

    this.contratoService.postAnticipo(this.selectedContratoId, this.nuevoAnticipo)
      .subscribe(
        response => {
          console.log('Guardado:', response);
          this.ultimoAnticipo[this.selectedContratoId!] = response.cantidad
          this.nuevoAnticipo = { cantidad: 0, fecha: '', factura: '' };
          const modalEl = document.getElementById('anticipoModal')!;
          bootstrap.Modal.getInstance(modalEl)?.hide();
        },
        error => {
          console.error('Error al guardar :', error);
        }
      );
  }
}
