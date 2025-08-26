import { Component, ElementRef, ViewChild } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { NgxPaginationModule } from 'ngx-pagination';
import { FormsModule } from '@angular/forms';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { forkJoin } from 'rxjs';

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

  listDetCortes: any[] = [];
  selectedCorteId: number | null = null;
  selectedCorte: any = null;
  //selectedContractForCorte: number | null = null;
  isContractLocked = false;
  selectedRaleo: number | null = null;

  listCorte: any[] = [];
  cortesFiltrados: any[] = [];

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

  constructor(private corteService: ApiService, private route: ActivatedRoute) { }

  ngOnInit(): void {
    const idSiemRebParam = this.route.snapshot.paramMap.get('idSiembraRebrote');
    console.log(idSiemRebParam);
    if (idSiemRebParam) {
      this.filtroSiembraRebrote = +idSiemRebParam; // lo conviertes a número y aplicas como filtro
      console.log('filtroSiembraRebrote', this.filtroSiembraRebrote);
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
        },
        error: err => {
          console.error(err);
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
    // aquí envías this.detalles junto al contrato
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
      },
      error => {
        console.error('Error al guardar los detalles:', error);
      }
    );
  }
  exportToPDF() {
    const doc = new jsPDF();
    const columns = [
      { header: 'Bosque', dataKey: 'bosque' },
      { header: 'Contrato', dataKey: 'contrato' },
      { header: 'Raleo Tipo', dataKey: 'raleoTipo' },
      { header: 'Siembra/Rebrote', dataKey: 'siembraRebrote' },
      { header: 'Sello Tipo', dataKey: 'selloTipo' },
      { header: 'Fecha Embarque', dataKey: 'fechaEmbarque' },
      { header: 'Cantidad Árboles', dataKey: 'cantArboles' },
      { header: 'Número de Viaje', dataKey: 'numeroViaje' },
      // { header: 'Placa Carro', dataKey: 'placaCarro' },
      // { header: 'Contenedor', dataKey: 'contenedor' },
      // { header: 'Conductor', dataKey: 'conductor' },
      // { header: 'Supervisor', dataKey: 'supervisor' }
    ];
    const rows = this.cortesFiltrados.map(corte => ({
      bosque: this.getBosqueId(corte.bosque_id),
      contrato: this.getClienteId(this.getContratoId(corte.contrato_id)) + ' - ' + this.getContratoAnio(this.getContratoId(corte.contrato_id)),
      raleoTipo: this.getRaleoId(corte.raleo_tipo_id),
      siembraRebrote: this.getSiemRebTipo(this.getSiemRebId(corte.siembra_rebrote_id)) + ' - ' + this.getSiemRebAnio(corte.siembra_rebrote_id),
      selloTipo: this.getSelloTipoId(corte.sello_id),
      fechaEmbarque: corte.fecha_embarque,
      cantArboles: corte.cant_arboles,
      numeroViaje: corte.numero_viaje,
      // placaCarro: corte.placa_carro,
      // contenedor: corte.contenedor,
      // conductor: corte.conductor,
      // supervisor: corte.supervisor
    }));
    doc.text('Reporte de Cortes', 14, 10);
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
    doc.save('reporte_cortes.pdf');
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

    const fmtCurrency = (v: number) => {
      try {
        return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD' }).format(Number(v) || 0);
      } catch {
        return (Number(v) || 0).toFixed(2);
      }
    };
    const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString() : '';

    const doc = new jsPDF();

    // Título principal
    doc.setFontSize(14);
    doc.text(`Corte - ID ${corte.id}`, 14, 14);

    // Información del corte
    const cabeceraRows = [
      ['Bosque', this.getBosqueId(corte.bosque_id) || ''],
      ['Contrato', this.getClienteId(this.getContratoId(corte.contrato_id)) || ''],
      // ['Año Contrato', this.getContratoAnio(this.getContratoId(corte.contrato_id)) || ''],
      ['Raleo Tipo', this.getRaleoId(corte.raleo_tipo_id) || ''],
      ['Siembra/Rebrote', this.getSiemRebTipo(this.getSiemRebId(corte.siembra_rebrote_id)) || ''],
      ['Año Siembra/Rebrote', this.getSiemRebAnio(corte.siembra_rebrote_id) || ''],
      ['Sello Tipo', this.getSelloTipoId(corte.sello_id) || ''],
      ['Fecha Embarque', fmtDate(corte.fecha_embarque) || ''],
      ['Cantidad Árboles', corte.cant_arboles ?? ''],
      ['Número de Viaje', corte.numero_viaje ?? ''],
      // ['Placa Carro', corte.placa_carro || ''],
      // ['Contenedor', corte.contenedor || ''],
      // ['Conductor', corte.conductor || ''],
      // ['Supervisor', corte.supervisor || ''],
      // ['Estado', corte.estado === 'A' ? 'Activo' : corte.estado === 'C' ? 'Cerrado' : (corte.estado ?? '')],
      // ['Valor Troza', fmtCurrency(this.corteValorTroza[Number(corte.id)] || 0)],
      ['Total detalles', (this.listDetCortes || []).length.toString()]
    ]

    autoTable(doc, {
      startY: 20,
      head: [['Campo', 'Valor']],
      body: cabeceraRows,
      styles: { halign: 'left', fontSize: 10 },
      headStyles: { fillColor: [0, 127, 0], textColor: 255 },
      theme: 'grid'
    });

    // Espacio antes de la tabla de detalles
    const afterHeaderY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 6 : 46;

    const detalleColumns = [
      { header: 'Trozas', dataKey: 'trozas' },
      { header: 'Circ. Bruta', dataKey: 'circ_bruta' },
      { header: 'Circ. Neta', dataKey: 'circ_neta' },
      { header: 'Largo Bruto', dataKey: 'largo_bruto' },
      { header: 'Largo Neto', dataKey: 'largo_neto' },
      { header: 'M³ Cúbica', dataKey: 'm_cubica' },
      { header: 'Valor M³ Cúbico', dataKey: 'valor_mcubico' },
      // { header: 'Valor Troza', dataKey: 'valor_troza' }
    ];

    const detalleRows = (this.listDetCortes || []).map(det => ({
      trozas: det.trozas ?? '',
      circ_bruta: det.circ_bruta ?? '',
      circ_neta: det.circ_neta ?? '',
      largo_bruto: Number(det.largo_bruto) ?? '',
      largo_neto: Number(det.largo_neto) ?? '',
      m_cubica: Number(det.m_cubica) ?? '',
      valor_mcubico: fmtCurrency(det.valor_mcubico),
    }));

    doc.setFontSize(12);
    doc.text('Detalles del corte', 14, afterHeaderY - 2);

    autoTable(doc, {
      startY: afterHeaderY,
      columns: detalleColumns,
      body: detalleRows,
      styles: { fontSize: 9 },
      headStyles: { fillColor: [0, 127, 0], textColor: 255 },
      showHead: 'everyPage'
    });

    // Guardar con nombre que identifica el contrato
    const filename = `corte${corte.id}_detalles.pdf`;
    doc.save(filename);
  }

}


