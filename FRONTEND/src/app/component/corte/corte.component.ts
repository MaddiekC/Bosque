import { Component, ElementRef, ViewChild } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { NgxPaginationModule } from 'ngx-pagination';
import { FormsModule } from '@angular/forms';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { forkJoin } from 'rxjs';
import { AuthserviceService } from '../../auth/authservice.service';
import { HasPermissionDirective } from '../../services/has-permission.directive';
import { PermissionService } from '../../services/permission.service';
import { PdfService } from '../../services/pdf.service';
import Swal from 'sweetalert2';

declare const bootstrap: any;

interface Corte {
  id: number,
  bosque_id: number,
  contrato_id: number,
  raleo_tipo_id: number,
  siembra_rebrote_id: number,
  //sello_id: number,
  fecha_embarque: string,
  cant_trozas: number,
  numero_viaje: number,
  numero_envio: number,
  placa_carro: string,
  contenedor: string,
  naviera: string,
  supervisor: string,
  sello_empresa: string,
  sello_rastreo: string,
  sello_inspeccion: string,
}
interface detCorte {
  cabecera_corte_id: number,
  trozas: number,
  circ_bruta: number,
  circ_neta: number,
  largo_bruto: number,
  largo_neto: number,
  m_cubica: number,
  valor_mcubico: number,
  valor_troza: number,
  bosque_id: number,
  siembra_rebrote_id: number,
}

@Component({
  selector: 'app-corte',
  standalone: true,
  imports: [CommonModule, RouterModule, NgxPaginationModule, FormsModule, HasPermissionDirective],
  templateUrl: './corte.component.html',
  styleUrl: './corte.component.css'
})
export class CorteComponent {
  @ViewChild('confirmModal') confirmModal!: ElementRef;
  @ViewChild('confirmModalAgreem') confirmModalAgreem!: ElementRef;
  @ViewChild('confirmModalOpen') confirmModalOpen!: ElementRef;

  private modalInstance: any;
  private pendingDeleteId!: number;
  private modalInstanceAgreem: any;
  private pendingCloseAgreemId!: number;
  private modalInstanceOpen: any;
  private pendingOpenId!: number;

  nuevoDetCorte: detCorte[] = [{
    cabecera_corte_id: 0,
    trozas: 0,
    circ_bruta: 0,
    circ_neta: 0,
    largo_bruto: 0,
    largo_neto: 0,
    m_cubica: 0,
    valor_mcubico: 0,
    valor_troza: 0,
    bosque_id: 0,
    siembra_rebrote_id: 0,
  }];

  nuevoCorte: any = {
    //bosque_id: null,
    contrato_id: 0,
    raleo_tipo_id: 7,
    //siembra_rebrote_id: null,
    //sello_id: 0,
    fecha_embarque: '',
    cant_trozas: 0,
    numero_viaje: null,
    numero_envio: null,
    placa_carro: '',
    contenedor: '',
    naviera: '',
    supervisor: '',
    sello_empresa: '',
    sello_rastreo: '',
    sello_inspeccion: ''
  };

  SaldoDisponible = 0;
  distinctBS: any[] = [];

  listDetCortes: any[] = [];
  selectedCorteId: number | null = null;
  selectedBosqueId: number | null = null;
  selectedSiembraId: number | null = null;
  selectedCorte: any = null;
  selectedFile: File | null = null;
  selectedFileName: string | null = null;
  //selectedContractForCorte: number | null = null;
  isContractLocked = false;
  selectedRaleo: number | null = null;
  isUploading = false;
  listCorte: any[] = [];
  cortesFiltrados: any[] = [];

  saveCantError: string | null = null;
  saveDetError: string | null = null;
  filtroSiembraRebrote: number | null = null;
  filtroSR: string = '';
  filtroBosque: number | null = null;
  filtroContrato: number | null = null;
  filtroRaleoTipo: number | null = null;
  filtroSelloTipo: number | null = null;
  filtroFecha: Date | null = null;
  filtroNaviera: string = '';
  filtroNumeroViaje: number | null = null;
  filtroNumeroEnvio: number | null = null;

  // paginación
  paginaActual: number = 1;
  itemsPorPagina: number = 15;

  //Totales
  totalTrozas: number = 0;
  totalCircBruta: number = 0;
  totalCircNeta: number = 0
  totalLargoBruto: number = 0;
  totalLargoNeto: number = 0
  totalMCubica: number = 0;
  totalValorMCubico: number = 0
  totalValorTroza: number = 0;
  corteValorTroza: Record<number, number> = {};

  username: string = '';
  // Datos para los select
  bosques: any[] = [];
  contrato: any[] = [];
  raleoTipo: any[] = [];
  siemReb: any[] = [];
  //selloTipo: any[] = [];
  tipoArbol: any[] = [];
  siembTipo: any[] = [];
  cliente: any[] = [];
  corteEditando: Corte | null = null;
  siemRebFiltered: any[] = [];

  loading = false;
  private pendingRequests = 0;

  constructor(
    private corteService: ApiService,
    private route: ActivatedRoute,
    private authService: AuthserviceService,
    private permissionService: PermissionService,
    private pdfService: PdfService
  ) { }

  hasPermission(id: number): boolean {
    return this.permissionService.has(id);
  }

  private startRequest(): void {
    this.pendingRequests++;
    this.loading = true;
  }

