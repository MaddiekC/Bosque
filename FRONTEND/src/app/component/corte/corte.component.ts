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

declare const bootstrap: any;

interface Corte {
  id: number,
  bosque_id: number,
  contrato_id: number,
  raleo_tipo_id: number,
  siembra_rebrote_id: number,
  sello_id: number,
  fecha_embarque: string,
  cant_arboles: number,
  numero_viaje: number,
  placa_carro: string,
  contenedor: string,
  conductor: string,
  supervisor: string
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
  valor_troza: number
}

@Component({
  selector: 'app-corte',
  standalone: true,
  imports: [CommonModule, RouterModule, NgxPaginationModule, FormsModule],
  templateUrl: './corte.component.html',
  styleUrl: './corte.component.css'
})
export class CorteComponent {
  @ViewChild('confirmModal') confirmModal!: ElementRef;
  @ViewChild('confirmModalAgreem') confirmModalAgreem!: ElementRef;

  private modalInstance: any;
  private pendingDeleteId!: number;
  private modalInstanceAgreem: any;
  private pendingCloseAgreemId!: number;

  nuevoDetCorte: detCorte[] = [{
    cabecera_corte_id: 0,
    trozas: 0,
    circ_bruta: 0,
    circ_neta: 0,
    largo_bruto: 0,
    largo_neto: 0,
    m_cubica: 0,
    valor_mcubico: 0,
    valor_troza: 0
  }];

  nuevoCorte: any = {
    bosque_id: 0,
    contrato_id: 0,
    raleo_tipo_id: 0,
    siembra_rebrote_id: 0,
    sello_id: 0,
    fecha_embarque: '',
    cant_arboles: 0,
    numero_viaje: 0,
    placa_carro: '',
    contenedor: '',
    conductor: '',
    supervisor: ''
  };

  SaldoDisponible = 0;

  listDetCortes: any[] = [];
  selectedCorteId: number | null = null;
  selectedCorte: any = null;
  //selectedContractForCorte: number | null = null;
  isContractLocked = false;
  selectedRaleo: number | null = null;

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
  filtroNumeroViaje: number | null = null;

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
  selloTipo: any[] = [];
  siembTipo: any[] = [];
  cliente: any[] = [];
  corteEditando: Corte | null = null;
  siemRebFiltered: any[] = [];

  constructor(private corteService: ApiService, private route: ActivatedRoute, private authService: AuthserviceService) { }

  ngOnInit(): void {
    const u = this.authService.getUserInfo();      // string | null
    this.username = u ?? 'Invitado';
    console.log('Usuario:', this.username);

    const idSiemRebParam = this.route.snapshot.paramMap.get('idSiembraRebrote');
    const idBosqueParam = this.route.snapshot.paramMap.get('bosqueId');
    console.log('Ruta', idSiemRebParam, idBosqueParam);
    if (idSiemRebParam) {
      this.filtroSiembraRebrote = +idSiemRebParam; // lo conviertes a número y aplicas como filtro
      console.log('filtroSiembraRebrote', this.filtroSiembraRebrote);
    }
    if (idBosqueParam) {
      this.filtroBosque = +idBosqueParam;
      console.log('filtroBosque', this.filtroBosque)
    }

    this.corteService.getCabeceraCortes().subscribe(
      exito => {
        console.log('corte', exito);
        this.listCorte = exito
        this.getCortesFiltrados();
      },
      error => {
        console.log(error);
      }
    );
    this.corteService.getBosques().subscribe(
      exito => {
        this.bosques = exito;
      },
      error => {
        console.log(error);
      }
    );
    this.corteService.getClientes().subscribe(
      exito => {
        console.log('cliente', exito);
        this.cliente = exito;
      },
      error => {
        console.log(error);
      }
    );
    this.corteService.getContratos().subscribe(
      exito => {
        console.log('contratos', exito);
        this.contrato = exito;
      },
      error => {
        console.log(error);
      }
    );
    this.corteService.getTipoArbol('raleoTipo').subscribe(
      exito => {
        console.log('raleo', exito);
        this.raleoTipo = exito;
      },
      error => {
        console.log(error);
      }
    );
    this.corteService.getTipoArbol('siembraRebrote').subscribe(
      exito => {
        console.log('siembraRebrote', exito);
        this.siembTipo = exito;
      },
      error => {
        console.log(error);
      }
    );
    this.corteService.getSiembraRebrotes().subscribe(
      exito => {
        this.siemReb = exito;
      },
      error => {
        console.log(error);
      }
    );
    this.corteService.getSelloTipo('sello').subscribe(
      exito => {
        console.log('sello', exito);
        this.selloTipo = exito;
      },
      error => {
        console.log(error);
      }
    );
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
  }

