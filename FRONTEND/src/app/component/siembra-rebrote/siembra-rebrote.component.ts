import { Component } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { NgxPaginationModule } from 'ngx-pagination';
import { FormsModule } from '@angular/forms';
import { AfterViewInit } from '@angular/core';

declare const bootstrap: any;

interface SiembraRebrote {
  id: number;
  bosque_id: number;
  tipo_id: number;
  tipo_arbol_id: number;
  fecha: Date;
  anio: number;
  hectarea_usada: number;
  arb_iniciales: number;
  arb_cortados: number;
  dist_siembra: string;
  saldo: number;
}

@Component({
  selector: 'app-siembra-rebrote',
  standalone: true,
  imports: [CommonModule, RouterModule, NgxPaginationModule, FormsModule],
  templateUrl: './siembra-rebrote.component.html',
  styleUrl: './siembra-rebrote.component.css'
})
export class SiembraRebroteComponent implements AfterViewInit {
  listSiemReb: any[] = [];
  siembRebFiltrados: any[] = [];
  // valores de filtro
  filtroBosque: number | null = null;
  filtroTipo: number | null = null;
  filtroTipoArbol: number | null = null;
  filtroFecha: Date | null = null;
  filtroAnio: number | null = null;
  filtroHectareaUs: number | null = null;
  filtroArbIniciales: number | null = null;
  filtroArbCortados: number | null = null;
  filtroDistSiembra: string = '';
  filtroSaldo: number | null = null;

  // paginación
  paginaActual: number = 1;
  itemsPorPagina: number = 15;

  // listas de opciones para los selects
  tipos: any[] = [];
  tipoArbol: any[] = [];
  bosques: any[] = [];

  hectareaDisponible = 0;
  hectareaUsadaAntes = 0;

  nuevaSiembraRebrote: any = {
    bosque_id: null,
    tipo_id: null,
    tipo_arbol_id: null,
    fecha: null,
    anio: new Date().getFullYear(),
    hectarea_usada: null,
    arb_iniciales: null,
    arb_cortados: 0,
    dist_siembra: '',
    saldo: null
  };

  // Edición
  siembraRebroteEditando: SiembraRebrote | null = null;

  constructor(private SiembraRebService: ApiService, private route: ActivatedRoute) { }