  private endRequest(): void {
    this.pendingRequests--;
    if (this.pendingRequests <= 0) {
      this.pendingRequests = 0;
      this.loading = false;
    }
  }
  ngOnInit(): void {
    const u = this.authService.getUserInfo();      // string | null
    this.username = u ?? 'Invitado';
    console.log('Usuario:', this.username);

    const idSiemRebParam = this.route.snapshot.paramMap.get('idSiembraRebrote');
    const idBosqueParam = this.route.snapshot.paramMap.get('bosqueId');
    const idContratoParam = this.route.snapshot.paramMap.get('contratoId');
    console.log('Ruta', idSiemRebParam, idBosqueParam);
    if (idSiemRebParam) {
      this.filtroSiembraRebrote = +idSiemRebParam; // lo conviertes a número y aplicas como filtro
      console.log('filtroSiembraRebrote', this.filtroSiembraRebrote);
    }
    if (idBosqueParam) {
      this.filtroBosque = +idBosqueParam;
      console.log('filtroBosque', this.filtroBosque)
    }
    if (idContratoParam) {
      this.filtroContrato = +idContratoParam;
      console.log('filtroContrato', this.filtroContrato)
    }

    this.startRequest();

    forkJoin({
      bosques: this.corteService.getBosques(),
      clientes: this.corteService.getClientes(),
      contratos: this.corteService.getContratos(),
      raleos: this.corteService.getTipoRaleo('raleoTipo'),
      tiposSiembra: this.corteService.getTipoArbol('siembraRebrote'),
      siembras: this.corteService.getSiembraRebrotes(),
      arboles: this.corteService.getTipoArbol('tipoArbol'),
      trozas: this.corteService.getValorTrozaAll2()
    }).subscribe({
      next: (res: any) => {
        this.bosques = res.bosques;
        this.cliente = res.clientes;
        this.contrato = res.contratos;
        this.raleoTipo = res.raleos;
        this.siembTipo = res.tiposSiembra;
        this.siemReb = res.siembras;
        this.tipoArbol = res.arboles;

        this.corteValorTroza = {};
        Object.entries(res.trozas || {}).forEach(([k, v]) => {
          this.corteValorTroza[Number(k)] = Number(v) || 0;
        });

        // AHORA que tenemos todos los diccionarios, cargamos la lista principal de Cortes
        this.corteService.getCabeceraCortes().subscribe(
          exito => {
            console.log('corte', exito);
            this.listCorte = exito;

            // Aseguramos valores por defecto en corteValorTroza para los cortes cargados
            (this.listCorte || []).forEach((c: any) => {
              const id = Number(c.id);
              if (this.corteValorTroza[id] === undefined) this.corteValorTroza[id] = 0;
            });

            this.getCortesFiltrados();
            this.endRequest();
          },
          error => {
            console.log('Error al cargar cortes:', error);
            this.endRequest();
          }
        );
      },
      error: (err) => {
        console.error('Error al cargar los catálogos:', err);
        this.endRequest();
      }
    });
  }

  ngAfterViewInit(): void {
    this.modalInstance = new bootstrap.Modal(this.confirmModal.nativeElement);
    this.modalInstanceAgreem = new bootstrap.Modal(this.confirmModalAgreem.nativeElement);
    this.modalInstanceOpen = new bootstrap.Modal(this.confirmModalOpen.nativeElement);
    const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach((tooltipTriggerEl: Element) => {
      new bootstrap.Tooltip(tooltipTriggerEl);
    });
  }

  onBosqueChange(bosqueId: any) {
    // convertir a number si viene string
    const id = bosqueId === null || bosqueId === undefined ? null : Number(bosqueId);

    // guardar en nuevoCorte (ngModel ya lo hizo, pero por seguridad)
    this.nuevoCorte.bosque_id = id;

    // actualizar lista filtrada
    this.updateSiemRebFiltered(id);
  }

  updateSiemRebFiltered(bosqueId: number | null) {
    if (bosqueId === null || bosqueId === undefined) {
      this.siemRebFiltered = [];
      return;
    }

    // Buscar el/los id(s) del parametro cuyo nombre es "Teca" dentro de tipoArbol
    const tecaIds = (this.tipoArbol || [])
      .filter((t: any) => (t.nombre || '').toString().trim().toLowerCase() === 'teca')
      .map((t: any) => Number(t.id));

    // Si no hay definiciones de "Teca" aún, dejamos vacío (evita mostrar siembras de otros tipos)
    if (tecaIds.length === 0) {
      this.siemRebFiltered = [];
      return;
    }

    this.siemRebFiltered = (this.siemReb || []).filter(s => {
      const sBosqueId = s.bosque_id ?? s.idbosque ?? s.bosque?.id ?? null;
      const tipoArbolId = s.tipo_arbol_id ?? s.tipo_id ?? null; // intenta ambas claves por robustez
      return sBosqueId !== null
        && Number(sBosqueId) === Number(bosqueId)
        && tipoArbolId !== null
        && tecaIds.includes(Number(tipoArbolId));
    });
  }

  // cuando cambias el bosque global -> propaga a todas las filas
  onSelectedBosqueChange(bosqueId: number | null) {
    const id = bosqueId === null || bosqueId === undefined ? null : Number(bosqueId);

    // guardar en nuevoCorte (ngModel ya lo hizo, pero por seguridad)
    //this.nuevoCorte.bosque_id = id;

    // actualizar lista filtrada
    this.updateSiemRebFiltered(id);

    this.selectedBosqueId = bosqueId;
    this.nuevoDetCorte.forEach(d => d.bosque_id = bosqueId !== null ? bosqueId : 0);
  }