  ngAfterViewInit(): void {
    this.modalInstance = new bootstrap.Modal(this.confirmModal.nativeElement);
    this.modalInstanceAgreem = new bootstrap.Modal(this.confirmModalAgreem.nativeElement);
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
      //mostrar vacío hasta que se seleccione bosque
      this.siemRebFiltered = [];
      return;
    }
    this.siemRebFiltered = (this.siemReb || []).filter(s => {
      // comprueba varias formas para robustez:
      const sBosqueId = s.bosque_id ?? s.idbosque ?? s.bosque?.id ?? null;
      return sBosqueId !== null && Number(sBosqueId) === Number(bosqueId);
    });
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
  getSelloTipoId(selloTipoId: string) {
    const selloTipos = this.selloTipo?.find((b: any) => b.id == selloTipoId);
    return selloTipos ? selloTipos.nombre : '';
  }
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
    return this.cortesFiltrados = this.listCorte.filter(b =>
      (!this.filtroSiembraRebrote
        || +b.siembra_rebrote_id === this.filtroSiembraRebrote)
      && (!this.filtroBosque || b.bosque_id == this.filtroBosque)
      && (!this.filtroSR || b.siembra_rebrote_id.toString().toLowerCase().includes(this.filtroSR.toLowerCase()))
      && (!this.filtroContrato || b.contrato_id == this.filtroContrato)
      && (!this.filtroRaleoTipo || b.raleo_tipo_id == this.filtroRaleoTipo)
      && (!this.filtroSelloTipo || b.sello_id == this.filtroSelloTipo)
      && (!this.filtroNumeroViaje || b.numero_viaje == this.filtroNumeroViaje)
      && (!this.filtroFecha || new Date(b.fecha_embarque).toDateString() === new Date(this.filtroFecha).toDateString())
    );
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
        console.log(error);
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
        if (idx !== -1) this.listCorte[idx] = updated;
        this.listCorte[idx] = {
          ...this.listCorte[idx]
        };
        this.getCortesFiltrados();

        // 2) Cierra el modal manualmente
        const modalEl = document.getElementById('editarModal')!;
        const modalInstance = bootstrap.Modal.getInstance(modalEl);
        modalInstance?.hide();

        // 3) Limpia el objeto de edición
        this.corteEditando = null;
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
    if (!this.isRaleoComercial()) {
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

    this.corteService.getDetalleCorte(cabecera_corte_id)
      .subscribe(response => {
        this.listDetCortes = Array.isArray(response) ? response : [response];
        this.totalTrozas = this.listDetCortes.length;
        this.totalCircBruta = this.listDetCortes.reduce((acc, curr) => acc + (Number(curr.circ_bruta) || 0), 0);
        this.totalCircNeta = this.listDetCortes.reduce((acc, curr) => acc + (Number(curr.circ_neta) || 0), 0);
        this.totalLargoBruto = this.listDetCortes.reduce((acc, curr) => acc + (Number(curr.largo_bruto) || 0), 0);
        this.totalLargoNeto = this.listDetCortes.reduce((acc, curr) => acc + (Number(curr.largo_neto) || 0), 0);
        this.totalMCubica = this.listDetCortes.reduce((acc, curr) => acc + (Number(curr.m_cubica) || 0), 0);
        this.totalValorMCubico = this.listDetCortes.reduce((acc, curr) => acc + (Number(curr.valor_mcubico) || 0), 0);
        this.totalValorTroza = this.listDetCortes.reduce((acc, curr) => acc + (Number(curr.valor_troza) || 0), 0);

        this.corteService.getCabeceraCorte(cabecera_corte_id).subscribe(
          cab => this.selectedCorte = cab,
          err => {
            console.warn('No se pudo cargar cabecera (no crítica):', err);
            this.selectedCorte = null;
          }
        );

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
    this.selectedCorteId = null; // Limpiar el ID 
  }

  openDetailModal2(corteId: number) {
    this.selectedCorteId = corteId;
    this.selectedCorte = null;
    this.nuevoDetCorte = []; // opcional reset

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
          valor_troza: 0
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
            valor_troza: 0
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
      valor_troza: 0
    });
  }