  ngOnInit(): void {
    const idBosqueParam = this.route.snapshot.paramMap.get('idBosque');
    console.log(idBosqueParam);
    if (idBosqueParam) {
      this.filtroBosque = +idBosqueParam; // lo conviertes a número y aplicas como filtro
    }

    this.SiembraRebService.getSiembraRebrotes().subscribe(
      exito => {
        console.log(exito);
        this.listSiemReb = exito.map((item: { hectarea_usada: any; saldo: any; }) => ({
          ...item,
          // si viene como string o number, lo convertimos a number y a string con dos decimales
          hectarea_usada: Number(item.hectarea_usada).toFixed(3),
          saldo: Number(item.saldo).toFixed(3),
        }));
        this.getSiembraRebFiltrados();
      },
      error => {
        console.log(error);
      }
    );
    this.SiembraRebService.getTipoSR('siembraRebrote').subscribe(
      exito => {
        console.log(exito);
        this.tipos = exito;
      },
      error => {
        console.log(error);
      }
    );
    this.SiembraRebService.getTipoArbol('tipoArbol').subscribe(
      exito => {
        console.log(exito);
        this.tipoArbol = exito;
      },
      error => {
        console.log(error);
      }
    );
    this.SiembraRebService.getBosques().subscribe(
      exito => {
        console.log(exito);
        this.bosques = exito;
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

  getTipoNombre(tipoId: number) {
    const tipo = this.tipos?.find((t: any) => t.id == tipoId);
    return tipo ? tipo.nombre : '';
  }
  getTipoArbolNombre(tipoArbolId: number) {
    const tipoArbol = this.tipoArbol?.find((t: any) => t.id == tipoArbolId);
    return tipoArbol ? tipoArbol.nombre : '';
  }
  getBosqueNombre(bosqueId: number) {
    const bosque = this.bosques?.find((b: any) => b.id == bosqueId);
    return bosque ? bosque.nombre : '';
  }

  // método que devuelve los bosques ya filtrados
  getSiembraRebFiltrados() {
    const normalizar = (texto: string) =>
      texto.toLowerCase().trim().replace(/\s+/g, ' ');
    return this.siembRebFiltrados = this.listSiemReb.filter(b =>
      (!this.filtroBosque || b.bosque_id == this.filtroBosque)
      && (!this.filtroTipo || b.tipo_id == this.filtroTipo)
      && (!this.filtroTipoArbol || b.tipo_arbol_id == this.filtroTipoArbol)
      && (!this.filtroFecha || new Date(b.fecha).toDateString() === new Date(this.filtroFecha).toDateString())
      && (!this.filtroAnio || b.anio == this.filtroAnio)
      && (!this.filtroHectareaUs || b.hectarea_usada == this.filtroHectareaUs)
      && (!this.filtroArbIniciales || b.arb_iniciales == this.filtroArbIniciales)
      && (!this.filtroArbCortados || b.arb_cortados == this.filtroArbCortados)
      && (!this.filtroDistSiembra || normalizar(b.dist_siembra).includes(normalizar(this.filtroDistSiembra)))
      && (!this.filtroSaldo || b.saldo == this.filtroSaldo)
    );
  }

  eliminarSiembraReb(id: number): void {
    this.SiembraRebService.putSiembraRebroteInactive(id).subscribe(
      exito => {
        console.log(exito);
        this.listSiemReb = this.listSiemReb.filter(siembraRebrote => siembraRebrote.id !== id);
        this.getSiembraRebFiltrados();

        const totalItems = this.siembRebFiltrados.length;
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
    const original = this.listSiemReb.find(s => s.id === id);
    if (!original) return;

    // Crear una copia para editar
    this.siembraRebroteEditando = {
      ...original,
      bosque_id: Number(original.bosque_id),
      tipo_id: Number(original.tipo_id),
      tipo_arbol_id: Number(original.tipo_arbol_id),
    };
    const modal = new bootstrap.Modal(document.getElementById('editarModal'));
    modal.show();
  }

  // Cancelar edición
  cancelEdit() {
    this.siembraRebroteEditando = null;
  }

  saveEdit() {
    if (!this.siembraRebroteEditando) return;
    this.SiembraRebService.putSiembraRebrote(this.siembraRebroteEditando.id, this.siembraRebroteEditando).subscribe(
      updated => {
        const idx = this.listSiemReb.findIndex(s => s.id === updated.id);
        if (idx !== -1) this.listSiemReb[idx] = updated;
        this.listSiemReb[idx] = {
          ...this.listSiemReb[idx],
          arb_iniciales: Number(updated.arb_iniciales),
          arb_cortados: Number(updated.arb_cortados),
          saldo: updated.arb_iniciales - updated.arb_cortados,
        };
        this.getSiembraRebFiltrados();

        // 2) Cierra el modal manualmente
        const modalEl = document.getElementById('editarModal')!;
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        modalInstance?.hide();

        // 3) Limpia el objeto de edición
        this.siembraRebroteEditando = null;
      },
      err => {
        console.error('Error al editar:', err);
        alert('Se ha sobrepasado las has.');
      }
    );
  }

  onBosqueChange() {
    const bosque = this.bosques.find(b => b.id === this.nuevaSiembraRebrote.bosque_id);
    if (!bosque) return;

    // 1) total del bosque
    this.hectareaDisponible = Number(bosque.hectarea);

    // 2) suma ya usada en backend
    this.SiembraRebService.sumHectareaUsada(bosque.id)
      .subscribe(sum => this.hectareaUsadaAntes = sum);
  }

  onSave() {
    // // 1) Chequeo de campos vacíos
    // const f = this.nuevaSiembraRebrote;
    // if (
    //   !f.bosque_id ||
    //   !f.tipo_id ||
    //   !f.tipo_arbol_id ||
    //   !f.fecha ||
    //   f.hectarea_usada === null || f.hectarea_usada === undefined ||
    //   f.arb_iniciales === null || f.arb_iniciales === undefined ||
    //   !f.dist_siembra.trim()
    // ) {
    //   alert('Por favor completa todos los campos obligatorios antes de guardar.');
    //   return;
    // }

    // 2) Chequeo de hectáreas disponibles
    const nueva = Number(this.nuevaSiembraRebrote.hectarea_usada);
    const disponibleRestante = this.hectareaDisponible - this.hectareaUsadaAntes;

    if (nueva > disponibleRestante) {
      alert(`Error: Solo quedan ${disponibleRestante.toFixed(2)} ha disponibles. No puede agregar más.`);
      return;
    }
    this.SiembraRebService.postSiembraRebrote(this.nuevaSiembraRebrote)
      .subscribe({
        next: exito => {
          // formatear y añadir a la lista
          const nuevo = {
            ...exito,
            hectarea_usada: Number(exito.hectarea_usada).toFixed(3),
            arb_iniciales: Number(exito.arb_iniciales),
            arb_cortados: Number(exito.arb_cortados),
            saldo: Number(exito.arb_iniciales) - Number(exito.arb_cortados),
          };
          this.listSiemReb.push(nuevo);
          this.getSiembraRebFiltrados();

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

  // Este método extrae el año del date-picker
  onFechaChange(fechaISO: string) {
    if (fechaISO) {
      const año = new Date(fechaISO).getFullYear();
      this.nuevaSiembraRebrote.anio = año;
    } else {
      // si limpian la fecha, opcionalmente vacías el año:
      this.nuevaSiembraRebrote.anio = null;
    }
  }
}