  // cuando cambias la siembra global -> propaga a todas las filas
  onSelectedSiembraChange(val: number | null) {
    this.selectedSiembraId = val;
    this.nuevoDetCorte.forEach(d => d.siembra_rebrote_id = val !== null ? val : 0);
  }

  getBosqueId(bosqueId: string) {
    const bosques = this.bosques?.find((b: any) => b.id == bosqueId);
    return bosques ? bosques.nombre : '';
  }
  getContratoId(contratoId: string) {
    const contratos = this.contrato?.find((b: any) => b.id == contratoId);
    return contratos ? contratos.cliente_id : '';
  }
  getContrId(contratoId: string) {
    const contratos = this.contrato?.find((b: any) => b.id == contratoId);
    return contratos ? contratos.id : '';
  }
  getClienteId(clienteId: string) {
    const client = this.cliente?.find((b: any) => b.idcliente == clienteId);
    return client ? client.NombreComercial : '';
  }
  getContratoAnio(contratoId: string) {
    const contratos = this.contrato?.find((b: any) => b.id == contratoId);
    return contratos ? contratos.anio : '';
  }
  // getSelloTipoId(selloTipoId: string) {
  //   const selloTipos = this.selloTipo?.find((b: any) => b.id == selloTipoId);
  //   return selloTipos ? selloTipos.nombre : '';
  // }
  getRaleoId(raleoTipoId: string) {
    const raleoTipos = this.raleoTipo?.find((b: any) => b.id == raleoTipoId);
    return raleoTipos ? raleoTipos.nombre : '';
  }
  getSiemRebId(siemRebId: string) {
    const siembraRebrote = this.siemReb?.find((b: any) => b.id == siemRebId);
    return siembraRebrote ? siembraRebrote.tipo_id : '';
  }
  getSiemRebAnio(siemRebId: string) {
    const siembraRebrote = this.siemReb?.find((b: any) => b.id == siemRebId);
    return siembraRebrote ? siembraRebrote.anio : '';
  }
  getSiemRebBosque(siemRebId: string) {
    const siembraRebrote = this.siemReb?.find((b: any) => b.id == siemRebId);
    return siembraRebrote ? siembraRebrote.bosque_id : '';
  }
  getSiemRebTipo(siemRebId: string) {
    const siembraRebroteT = this.siembTipo?.find((b: any) => b.id == siemRebId);
    return siembraRebroteT ? siembraRebroteT.nombre : '';
  }

  getCortesFiltrados() {
    this.cortesFiltrados = (this.listCorte || []).filter(b => {
      // normalizar campos que pueden ser number | string | array
      const bosqueIds = this._asNumberArray(b.bosque_id);
      const siembraIds = this._asNumberArray(b.siembra_rebrote_id);

      // filtro por siembra_rebrote (si hay filtro)
      if (this.filtroSiembraRebrote) {
        if (!siembraIds.includes(Number(this.filtroSiembraRebrote))) return false;
      }

      // filtro por bosque (si hay filtro)
      if (this.filtroBosque) {
        if (!bosqueIds.includes(Number(this.filtroBosque))) return false;
      }

      // filtro por texto (siempre convierte los ids a string "25, 26" para búsqueda)
      if (this.filtroSR) {
        const siemStr = siembraIds.join(', ');
        if (!siemStr.toLowerCase().includes(this.filtroSR.toLowerCase())) return false;
      }

      // resto de filtros existentes (sin cambios lógicos)
      if (this.filtroContrato && b.contrato_id != this.filtroContrato) return false;
      if (this.filtroRaleoTipo && b.raleo_tipo_id != this.filtroRaleoTipo) return false;
      if (this.filtroNumeroViaje && b.numero_viaje != this.filtroNumeroViaje) return false;
      if (this.filtroNumeroEnvio && b.numero_envio != this.filtroNumeroEnvio) return false;
      if (this.filtroNaviera && !(b.naviera ?? '').toString().toLowerCase().includes(this.filtroNaviera.toLowerCase())) return false;
      if (this.filtroFecha && new Date(b.fecha_embarque).toDateString() !== new Date(this.filtroFecha).toDateString()) return false;

      return true;
    });

    return this.cortesFiltrados;
  }

  // helper que normaliza number | "10,11" | '["10",11]' | [10,11] -> number[]
  private _asNumberArray(val: any): number[] {
    if (val === null || typeof val === 'undefined' || val === '') return [];

    // ya es array
    if (Array.isArray(val)) {
      return Array.from(new Set(val.map(v => Number(v)).filter(n => Number.isFinite(n))));
    }

    // si viene como JSON string de un array: '["10", "11"]'
    if (typeof val === 'string') {
      const s = val.trim();

      // intento parsear JSON por si backend mandó stringified array
      if ((s.startsWith('[') && s.endsWith(']'))) {
        try {
          const parsed = JSON.parse(s);
          if (Array.isArray(parsed)) {
            return this._asNumberArray(parsed);
          }
        } catch { /* ignore parse error */ }
      }

      // si es cadena tipo "10, 11" o "10" -> split por comas
      const parts = s.split(',').map(p => p.trim()).filter(p => p !== '');
      const nums = parts.map(p => Number(p)).filter(n => Number.isFinite(n));
      return Array.from(new Set(nums));
    }

    // si es número u otro tipo convertible
    const maybeNum = Number(val);
    return Number.isFinite(maybeNum) ? [maybeNum] : [];
  }


