import { Component, ElementRef, ViewChild } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { NgxPaginationModule } from 'ngx-pagination';
import { FormsModule } from '@angular/forms';
import { AfterViewInit } from '@angular/core';
import { AuthserviceService } from '../../auth/authservice.service';
import Swal from 'sweetalert2';
import { HasPermissionDirective } from '../../services/has-permission.directive';
import { PdfService } from '../../services/pdf.service';
import { forkJoin } from 'rxjs';

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
  imports: [CommonModule, RouterModule, NgxPaginationModule, FormsModule, HasPermissionDirective],
  templateUrl: './siembra-rebrote.component.html',
  styleUrl: './siembra-rebrote.component.css'
})
export class SiembraRebroteComponent implements AfterViewInit {
  @ViewChild('confirmModal') confirmModal!: ElementRef;
  private modalInstance: any;
  private pendingDeleteId!: number;

  saveError: string | null = null;
  saveEditError: string | null = null;
  username: string = '';
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

  //totales

  // Variables para los totales
  totalHectareas = 0;
  totalArbIniciales = 0;
  totalArbRaleados = 0;
  totalArbCortados = 0;
  totalArbMuertos = 0;
  totalSaldo = 0;

  nuevaSiembraRebrote: any = {
    bosque_id: null,
    tipo_id: null,
    tipo_arbol_id: null,
    fecha: null,
    anio: new Date().getFullYear(),
    hectarea_usada: null,
    arb_iniciales: null,
    arb_muertNat: 0,
    arb_cortados: 0,
    dist_siembra: '',
    saldo: null
  };

  // Edición
  siembraRebroteEditando: SiembraRebrote | null = null;

  constructor(
    private SiembraRebService: ApiService,
    private route: ActivatedRoute,
    private authService: AuthserviceService,
    private pdfService: PdfService
  ) { }

  ngOnInit(): void {
    const u = this.authService.getUserInfo();      // string | null
    this.username = u ?? 'Invitado';
    console.log('Usuario:', this.username);

    const idBosqueParam = this.route.snapshot.paramMap.get('idBosque');
    console.log(idBosqueParam);
    if (idBosqueParam) {
      this.filtroBosque = +idBosqueParam; // lo conviertes a número y aplicas como filtro
    }

    forkJoin({
      tipos: this.SiembraRebService.getTipoSR('siembraRebrote'),
      tipoArbol: this.SiembraRebService.getTipoArbol('tipoArbol'),
      bosques: this.SiembraRebService.getBosques()
    }).subscribe({
      next: (res: any) => {
        this.tipos = res.tipos;
        this.tipoArbol = res.tipoArbol;
        this.bosques = res.bosques;

        this.SiembraRebService.getSiembraRebrotes().subscribe(
          exito => {
            console.log(exito);
            this.listSiemReb = exito.map((item: { hectarea_usada: any; saldo: any; }) => ({
              ...item,
              // si viene como string o number, lo convertimos a number y a string con dos decimales
              hectarea_usada: Number(item.hectarea_usada).toFixed(2),
              saldo: Number(item.saldo).toFixed(2),
            }));
            this.getSiembraRebFiltrados();
          },
          error => {
            console.log('Error al cargar cortes:', error);
          }
        );
      },
      error: (err) => {
        console.error('Error al cargar los catálogos:', err);
      }
    });
  }