  removeRow(i: number) {
    this.nuevoDetCorte.splice(i, 1);
  }

  onSaveDet() {
    this.saveDetError = null;
    console.log('Guardando detalles:', this.nuevoDetCorte);

    this.corteService.postDetalleCorte({ detalles: this.nuevoDetCorte }).subscribe(
      response => {
        console.log('Detalles guardados:', response);
        const added = Array.isArray(response) ? response.length : this.nuevoDetCorte.length;
        const corte = this.listCorte.find(c => c.id === this.selectedCorteId);
        if (corte) {
          // Actualiza ambos campos por seguridad
          corte.detalle_cortes_count = (Number(corte.detalle_cortes_count) || 0) + added;
          corte.cant_arboles = (Number(corte.cant_arboles) || 0) + added;
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

        // opcional: desplazar scroll al top del modal para que se vea el alert
        try {
          const modalBody = document.querySelector('#detModal .modal-body') as HTMLElement | null;
          if (modalBody) modalBody.scrollTop = 0;
        } catch { }
      }
    );
  }
  exportToPDF() {
    const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
    const pageSize = doc.internal.pageSize as any;
    const pageWidth = pageSize.getWidth();
    const pageHeight = pageSize.getHeight();

    // Márgenes reducidos para aprovechar el ancho
    const marginLeft = 20;
    const marginRight = 20;
    const usableWidth = pageWidth - marginLeft - marginRight;

    const headerY = 36;
    const margin = 40;
    const username = this.username ?? 'Invitado';
    const generatedAt = new Date().toLocaleString('es-ES');

    // Prepara filas (asegura valores string)
    const rows = this.cortesFiltrados.map(corte => ({
      bosque: this.getBosqueId(corte.bosque_id) || '',
      contrato: ((this.getClienteId(this.getContratoId(corte.contrato_id)) || '') +
        (this.getContratoAnio(this.getContratoId(corte.contrato_id)) ? (' - ' + this.getContratoAnio(this.getContratoId(corte.contrato_id))) : '')) || '',
      raleoTipo: this.getRaleoId(corte.raleo_tipo_id) || '',
      siembraRebrote: ((this.getSiemRebTipo(this.getSiemRebId(corte.siembra_rebrote_id)) || '') +
        (this.getSiemRebAnio(corte.siembra_rebrote_id) ? (' - ' + this.getSiemRebAnio(corte.siembra_rebrote_id)) : '')) || '',
      selloTipo: this.getSelloTipoId(corte.sello_id) || '',
      fechaEmbarque: corte.fecha_embarque ? new Date(corte.fecha_embarque).toLocaleDateString('es-ES') : '',
      cantArboles: corte.cant_arboles ?? '',
      numeroViaje: corte.numero_viaje ?? ''
    }));

    const columns = [
      { header: 'Bosque', dataKey: 'bosque' },
      { header: 'Contrato', dataKey: 'contrato' },
      { header: 'Raleo', dataKey: 'raleoTipo' },
      { header: 'Siembra/Rebrote', dataKey: 'siembraRebrote' },
      { header: 'Sello', dataKey: 'selloTipo' },
      { header: 'Fecha', dataKey: 'fechaEmbarque' },
      { header: 'Árboles', dataKey: 'cantArboles' },
      { header: 'N° Viaje', dataKey: 'numeroViaje' }
    ];

    // Asignar anchos compactos que sumen usableWidth (ajusta si necesitas)
    const columnWidths: Record<number, number> = {
      0: 55,   // Bosque
      1: 100,  // Contrato (mayor, permitirá wrap)
      2: 60,   // Raleo
      3: 88,  // Siembra/Rebrote
      4: 50,   // Sello
      5: 50,   // Fecha
      6: 35,   // Árboles
      7: 30    // N° Viaje
    };
    // Si por alguna razón la suma difiere, auto-ajusta último ancho:
    const totalAssigned = Object.values(columnWidths).reduce((a, b) => a + b, 0);
    const diff = Math.round(usableWidth - totalAssigned);
    if (diff !== 0) {
      // añadir la diferencia a la columna contrato (índice 1)
      columnWidths[1] = (columnWidths[1] || 100) + diff;
    }

    // Header/footer dibujados en cada página
    const drawHeader = (data: any) => {
      // Título
      doc.setFontSize(12);
      doc.setFont('bold');
      doc.text('Reporte de Cortes', marginLeft, 18);

      // Info a la derecha (fecha + usuario)
      doc.setFontSize(8);
      doc.setFont('normal');
      const gen = `Generado: ${generatedAt}`;
      const usr = `Usuario: ${username}`;
      doc.text(gen, pageWidth - marginRight - doc.getTextWidth(gen), 14);
      doc.text(usr, pageWidth - marginRight - doc.getTextWidth(usr), 28);

      // Línea divisoria
      doc.setDrawColor(200);
      doc.setLineWidth(0.5);
      doc.line(marginLeft, headerY, pageWidth - marginRight, headerY);
    };

    // Construye body como array de arrays (autoTable fácil)
    const body = rows.map(r => columns.map((c) => (r as any)[c.dataKey]));

    autoTable(doc, {
      startY: headerY + 6,
      head: [columns.map(c => c.header)],
      body: body,
      margin: { left: marginLeft, right: marginRight, top: headerY + 6 },
      styles: {
        fontSize: 10,
        cellPadding: 3,
        overflow: 'linebreak', // wrapping
        halign: 'left',
        valign: 'middle',
      },
      headStyles: { fillColor: [34, 139, 34], textColor: 255, halign: 'center' },
      columnStyles: Object.fromEntries(Object.entries(columnWidths).map(([k, w]) => [Number(k), { cellWidth: Number(w) }])),
      tableWidth: usableWidth,
      didDrawPage: (data) => {
        // número de página actual que te da autoTable
        const page = data.pageNumber;
        const pageText = `Página ${page}`;
        const footerText = `Usuario: ${username} · Generado: ${generatedAt}`;

        // footer a la derecha y texto a la izquierda
        doc.setFontSize(9);
        doc.text(pageText, pageWidth - margin - doc.getTextWidth(pageText), pageHeight - 20);
        doc.text(footerText, margin, pageHeight - 20);

        // (si quieres header por página, también lo dibujas aquí)
        drawHeader(data);
      },
      showHead: 'everyPage'
    });
    const filename = `reporte_cortes.pdf`;
    doc.save(filename);
  }

  exportToPDF2() {
    if (!this.selectedCorteId) {
      alert('No hay corte seleccionado para exportar.');
      return;
    }

    const corte = this.listCorte.find((c: any) => c.id === this.selectedCorteId);
    if (!corte) {
      alert('No se encontró la información del corte seleccionado.');
      return;
    }

    const fmtCurrency = (v: any) => {
      const n = Number(v) || 0;
      try {
        return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
      } catch {
        return n.toFixed(2);
      }
    };
    const fmtNumber = (v: any, min = 0, max = 4) => {
      const n = Number(v) || 0;
      try {
        return new Intl.NumberFormat('es-ES', { minimumFractionDigits: min, maximumFractionDigits: max }).format(n);
      } catch {
        return n.toFixed(max);
      }
    };
    const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString('es-ES') : '';

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = (doc.internal.pageSize as any).width || doc.internal.pageSize.getWidth();
    const pageHeight = (doc.internal.pageSize as any).height || doc.internal.pageSize.getHeight();
    const margin = 40;

    // Header/foot layout
    const headerTop = 22;        // y inicial del header
    const lineHeight = 10;      // separación compacta
    const headerHeight = headerTop + lineHeight * 3 + 8; // reservar espacio para header
    const topMargin = headerHeight + 10;

    const title = `Corte - ID ${corte.id}`;
    const subtitle = `${this.getClienteId(this.getContratoId(corte.contrato_id)) || ''}` +
      (this.getContratoAnio(this.getContratoId(corte.contrato_id)) ? (' - ' + this.getContratoAnio(this.getContratoId(corte.contrato_id))) : '');
    const generatedAt = `Generado: ${new Date().toLocaleString('es-ES')}`;
    const usuarioTexto = `Usuario: ${this.username ?? 'Invitado'}`;

    // guardamos páginas en las que ya dibujamos el header para evitar duplicados
    const drawnPages = new Set<number>();

    const drawHeader = (data?: any) => {
      // determinar número de página (autoTable pasa data.pageNumber)
      const pageNumber = (data && data.pageNumber) ? data.pageNumber : ((doc as any).internal?.getNumberOfPages ? (doc as any).internal.getNumberOfPages() : 1);
      if (drawnPages.has(pageNumber)) return; // ya dibujado en esta página

      // dibujar header compacto
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text(title, margin, headerTop);

      doc.setFontSize(9);
      doc.setFont('helvetica', 'normal');
      const wSub = doc.getTextWidth(subtitle);
      if (wSub < pageWidth - margin * 2) {
        doc.text(subtitle, pageWidth - margin - wSub, headerTop);
      } else {
        doc.text(subtitle, margin, headerTop + lineHeight);
      }

      const genY = headerTop + lineHeight;
      const usrY = genY + lineHeight;
      const genW = doc.getTextWidth(generatedAt);
      const usrW = doc.getTextWidth(usuarioTexto);
      doc.text(generatedAt, pageWidth - margin - genW, genY);
      doc.text(usuarioTexto, pageWidth - margin - usrW, usrY);

      // separador
      doc.setDrawColor(200);
      doc.setLineWidth(0.5);
      doc.line(margin, usrY + 6, pageWidth - margin, usrY + 6);

      drawnPages.add(pageNumber); // marcar como dibujado
    };

    const cabeceraRows = [
      ['Bosque', this.getBosqueId(corte.bosque_id) || ''],
      ['Contrato', this.getClienteId(this.getContratoId(corte.contrato_id)) || ''],
      ['Raleo Tipo', this.getRaleoId(corte.raleo_tipo_id) || ''],
      ['Siembra/Rebrote', this.getSiemRebTipo(this.getSiemRebId(corte.siembra_rebrote_id)) || ''],
      ['Año Siembra/Rebrote', this.getSiemRebAnio(corte.siembra_rebrote_id) || ''],
      ['Sello Tipo', this.getSelloTipoId(corte.sello_id) || ''],
      ['Fecha Embarque', fmtDate(corte.fecha_embarque) || ''],
      ['Cantidad Árboles', corte.cant_arboles ?? ''],
      ['Número de Viaje', corte.numero_viaje ?? ''],
      ['Total detalles', (this.listDetCortes || []).length.toString()]
    ];

    const detalleRows = (this.listDetCortes || []).map(det => ([
      det.trozas ?? '',
      fmtNumber(det.circ_bruta ?? '', 0, 2),
      fmtNumber(det.circ_neta ?? '', 0, 2),
      fmtNumber(det.largo_bruto ?? '', 2, 2),
      fmtNumber(det.largo_neto ?? '', 2, 2),
      fmtNumber(det.m_cubica ?? '', 4, 4),
      fmtCurrency(det.valor_mcubico),
      fmtCurrency(det.valor_troza)
    ]));

    const footRow = [
      `TOTAL:`,
      fmtNumber(this.totalCircBruta || 0, 0, 2),
      fmtNumber(this.totalCircNeta || 0, 0, 2),
      fmtNumber(this.totalLargoBruto || 0, 2, 2),
      fmtNumber(this.totalLargoNeto || 0, 2, 2),
      fmtNumber(this.totalMCubica || 0, 4, 4),
      fmtCurrency(this.totalValorMCubico || 0),
      fmtCurrency(this.totalValorTroza || 0)
    ];

    // (IMPORTANTE) dibujamos el header para la página 1 antes de las tablas
    drawHeader({ pageNumber: 1 });

    // tabla de cabecera (campo/valor)
    autoTable(doc, {
      startY: headerHeight + 6,
      margin: { top: topMargin },
      body: cabeceraRows,
      theme: 'grid',
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [34, 139, 34], textColor: 255, halign: 'center' },
      columnStyles: {
        0: { cellWidth: 120, halign: 'left', fontStyle: 'bold' },
        1: { halign: 'left' }
      },
      didDrawPage: (data) => {
        // se ejecutará en cada página que autoTable necesite para esta tabla,
        // drawHeader se encargará de evitar duplicados.
        drawHeader(data);
      }
    });

    const afterHeaderY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 12 : headerHeight + 60;

    // multi-head + detalle (SIN foot)
    const multiHead = [
      ['TROZAS', 'CIRCUNFERENCIA', '', 'LARGO', '', 'M³', 'VALOR', ''],
      ['', 'BRUTA', 'NETA', 'BRUTO', 'NETO', '', 'M³', 'TROZA']
    ];

    // MAIN table (sin foot)
    autoTable(doc, {
      startY: afterHeaderY,
      margin: { top: topMargin },
      head: multiHead,
      body: detalleRows,
      theme: 'striped',
      styles: { fontSize: 9, cellPadding: 5 },
      headStyles: { fillColor: [34, 139, 34], textColor: 255 },
      columnStyles: {
        0: { halign: 'center', cellWidth: 50 },
        1: { halign: 'right', cellWidth: 60 },
        2: { halign: 'right', cellWidth: 60 },
        3: { halign: 'right', cellWidth: 70 },
        4: { halign: 'right', cellWidth: 70 },
        5: { halign: 'right', cellWidth: 50 },
        6: { halign: 'right', cellWidth: 80 },
        7: { halign: 'right', cellWidth: 80 }
      },
      didParseCell: (data) => {
        if (data.section === 'head' && data.row.index === 0) {
          if (data.column.index === 1 || data.column.index === 3) {
            data.cell.colSpan = 2;
            data.cell.styles.halign = 'center';
          }
        }
        if (data.section === 'head' && data.row.index === 1) {
          data.cell.styles.halign = 'center';
        }
      },
      didDrawPage: (data) => {
        // footer y header por página; drawHeader evita duplicados
        const page = data.pageNumber;
        const pageText = `Página ${page}`;
        const footerText = `${usuarioTexto} · ${generatedAt}`;

        doc.setFontSize(9);
        // Espaciado extra debajo del footer (por ejemplo, 10pt)
        const footerY = pageHeight - 10;
        doc.text(pageText, pageWidth - margin - doc.getTextWidth(pageText), footerY);
        doc.text(footerText, margin, footerY);

        drawHeader(data);
      },
      showHead: 'everyPage'
    });

    // --- AÑADIMOS la fila de totales SOLO en la última página ---
    const lastTable = (doc as any).lastAutoTable;
    const lastY = lastTable ? lastTable.finalY : (pageHeight - 60);
    const lastPage = (doc as any).internal.getNumberOfPages ? (doc as any).internal.getNumberOfPages() : 1;

    // ir a la última página
    doc.setPage(lastPage);

    // decidir startY para el total; si no cabe en la página actual, añadimos página
    let footStartY = lastY + 10;
    const neededHeight = 20 + 10; // aproximado alto de la fila de totales
    if (footStartY + neededHeight > pageHeight - 30) {
      doc.addPage();
      // marcar header de la nueva página y dibujarlo
      const newPageNum = (doc as any).internal.getNumberOfPages();
      drawHeader({ pageNumber: newPageNum });
      footStartY = margin;
      doc.setPage(newPageNum);
    }

    // dibujar la fila de totales como una mini tabla (una sola fila)
    autoTable(doc, {
      startY: footStartY,
      body: [footRow],
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 5 },
      columnStyles: {
        0: { halign: 'left', cellWidth: 50 },
        1: { halign: 'right', cellWidth: 60 },
        2: { halign: 'right', cellWidth: 60 },
        3: { halign: 'right', cellWidth: 70 },
        4: { halign: 'right', cellWidth: 70 },
        5: { halign: 'right', cellWidth: 50 },
        6: { halign: 'right', cellWidth: 80 },
        7: { halign: 'right', cellWidth: 80 }
      },
      headStyles: { fillColor: [220, 220, 220], textColor: 50 },
      footStyles: { fillColor: [220, 220, 220], textColor: 50, fontStyle: 'bold' },
      showHead: 'never',
      didDrawPage: (data) => {
        // footer para la página de totales
        const page = data.pageNumber;
        const pageText = `Página ${page}`;
        const footerText = `${usuarioTexto} · ${generatedAt}`;
        doc.setFontSize(9);
        //doc.text(pageText, pageWidth - margin - doc.getTextWidth(pageText), pageHeight - 20);
        //doc.text(footerText, margin, pageHeight - 20);
        drawHeader(data); // por si añadido página nueva (drawHeader controla duplicados)
      }
    });

    const filename = `corte_${corte.id}_detalles.pdf`;
    doc.save(filename);
  }
}