  // 1) Se llama al hacer clic en el icono de papelera
  openConfirmModal(id: number) {
    this.pendingDeleteId = id;
    this.modalInstance.show();
  }

  // 2) Si el usuario pulsa “Sí”
  confirmDelete() {
    this.eliminarCorte(this.pendingDeleteId);
    this.modalInstance.hide();
  }

  // 3) Si pulsa “No” o cierra el modal
  cancelDelete() {
    this.modalInstance.hide();
  }

  eliminarCorte(id: number): void {
    this.corteService.putCabeceraCorteInactive(id).subscribe(
      exito => {
        console.log(exito);
        this.listCorte = this.listCorte.filter(corte => corte.id !== id);
        this.getCortesFiltrados();
        const totalItems = this.cortesFiltrados.length;
        const totalPages = Math.ceil(totalItems / this.itemsPorPagina);
        if (this.paginaActual > totalPages) {
          this.paginaActual = totalPages || 1;
        }
      },
      error => {
        console.error(error);
        const mensaje = error?.error?.message || 'Ocurrió un error al intentar eliminar la cabecera de corte.';
        Swal.fire({
          icon: 'error',
          title: 'No se puede eliminar',
          text: mensaje,
          confirmButtonColor: '#d33'
        });
      }
    );
  }

  // Editar
  startEdit(id: number) {
    const original = this.listCorte.find(s => s.id === id);
    if (!original) return;

    // Crear una copia para editar
    this.corteEditando = {
      ...original
    };
    const modal = new bootstrap.Modal(document.getElementById('editarModal'));
    modal.show();
  }

  // Cancelar edición
  cancelEdit() {
    this.corteEditando = null;
  }

  saveEdit() {
    if (!this.corteEditando) return;
    this.corteService.putCabeceraCorte(this.corteEditando.id, this.corteEditando).subscribe(
      updated => {
        const idx = this.listCorte.findIndex(s => s.id === updated.id);
        if (idx !== -1) {
          this.listCorte[idx] = {
            ...this.listCorte[idx],
            ...updated,
            detalle_cortes_count: updated.detalle_cortes_count ?? this.listCorte[idx].detalle_cortes_count,
            cant_trozas: updated.cant_trozas ?? this.listCorte[idx].cant_trozas,
            bosque_id: updated.bosque_id ?? this.listCorte[idx].bosque_id,
            siembra_rebrote_id: updated.siembra_rebrote_id ?? this.listCorte[idx].siembra_rebrote_id
          };
        }
        this.getCortesFiltrados();

        // 2) Cierra el modal manualmente
        const modalEl = document.getElementById('editarModal')!;
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        modalInstance?.hide();

        // 3) Limpia el objeto de edición
        this.corteEditando = null;

        // 4) Actualizar los valores de trozas
        this.corteService.getValorTrozaAll2().subscribe(map => {
          this.corteValorTroza = {};
          Object.entries(map || {}).forEach(([k, v]) => {
            this.corteValorTroza[Number(k)] = Number(v) || 0;
          });
          (this.listCorte || []).forEach((c: any) => {
            const id = Number(c.id);
            if (this.corteValorTroza[id] === undefined) this.corteValorTroza[id] = 0;
          });
        });
      },
      err => {
        console.error('Error al editar:', err);
      }
    );
  }