  ngAfterViewInit(): void {
      this.modalInstance = new bootstrap.Modal(this.confirmModal.nativeElement);
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
        texto.toLowerCase().trim().replace(/\s+/g, ' ').replace(/\s*[x×]\s*/g, 'x');;
    this.siembRebFiltrados = this.listSiemReb.filter(b =>
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
    this.calcularTotales();
    return this.siembRebFiltrados;
  }

  calcularTotales() {
    const sumInteger = (v: any) => {
      if (v === null || v === undefined) return 0;
      const s = String(v).replace(/\s/g, '').replace(',', '.');
      return Math.round(Number(s) || 0);
    };

    this.totalHectareas = this.siembRebFiltrados.reduce((sum, item) => sum + (Number(String(item.hectarea_usada || 0).replace(',', '.')) || 0), 0);
    this.totalArbIniciales = this.siembRebFiltrados.reduce((sum, item) => sum + sumInteger(item.arb_iniciales), 0);
    this.totalArbRaleados = this.siembRebFiltrados.reduce((sum, item) => sum + sumInteger(item.arb_raleados), 0);
    this.totalArbCortados = this.siembRebFiltrados.reduce((sum, item) => sum + sumInteger(item.arb_cortados), 0);
    this.totalArbMuertos = this.siembRebFiltrados.reduce((sum, item) => sum + sumInteger(item.arb_muertNat), 0);
    this.totalSaldo = this.siembRebFiltrados.reduce((sum, item) => sum + sumInteger(item.saldo), 0);
  }

  // 1) Se llama al hacer clic en el icono de papelera
  openConfirmModal(id: number) {
    this.pendingDeleteId = id;
    this.modalInstance.show();
  }

  // 2) Si el usuario pulsa “Sí”
  confirmDelete() {
    this.eliminarSiembraReb(this.pendingDeleteId);
    this.modalInstance.hide();
  }

  // 3) Si pulsa “No” o cierra el modal
  cancelDelete() {
    this.modalInstance.hide();
  }
  eliminarSiembraReb(id: number): void {
    this.SiembraRebService.countCorteBySR(id).subscribe(count => {
      if (count > 0) {
        Swal.fire({
          icon: 'error',
          title: 'No se puede eliminar',
          text: 'Esta Siembra-Rebrote tiene ' + count + ' corte y no se puede eliminar.',
          confirmButtonColor: '#d33'
        });
        return;
      }
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
    });
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
    this.saveEditError = null;
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
        this.saveEditError = null;
      },
      err => {
        console.error('Error al editar:', err);
        let msg = 'Error al guardar los detalles';
        if (err && err.status === 422) {
          // tu backend devuelve { message: '...' } o { errors: {...} }
          if (err.error) {
            if (typeof err.error === 'string') {
              msg = err.error;
            } else if (err.error.message) {
              msg = err.error.message;
            } else if (err.error.errors) {
              // compone mensaje desde array de errores
              const vals = Object.values(err.error.errors)
                .flat()
                .map((v: any) => String(v));
              msg = vals.join(' - ') || msg;
            }
          }
        } else if (err && err.message) {
          msg = err.message;
        }

        // muestra en la UI
        this.saveEditError = msg;
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
    // 2) Chequeo de hectáreas disponibles
    const nueva = Number(this.nuevaSiembraRebrote.hectarea_usada);
    const disponibleRestante = this.hectareaDisponible - this.hectareaUsadaAntes;

    if (nueva > disponibleRestante) {
      this.saveError = `Solo quedan ${disponibleRestante.toFixed(2)} ha disponibles. No puede agregar más.`;
      setTimeout(() => this.saveError = null, 8000);
      return;
    }
    this.SiembraRebService.postSiembraRebrote(this.nuevaSiembraRebrote)
      .subscribe({
        next: exito => {
          // formatear y añadir a la lista
          const nuevo = {
            ...exito,
            hectarea_usada: Number(exito.hectarea_usada).toFixed(2),
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

  async exportToPDF() {
    const columns = [
      { header: 'Bosque', dataKey: 'bosque_id', align: 'left' as const },
      { header: 'Tipo', dataKey: 'tipo_id', align: 'left' as const },
      { header: 'Tipo Árbol', dataKey: 'tipo_arbol_id', align: 'center' as const },
      { header: 'Fecha', dataKey: 'fecha', align: 'center' as const },
      { header: 'Año', dataKey: 'anio', align: 'center' as const },
      { header: 'Hectárea Usada', dataKey: 'hectarea_usada', align: 'right' as const },
      { header: 'Árboles Iniciales', dataKey: 'arb_iniciales', align: 'right' as const },
      { header: 'Árboles Raleados', dataKey: 'arb_raleados', align: 'right' as const },
      { header: 'Árboles Cortados', dataKey: 'arb_cortados', align: 'right' as const },
      { header: 'Dist. Siembra', dataKey: 'dist_siembra', align: 'center' as const },
      { header: 'Saldo', dataKey: 'saldo', align: 'right' as const }
    ];

    const rows = this.siembRebFiltrados.map(item => ({
      bosque_id: this.getBosqueNombre(item.bosque_id),
      tipo_id: this.getTipoNombre(item.tipo_id),
      tipo_arbol_id: this.getTipoArbolNombre(item.tipo_arbol_id),
      fecha: this.pdfService.fmtDate(item.fecha),
      anio: item.anio,
      hectarea_usada: this.pdfService.fmtNumber(item.hectarea_usada, 2, 2),
      arb_iniciales: this.pdfService.fmtInteger(item.arb_iniciales ?? 0),
      arb_raleados: this.pdfService.fmtInteger(item.arb_raleados ?? 0),
      arb_cortados: this.pdfService.fmtInteger(item.arb_cortados ?? 0),
      dist_siembra: item.dist_siembra || '',
      saldo: this.pdfService.fmtInteger(item.saldo ?? 0)
    }));

    const filasTotales = [
      [
        'TOTALES:',
        '',
        '',
        '',
        '',
        this.pdfService.fmtNumber(this.totalHectareas, 2, 2),
        this.pdfService.fmtInteger(this.totalArbIniciales),
        this.pdfService.fmtInteger(this.totalArbRaleados),
        this.pdfService.fmtInteger(this.totalArbCortados),
        '',
        this.pdfService.fmtInteger(this.totalSaldo)
      ]
    ];

    await this.pdfService.exportarTabla({
      titulo: 'Reporte de Siembras/Rebrotes',
      nombreArchivo: 'siembra-rebrote.pdf',
      columnas: columns,
      datos: rows,
      filasTotales
    });
  }
}
