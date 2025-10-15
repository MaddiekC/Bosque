import { Component, ElementRef, ViewChild } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { NgxPaginationModule } from 'ngx-pagination';
import { FormsModule } from '@angular/forms';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AuthserviceService } from '../../auth/authservice.service';
import { HasPermissionDirective } from '../../services/has-permission.directive';

declare const bootstrap: any;

interface Corte {
  id: number,
  bosque_id: number,
  contrato_id: number,
  raleo_tipo_id: number,
  siembra_rebrote_id: number,
  //sello_id: number,
  fecha_embarque: string,
  cant_arboles: number,
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

@Component({
  selector: 'app-raleo',
  standalone: true,
  imports: [CommonModule, RouterModule, NgxPaginationModule, FormsModule, HasPermissionDirective],
  templateUrl: './raleo.component.html',
  styleUrl: './raleo.component.css'
})
export class RaleoComponent {
  @ViewChild('confirmModal') confirmModal!: ElementRef;
  @ViewChild('confirmModalAgreem') confirmModalAgreem!: ElementRef;

  private modalInstance: any;
  private pendingDeleteId!: number;
  private modalInstanceAgreem: any;
  private pendingCloseAgreemId!: number;

  nuevoCorte: any = {
    bosque_id: null,
    contrato_id: 0,
    raleo_tipo_id: 0,
    siembra_rebrote_id: null,
    //sello_id: 0,
    fecha_embarque: '',
    cant_arboles: 0,
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

  constructor(private raleoService: ApiService, private route: ActivatedRoute, private authService: AuthserviceService) { }

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

    this.raleoService.getCabeceraRaleos().subscribe(
      exito => {
        console.log('corte', exito);
        this.listCorte = exito
        this.getCortesFiltrados();
      },
      error => {
        console.log(error);
      }
    );
    this.raleoService.getBosques().subscribe(
      exito => {
        this.bosques = exito;
      },
      error => {
        console.log(error);
      }
    );
    this.raleoService.getTipoRaleo('raleoTipo').subscribe(
      exito => {
        console.log('raleo', exito);
        this.raleoTipo = exito;
      },
      error => {
        console.log(error);
      }
    );
    this.raleoService.getTipoArbol('siembraRebrote').subscribe(
      exito => {
        console.log('siembraRebrote', exito);
        this.siembTipo = exito;
      },
      error => {
        console.log(error);
      }
    );
    this.raleoService.getSiembraRebrotes().subscribe(
      exito => {
        this.siemReb = exito;
      },
      error => {
        console.log(error);
      }
    );
    this.raleoService.getTipoArbol('tipoArbol').subscribe(
      exito => {
        console.log(exito);
        this.tipoArbol = exito;
      },
      error => {
        console.log(error);
      }
    );
    this.raleoService.getValorTrozaAll2().subscribe(map => {
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



  getBosqueId(bosqueId: string) {
    const bosques = this.bosques?.find((b: any) => b.id == bosqueId);
    return bosques ? bosques.nombre : '';
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
    this.raleoService.putCabeceraCorteInactive(id).subscribe(
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
    this.raleoService.putCabeceraCorte(this.corteEditando.id, this.corteEditando).subscribe(
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
    this.raleoService.postCabeceraCorte(this.nuevoCorte)
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
    this.raleoService.putCorteClose(id).subscribe(
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


  async exportToPDF() {
    const fmtNumber = (v: any, min = 0, max = 4) => {
      const n = Number(v) || 0;
      try {
        return new Intl.NumberFormat('es-ES', { minimumFractionDigits: min, maximumFractionDigits: max }).format(n);
      } catch {
        return n.toFixed(max);
      }
    };
    // Helper: carga una imagen y devuelve dataURL (base64)
    const loadImageAsDataURL = (url: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous'; // importante si la sirves desde otro origen
        img.onload = () => {
          // dibuja en canvas para obtener dataURL
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d')!;
          ctx.drawImage(img, 0, 0);
          try {
            const dataUrl = canvas.toDataURL('image/png');
            resolve(dataUrl);
          } catch (e) {
            reject(e);
          }
        };
        img.onerror = (err) => reject(err);
        // ruta relativa al build -> angular sirve assets desde /assets/...
        img.src = `/assets/images/bosque.png`;
      });
    };

    const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
    const pageSize = doc.internal.pageSize as any;
    const pageWidth = pageSize.getWidth();
    const pageHeight = pageSize.getHeight();

    // Márgenes reducidos para aprovechar el ancho
    const marginLeft = 20;
    const marginRight = 20;
    const usableWidth = pageWidth - marginLeft - marginRight;

    const headerY = 60;
    const margin = 40;
    const username = this.username ?? 'Invitado';
    const generatedAt = new Date().toLocaleString('es-ES');

    // Prepara filas (asegura valores string)
    const rows = this.cortesFiltrados.map(corte => ({
      bosque: this.formatBosques(corte.bosque_id) || '',
      raleoTipo: this.getRaleoId(corte.raleo_tipo_id) || '',
      siembraRebrote: (this.formatSiembras(corte.siembra_rebrote_id) || '') ,
      //selloTipo: this.getSelloTipoId(corte.sello_id) || '',
      fechaEmbarque: corte.fecha_embarque ? new Date(corte.fecha_embarque).toLocaleDateString('es-ES') : '',
      cantArboles: fmtNumber(corte.cant_arboles ?? ''),
    }));

    const columns = [
      { header: 'Bosque', dataKey: 'bosque' },
      { header: 'Raleo', dataKey: 'raleoTipo' },
      { header: 'Siembra/Rebrote', dataKey: 'siembraRebrote' },
      { header: 'Fecha', dataKey: 'fechaEmbarque' },
      { header: 'Árboles', dataKey: 'cantArboles' },
    ];

    // Carga la imagen antes de dibujar el header/tablas
    let logoDataUrl: string | null = null;
    try {
      logoDataUrl = await loadImageAsDataURL('/assets/images/bosque.png');
    } catch (e) {
      console.warn('No se pudo cargar logo para el PDF:', e);
      logoDataUrl = null;
    }

    // Header/footer dibujados en cada página
    const drawHeader = (data: any) => {
      if (logoDataUrl) {
        // calcular tamaño deseado (p. ej. ancho 60pt)
        const desiredWidth = 60;
        // reconstruir tamaño manteniendo proporción: extrae info del dataURL
        const img = new Image();
        img.src = logoDataUrl;
        // Usamos proporción aproximada - si quieres seguridad, podrías calcular con img.naturalWidth/naturalHeight después de load
        const ratio = (img.naturalHeight && img.naturalWidth) ? (img.naturalHeight / img.naturalWidth) : 0.5;
        const desiredHeight = ratio ? desiredWidth * ratio : 30;
        // coloca logo a la izquierda, un poco arriba
        doc.addImage(logoDataUrl, 'PNG', marginLeft, 8, desiredWidth, desiredHeight);
        // desplaza texto del título a la derecha si hace falta
      }

      // Título
      doc.setFontSize(12);
      doc.setFont('bold');
      doc.text('Reporte de raleos y arb. muertos por naturaleza', marginLeft, 50);

      // Info a la derecha (fecha + usuario)
      doc.setFontSize(8);
      doc.setFont('normal');
      const gen = ` ${generatedAt}`;
      const usr = ` ${username}`;
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
      startY: headerY + 22,
      head: [columns.map(c => c.header)],
      body: body,
      margin: { left: marginLeft, right: marginRight, top: headerY + 6 },
      styles: {
        fontSize: 10,
        cellPadding: 3,
        overflow: 'linebreak', // wrapping
        halign: 'right',
        valign: 'middle',
      },
      headStyles: { fillColor: [34, 139, 34], textColor: 255, halign: 'center' },
      tableWidth: usableWidth,

      columnStyles: {
        0: { halign: 'center' },
        1: { halign: 'center' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'right' },
      },

      didDrawPage: (data) => {
        // número de página actual que te da autoTable
        const page = data.pageNumber;
        const pageText = `Página ${page}`;
        const footerText = ` `;

        // footer a la derecha y texto a la izquierda
        doc.setFontSize(9);
        doc.text(pageText, pageWidth - margin - doc.getTextWidth(pageText), pageHeight - 20);
        doc.text(footerText, margin, pageHeight - 20);

        // (si quieres header por página, también lo dibujas aquí)
        drawHeader(data);
      },
      showHead: 'everyPage'
    });
    const filename = `reporte_raleoArbNat.pdf`;
    doc.save(filename);
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