  onSave() {
    this.saveCantError = null;
    console.log('Nuevo corte:', this.nuevoCorte);
    this.corteService.postCabeceraCorte(this.nuevoCorte)
      .subscribe({
        next: exito => {
          // formatear y añadir a la lista
          const nuevo = {
            ...exito
          };
          this.listCorte.push(nuevo);
          this.getCortesFiltrados();
          // cerrar el modal manualmente
          const modalEl = document.getElementById('miModal')!;
          const modal = bootstrap.Modal.getInstance(modalEl);
          modal?.hide();
          this.saveCantError = null;
        },
        error: err => {
          let msg = 'Error al guardar los detalles';
          if (err && err.status === 422) {
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
          this.saveCantError = msg;

          // opcional: desplazar scroll al top del modal para que se vea el alert
          try {
            const modalBody = document.querySelector('#miModal .modal-body') as HTMLElement | null;
            if (modalBody) modalBody.scrollTop = 0;
          } catch { }
        }
      });
  }

  //--------------------------------------------
  openCloseAModal(id: number) {
    if (!this.permissionService.has(41)) return;
    this.pendingCloseAgreemId = id;
    this.modalInstanceAgreem.show();
  }

  // 2) Si el usuario pulsa “Sí”
  confirmCloseA() {
    this.closeEstado(this.pendingCloseAgreemId);
    this.modalInstanceAgreem.hide();
  }

  // 3) Si pulsa “No” o cierra el modal
  cancelCloseA() {
    this.modalInstanceAgreem.hide();
  }

  closeEstado(id: number): void {
    this.corteService.putCorteClose(id).subscribe(
      exito => {
        console.log(exito);
        const corte = this.listCorte.find(c => c.id === id);
        if (corte) {
          corte.estado = 'C';
        }
        this.getCortesFiltrados();
        const totalItems = this.cortesFiltrados.length;
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

  //--------------------------------------------
  openConfirmOpenModal(id: number) {
    if (!this.permissionService.has(48)) return; // Bloquear si no tiene permiso 48
    this.pendingOpenId = id;
    this.modalInstanceOpen.show();
  }

  confirmOpen() {
    this.openEstado(this.pendingOpenId);
    this.modalInstanceOpen.hide();
  }

  cancelOpen() {
    this.modalInstanceOpen.hide();
  }

  openEstado(id: number): void {
    this.corteService.putCorteOpen(id).subscribe(
      exito => {
        console.log(exito);
        const corte = this.listCorte.find(c => c.id === id);
        if (corte) {
          corte.estado = 'A';
        }
        this.getCortesFiltrados();
      },
      error => {
        console.log(error);
      }
    );
  }

  onRaleoChange(raleoId: any) {
    // normaliza a number o null
    const id = raleoId === null || raleoId === undefined || raleoId === '' ? null : Number(raleoId);
    this.selectedRaleo = id;

    // sincroniza con nuevoCorte si usas ese objeto al guardar
    this.nuevoCorte = {
      ...this.nuevoCorte,
      raleo_tipo_id: id
    };
    // Si el raleo NO es comercial y ya había un contrato seleccionado, lo limpiamos
    if (this.isRaleoComercial()) {
      this.nuevoCorte.bosque_id = null;
      this.nuevoCorte.siembra_rebrote_id = null;
      // limpiar dropdown filtrado para que no muestre opciones residuales
      this.siemRebFiltered = [];
    } else {
      // Si NO es comercial -> limpiar contrato porque no aplica
      this.nuevoCorte.contrato_id = null;
    }
  }

  isRaleoComercial(): boolean {
    const id = Number(this.selectedRaleo ?? this.nuevoCorte?.raleo_tipo_id);
    if (!id) return false;

    const r = (this.raleoTipo || []).find((x: any) => Number(x.id) === Number(id));
    if (!r) return false;

    const COMMERCIAL_KNOWN_IDS = [7]; // añade más ids si aplica
    if (COMMERCIAL_KNOWN_IDS.includes(Number(r.id))) return true;
    return false;
  }

  //--------------DETALLE CORTE---------------------

  openDetailModal(cabecera_corte_id: number) {
    this.selectedCorteId = cabecera_corte_id;
    console.log('Corte ID seleccionado:', this.selectedCorteId);

    // usamos forkJoin para pedir detalle, cabecera y las combinaciones únicas
    forkJoin({
      detalle: this.corteService.getDetalleCorte(cabecera_corte_id),
      cab: this.corteService.getCabeceraCorte(cabecera_corte_id),
      pares: this.corteService.getDistinctBSbyCab(cabecera_corte_id)
    }).subscribe({
      next: ({ detalle, cab, pares }) => {
        // detalles (tabla)
        this.listDetCortes = Array.isArray(detalle) ? detalle : [detalle];
        this.totalTrozas = this.listDetCortes.length;
        this.totalCircBruta = this.listDetCortes.reduce((acc, curr) => acc + (Number(curr.circ_bruta) || 0), 0);
        this.totalCircNeta = this.listDetCortes.reduce((acc, curr) => acc + (Number(curr.circ_neta) || 0), 0);
        this.totalLargoBruto = this.listDetCortes.reduce((acc, curr) => acc + (Number(curr.largo_bruto) || 0), 0);
        this.totalLargoNeto = this.listDetCortes.reduce((acc, curr) => acc + (Number(curr.largo_neto) || 0), 0);
        this.totalMCubica = this.listDetCortes.reduce((acc, curr) => acc + (Number(curr.m_cubica) || 0), 0);
        this.totalValorMCubico = this.listDetCortes.reduce((acc, curr) => acc + (Number(curr.valor_mcubico) || 0), 0);
        this.totalValorTroza = this.listDetCortes.reduce((acc, curr) => acc + (Number(curr.valor_troza) || 0), 0);

        // cabecera
        this.selectedCorte = cab || null;

        // pares únicos bosque/siembra (esperamos [{ bosque_id, siembra_rebrote_id }, ...])
        this.distinctBS = Array.isArray(pares) ? pares : (pares ? [pares] : []);

        // abrir modal
        const modalEl = document.getElementById('verdetModal')!;
        const modal = new bootstrap.Modal(modalEl);
        modal.show();
      },
      error: err => {
        console.error('Error cargando detalles/cabecera/pares únicos:', err);
        alert('Error al cargar los datos del corte. Revisa la consola.');
      }
    });
  }

  closeDetailModal() {
    const modalEl = document.getElementById('verdetModal');
    if (modalEl) {
      const modalInstance = bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl);
      modalInstance.hide();
    }
    this.selectedCorteId = null; // Limpiar el ID 
  }

  confirmarEliminarTodosDetalles(): void {
    if (!this.selectedCorteId) return;

    Swal.fire({
      title: '¿Estás seguro?',
      text: '¿Estás seguro de que deseas eliminar todos los detalles ingresados? Esta acción marcará todos los detalles como inactivos.',
      icon: 'warning',
      showCancelButton: true,
      confirmButtonColor: '#e7354d',
      cancelButtonColor: '#6c757d',
      confirmButtonText: 'Sí, eliminar todos',
      cancelButtonText: 'Cancelar'
    }).then((result) => {
      if (result.isConfirmed) {
        this.eliminarTodosDetalles(this.selectedCorteId!);
      }
    });
  }

  eliminarTodosDetalles(cabecera_corte_id: number): void {
    this.corteService.putDetalleCorteInactiveByCabecera(cabecera_corte_id).subscribe({
      next: () => {
        Swal.fire({
          icon: 'success',
          title: 'Eliminados',
          text: 'Todos los detalles han sido marcados como inactivos correctamente.',
          timer: 2000,
          showConfirmButton: false
        });

        // Limpiar lista de detalles y totales en memoria
        this.listDetCortes = [];
        this.totalTrozas = 0;
        this.totalCircBruta = 0;
        this.totalCircNeta = 0;
        this.totalLargoBruto = 0;
        this.totalLargoNeto = 0;
        this.totalMCubica = 0;
        this.totalValorMCubico = 0;
        this.totalValorTroza = 0;

        // Actualizar el corte en la lista principal
        const corte = this.listCorte.find(c => c.id === cabecera_corte_id);
        if (corte) {
          corte.detalle_cortes_count = 0;
          corte.cant_trozas = 0;
        }
        if (this.selectedCorte) {
          this.selectedCorte.detalle_cortes_count = 0;
          this.selectedCorte.cant_trozas = 0;
        }

        // Cerrar modal
        this.closeDetailModal();
        this.getCortesFiltrados();
      },
      error: (err) => {
        console.error('Error al eliminar los detalles:', err);
        const mensaje = err?.error?.message || 'Ocurrió un error al intentar eliminar los detalles.';
        Swal.fire({
          icon: 'error',
          title: 'Error',
          text: mensaje,
          confirmButtonColor: '#d33'
        });
      }
    });
  }

  openDetailModal2(corteId: number) {
    this.selectedCorteId = corteId;
    this.selectedCorte = null;
    this.nuevoDetCorte = []; // opcional reset
    this.selectedBosqueId = null;
    this.selectedSiembraId = null;

    forkJoin({
      count: this.corteService.countDetalleCorte(corteId),   // debe devolver { count: N }
      cab: this.corteService.getCabeceraCorte(corteId)       // debe devolver la cabecera (con relaciones)
    }).subscribe({
      next: ({ count, cab }) => {
        const existingCount = (count && typeof count.count === 'number') ? count.count : 0;

        // conservar cabecera para mostrar en el modal
        this.selectedCorte = cab || null;

        // inicializo la primera fila justo en existingCount + 1
        this.nuevoDetCorte = [{
          cabecera_corte_id: corteId,
          trozas: existingCount + 1,
          circ_bruta: 0,
          circ_neta: 0,
          largo_bruto: 0,
          largo_neto: 0,
          m_cubica: 0,
          valor_mcubico: 0,
          valor_troza: 0,
          bosque_id: 0,
          siembra_rebrote_id: 0,
        }];

        const modalEl = document.getElementById('detModal')!;
        new bootstrap.Modal(modalEl).show();
      },
      error: err => {
        console.error('No se pudo obtener count o cabecera:', err);
        // fallback: intenta solo el count (si quieres)
        this.corteService.countDetalleCorte(corteId).subscribe(resp => {
          const existingCount = resp.count || 0;
          this.nuevoDetCorte = [{
            cabecera_corte_id: corteId,
            trozas: existingCount + 1,
            circ_bruta: 0,
            circ_neta: 0,
            largo_bruto: 0,
            largo_neto: 0,
            m_cubica: 0,
            valor_mcubico: 0,
            valor_troza: 0,
            bosque_id: 0,
            siembra_rebrote_id: 0,
          }];
          const modalEl = document.getElementById('detModal')!;
          new bootstrap.Modal(modalEl).show();
        }, err2 => {
          console.error('Tampoco pude obtener count:', err2);
          alert('No se pudo abrir el modal: error al obtener datos del corte.');
        });
      }
    });
  }

  addRow() {
    const lastTroza = this.nuevoDetCorte.length
      ? this.nuevoDetCorte[this.nuevoDetCorte.length - 1].trozas
      : 0;

    this.nuevoDetCorte.push({
      cabecera_corte_id: this.selectedCorteId!,
      trozas: lastTroza + 1,
      circ_bruta: 0,
      circ_neta: 0,
      largo_bruto: 0,
      largo_neto: 0,
      m_cubica: 0,
      valor_mcubico: 0,
      valor_troza: 0,
      bosque_id: this.selectedBosqueId || 0,
      siembra_rebrote_id: this.selectedSiembraId || 0,
    });
  }

  removeRow(i: number) {
    this.nuevoDetCorte.splice(i, 1);
  }

  onSaveDet() {
    console.log('Guardando detalles:', this.nuevoDetCorte);
    this.saveDetError = null;
    if (this.selectedFile) {
      const fileInput = document.querySelector('input[type="file"]') as HTMLInputElement | null;
      this.uploadExcel(fileInput || undefined);
    } else {
      this.corteService.postDetalleCorte({ detalles: this.nuevoDetCorte }).subscribe(
        response => {
          console.log('Detalles guardados:', response);
          const added = Array.isArray(response) ? response.length : this.nuevoDetCorte.length;
          const corte = this.listCorte.find(c => c.id === this.selectedCorteId);
          if (corte) {
            corte.detalle_cortes_count = (Number(corte.detalle_cortes_count) || 0) + added;
            corte.cant_trozas = (Number(corte.cant_trozas) || 0) + added;
          }
          // 2) Refresca la lista filtrada para que Angular reevalúe los *ngIf
          this.getCortesFiltrados();
          this.selectedCorteId = null;
          this.corteService.getValorTrozaAll2().subscribe(map => {
            this.corteValorTroza = {};
            Object.entries(map || {}).forEach(([k, v]) => {
              this.corteValorTroza[Number(k)] = Number(v) || 0;
            });

            // (opcional) asegurar entradas por defecto para cortes cargados
            (this.listCorte || []).forEach((c: any) => {
              const id = Number(c.id);
              if (this.corteValorTroza[id] === undefined) this.corteValorTroza[id] = 0;
            });
          }, err => {
            console.error('No pude obtener valorTrozaAll:', err);
          });
          // cerrar modal manualmente (solo si éxito)
          const modalEl = document.getElementById('detModal')!;
          bootstrap.Modal.getInstance(modalEl)?.hide();
          // limpiar error
          this.saveDetError = null;
        },
        err => {
          console.error('Error al guardar los detalles:', err);
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
          this.saveDetError = msg;
          setTimeout(() => this.saveDetError = null, 8000);

          // opcional: desplazar scroll al top del modal para que se vea el alert
          try {
            const modalBody = document.querySelector('#detModal .modal-body') as HTMLElement | null;
            if (modalBody) modalBody.scrollTop = 0;
          } catch { }
        }
      );
    }
  }

  onFileSelected(event: Event) {
    const target = event.target as HTMLInputElement;
    if (target.files && target.files.length > 0) {
      this.selectedFile = target.files[0];
      this.selectedFileName = this.selectedFile.name;
    }
  }

  removeExcel(fileInput?: HTMLInputElement) {
    // limpiar variable
    this.selectedFile = null;
    this.selectedFileName = null;

    // resetear visualmente el input (esto hace que vuelva a aparecer "Escoger archivo")
    if (fileInput) {
      try {
        fileInput.value = ''; // funciona en la mayoría de navegadores
      } catch (e) {
        // fallback: crear uno nuevo en el DOM (raramente necesario)
        const newInput = fileInput.cloneNode(false) as HTMLInputElement;
        fileInput.parentNode?.replaceChild(newInput, fileInput);
      }
    }
  }

  uploadExcel(fileInput?: HTMLInputElement) {
    if (!this.selectedFile || !this.selectedCorteId) {
      this.saveDetError = 'Falta archivo o cabecera seleccionada.';
      return;
    }

    const formData = new FormData();
    formData.append('file', this.selectedFile);
    formData.append('cabecera_corte_id', String(this.selectedCorteId));
    formData.append('bosque_id', String(this.selectedBosqueId));
    formData.append('siembra_rebrote_id', String(this.selectedSiembraId));

    this.isUploading = true;

    this.corteService.postData(formData).subscribe({
      next: (res: any) => {
        console.log('Excel subido y procesado', res);
        // limpiar input y estado
        if (fileInput) {
          try { fileInput.value = ''; fileInput.dispatchEvent(new Event('input', { bubbles: true })); }
          catch { /* fallback no crítico */ }
        } else {
          this.removeExcel();
        }
        this.selectedFile = null;
        this.selectedFileName = null;
        this.isUploading = false;

        const added = Number(res?.added_rows ?? 0);
        const newCount = Number(res?.new_count ?? NaN);
        const existingCount = Number(res?.existing_count ?? NaN);

        const corte = this.listCorte.find(c => c.id === this.selectedCorteId);
        if (corte) {
          if (!isNaN(newCount)) {
            corte.cant_trozas = newCount;
          } else if (added > 0) {
            corte.cant_trozas = (Number(corte.cant_trozas) || 0) + added;
          }
          if (!isNaN(added)) {
            corte.detalle_cortes_count = (Number(corte.detalle_cortes_count) || 0) + added;
          } else if (!isNaN(newCount)) {
            corte.detalle_cortes_count = newCount;
          }
        }

        // cerrar modal SOLO cuando la subida terminó con éxito
        const modalEl = document.getElementById('detModal')!;
        bootstrap.Modal.getInstance(modalEl)?.hide();

        // refrescar datos en UI (llama a tu método existente)
        this.getCortesFiltrados?.(); // o la función que recarga datos
        this.corteService.getValorTrozaAll2().subscribe(map => {
          this.corteValorTroza = {};
          Object.entries(map || {}).forEach(([k, v]) => {
            this.corteValorTroza[Number(k)] = Number(v) || 0;
          });
        });
      },
      error: (err) => {
        console.error('Error al subir Excel', err);
        this.isUploading = false;
        // muestra error en UI
        this.saveDetError = err?.error?.message || 'Error al subir el archivo';
      }
    });
  }

  async exportToPDF() {
    const columns = [
      { header: 'Bosque', dataKey: 'bosque', width: 70 },
      { header: 'Contrato', dataKey: 'contrato' },
      { header: 'Raleo', dataKey: 'raleoTipo', width: 60 },
      { header: 'Siembra/Rebrote', dataKey: 'siembraRebrote', width: 85 },
      { header: 'Fecha', dataKey: 'fechaEmbarque', width: 55, align: 'center' as const },
      { header: 'Trozas', dataKey: 'cantTrozas', width: 45, align: 'right' as const },
      { header: 'N° Viaje', dataKey: 'numeroViaje', width: 45, align: 'center' as const },
      { header: 'N° Envío', dataKey: 'numeroEnvio', width: 45, align: 'center' as const }
    ];

    const rows = this.cortesFiltrados.map(corte => ({
      bosque: this.formatBosques(corte.bosque_id) || '',
      contrato: ((this.getClienteId(this.getContratoId(corte.contrato_id)) || '') +
        (this.getContratoAnio(this.getContratoId(corte.contrato_id)) ? (' - ' + this.getContratoAnio(this.getContratoId(corte.contrato_id))) : '')) || '',
      raleoTipo: this.getRaleoId(corte.raleo_tipo_id) || '',
      siembraRebrote: this.formatSiembras(corte.siembra_rebrote_id) || '',
      fechaEmbarque: this.pdfService.fmtDate(corte.fecha_embarque),
      cantTrozas: corte.cant_trozas ?? '',
      numeroViaje: corte.numero_viaje ?? '',
      numeroEnvio: corte.numero_envio ?? ''
    }));

    await this.pdfService.exportarTabla({
      titulo: 'Reporte de Cortes',
      nombreArchivo: 'reporte_cortes.pdf',
      columnas: columns,
      datos: rows
    });
  }

  async exportToPDF2() {
    if (!this.selectedCorteId) {
      alert('No hay corte seleccionado para exportar.');
      return;
    }

    const corte = this.listCorte.find((c: any) => c.id === this.selectedCorteId);
    if (!corte) {
      alert('No se encontró la información del corte seleccionado.');
      return;
    }

    const infoCabecera: [string, string | number][] = [
      ['Bosque', this.formatBosques(corte.bosque_id)],
      ['Contrato', this.getClienteId(this.getContratoId(corte.contrato_id)) || ''],
      ['Raleo Tipo', this.getRaleoId(corte.raleo_tipo_id) || ''],
      ['Siembra/Rebrote', this.formatSiembras(corte.siembra_rebrote_id)],
      ['Fecha Embarque', this.pdfService.fmtDate(corte.fecha_embarque)],
      ['Cantidad Trozas', corte.cant_trozas ?? ''],
      ['Número de Viaje', corte.numero_viaje ?? ''],
      ['Número de Envío', corte.numero_envio ?? ''],
      ['Total detalles', (this.listDetCortes || []).length.toString()]
    ];

    const head = [
      [
        { content: 'TROZAS', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'CIRCUNFERENCIA', colSpan: 2, styles: { halign: 'center' } },
        { content: 'LARGO', colSpan: 2, styles: { halign: 'center' } },
        { content: 'M³', rowSpan: 2, styles: { halign: 'center', valign: 'middle' } },
        { content: 'VALOR', colSpan: 2, styles: { halign: 'center' } }
      ],
      [
        { content: 'BRUTA', styles: { halign: 'center' } },
        { content: 'NETA', styles: { halign: 'center' } },
        { content: 'BRUTO', styles: { halign: 'center' } },
        { content: 'NETO', styles: { halign: 'center' } },
        { content: 'M³', styles: { halign: 'center' } },
        { content: 'TROZA', styles: { halign: 'center' } }
      ]
    ];

    const columnStyles: Record<number, any> = {
      0: { cellWidth: 50, halign: 'center' },
      1: { cellWidth: 60, halign: 'right' },
      2: { cellWidth: 60, halign: 'right' },
      3: { cellWidth: 70, halign: 'right' },
      4: { cellWidth: 70, halign: 'right' },
      5: { cellWidth: 50, halign: 'right' },
      6: { cellWidth: 80, halign: 'right' },
      7: { cellWidth: 80, halign: 'right' }
    };

    const datos = (this.listDetCortes || []).map(det => [
      det.trozas ?? '',
      this.pdfService.fmtNumber(det.circ_bruta ?? '', 0, 2),
      this.pdfService.fmtNumber(det.circ_neta ?? '', 0, 2),
      this.pdfService.fmtNumber(det.largo_bruto ?? '', 2, 2),
      this.pdfService.fmtNumber(det.largo_neto ?? '', 2, 2),
      this.pdfService.fmtNumber(det.m_cubica ?? '', 4, 4),
      this.pdfService.fmtCurrency(det.valor_mcubico),
      this.pdfService.fmtCurrency(det.valor_troza)
    ]);

    const filasTotales = [
      [
        'TOTAL:',
        this.pdfService.fmtNumber(this.totalCircBruta || 0, 0, 2),
        this.pdfService.fmtNumber(this.totalCircNeta || 0, 0, 2),
        this.pdfService.fmtNumber(this.totalLargoBruto || 0, 2, 2),
        this.pdfService.fmtNumber(this.totalLargoNeto || 0, 2, 2),
        this.pdfService.fmtNumber(this.totalMCubica || 0, 4, 4),
        '',
        this.pdfService.fmtCurrency(this.totalValorTroza || 0)
      ]
    ];

    await this.pdfService.exportarFichaDetalle({
      titulo: `Corte - ID ${corte.id}`,
      subtitulo: `${this.getClienteId(this.getContratoId(corte.contrato_id)) || ''}${this.getContratoAnio(this.getContratoId(corte.contrato_id)) ? (' - ' + this.getContratoAnio(this.getContratoId(corte.contrato_id))) : ''}`,
      nombreArchivo: `corte_${corte.id}_detalles.pdf`,
      infoCabecera,
      head,
      columnStyles,
      datos,
      filasTotales
    });
  }

  formatBosques(val: any): string {
    if (!val) return '';
    if (Array.isArray(val)) {
      return val.map(id => this.getBosqueId(id)).join(', ');
    }
    return this.getBosqueId(val);
  }

  formatSiembras(val: any): string {
    if (!val) return '';
    if (Array.isArray(val)) {
      return val.map(id => {
        const tipo = this.getSiemRebTipo(this.getSiemRebId(id));
        const anio = this.getSiemRebAnio(id);
        return `${tipo}${anio ? ' - ' + anio : ''}`;
      }).join(', ');
    }
    const tipo = this.getSiemRebTipo(this.getSiemRebId(val));
    const anio = this.getSiemRebAnio(val);
    return `${tipo}${anio ? ' - ' + anio : ''}`;
  }
}


