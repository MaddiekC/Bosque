import { Component, ElementRef, ViewChild } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { NgxPaginationModule } from 'ngx-pagination';
import { FormsModule } from '@angular/forms';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';

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
    id: 0,
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
  listCorte: any[] = [];
  cortesFiltrados: any[] = [];

  filtroSiembraRebrote: number | null = null;
  filtroBosque: number | null = null;
  filtroContrato: number | null = null;
  filtroFecha: Date | null = null;
  filtroNumeroViaje: number | null = null;

  // paginación
  paginaActual: number = 1;
  itemsPorPagina: number = 15;

  //Totales
  totalCircBruta: number = 0;
  totalCircNeta: number = 0
  totalLargoBruto: number = 0;
  totalLargoNeto: number = 0
  totalMCubica: number = 0;
  totalValorMCubico: number = 0
  totalValorTroza: number = 0;

  // Datos para los select
  bosques: any[] = [];
  contrato: any[] = [];
  raleoTipo: any[] = [];
  siemReb: any[] = [];
  selloTipo: any[] = [];
  cliente: any[] = [];
  corteEditando: Corte | null = null;

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
  }

  ngAfterViewInit(): void {
    this.modalInstance = new bootstrap.Modal(this.confirmModal.nativeElement);
    this.modalInstanceAgreem = new bootstrap.Modal(this.confirmModalAgreem.nativeElement);
    const tooltipTriggerList = Array.from(document.querySelectorAll('[data-bs-toggle="tooltip"]'));
    tooltipTriggerList.forEach((tooltipTriggerEl: Element) => {
      new bootstrap.Tooltip(tooltipTriggerEl);
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
    return siembraRebrote ? siembraRebrote.id : '';
  }
  getCortesFiltrados() {
    return this.cortesFiltrados = this.listCorte.filter(b =>
      (!this.filtroSiembraRebrote
        || +b.siembra_rebrote_id === this.filtroSiembraRebrote)
      && (!this.filtroBosque || b.bosque_id == this.filtroBosque)
      && (!this.filtroContrato || b.contrato_id == this.filtroContrato)
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
          //console.log('fecha', f.fecha);
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
        this.listCorte = this.listCorte.filter(cabecera_corte => cabecera_corte.id !== id);
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


  //--------------DETALLE CORTE---------------------

  openDetailModal(cabecera_corte_id: number) {
    this.selectedCorteId = cabecera_corte_id;
    console.log('Corte ID seleccionado:', this.selectedCorteId);

    this.corteService.getDetalleCorte(cabecera_corte_id)
      .subscribe(response => {
        this.listDetCortes = Array.isArray(response) ? response : [response];
        this.totalCircBruta = this.listDetCortes.reduce((acc, curr) => acc + (Number(curr.circ_bruta) || 0), 0);
        this.totalCircNeta = this.listDetCortes.reduce((acc, curr) => acc + (Number(curr.circ_neta) || 0), 0);
        this.totalLargoBruto = this.listDetCortes.reduce((acc, curr) => acc + (Number(curr.largo_bruto) || 0), 0);
        this.totalLargoNeto = this.listDetCortes.reduce((acc, curr) => acc + (Number(curr.largo_neto) || 0), 0);
        this.totalMCubica = this.listDetCortes.reduce((acc, curr) => acc + (Number(curr.m_cubica) || 0), 0);
        this.totalValorMCubico = this.listDetCortes.reduce((acc, curr) => acc + (Number(curr.valor_mcubico) || 0), 0);
        this.totalValorTroza = this.listDetCortes.reduce((acc, curr) => acc + (Number(curr.valor_troza) || 0), 0);

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
    this.selectedCorteId = null; // Limpiar el ID del contrato seleccionado
  }

  openDetailModal2(corteId: number) {
    this.selectedCorteId = corteId;

    this.corteService.countDetalleCorte(corteId).subscribe(resp => {
      const existingCount = resp.count; // trozas ya guardadas

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
    }, err => {
      console.error('No pude obtener el conteo de trozas', err);
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
        // Aquí puedes manejar la respuesta después de guardar
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
      { header: 'Placa Carro', dataKey: 'placaCarro' },
      { header: 'Contenedor', dataKey: 'contenedor' },
      { header: 'Conductor', dataKey: 'conductor' },
      { header: 'Supervisor', dataKey: 'supervisor' }
    ];
    const rows = this.cortesFiltrados.map(corte => ({
      bosque: this.getBosqueId(corte.bosque_id),
      contrato: this.getContratoId(corte.contrato_id),
      raleoTipo: this.getRaleoId(corte.raleo_tipo_id),
      siembraRebrote: this.getSiemRebId(corte.siembra_rebrote_id),
      selloTipo: this.getSelloTipoId(corte.sello_id),
      fechaEmbarque: corte.fecha_embarque,
      cantArboles: corte.cant_arboles,
      numeroViaje: corte.numero_viaje,
      placaCarro: corte.placa_carro,
      contenedor: corte.contenedor,
      conductor: corte.conductor,
      supervisor: corte.supervisor
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
}


