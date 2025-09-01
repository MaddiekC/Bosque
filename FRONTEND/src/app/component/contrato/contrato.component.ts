import { Component, ElementRef, ViewChild } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { NgxPaginationModule } from 'ngx-pagination';
import { FormsModule } from '@angular/forms';
import { AfterViewInit } from '@angular/core';
import { HasPermissionDirective } from '../../services/has-permission.directive';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { Modal } from 'bootstrap';
import { AuthserviceService } from '../../auth/authservice.service';

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
  circunferencia: number;
  precioM3: number;
  largo: number;
  caracteristica: string;
  useRange?: boolean;
  desde?: number;
  hasta?: number;
}

@Component({
  selector: 'app-contrato',
  standalone: true,
  imports: [CommonModule, RouterModule, NgxPaginationModule, FormsModule, HasPermissionDirective],
  templateUrl: './contrato.component.html',
  styleUrl: './contrato.component.css'
})
export class ContratoComponent implements AfterViewInit {
  @ViewChild('confirmModal') confirmModal!: ElementRef;
  @ViewChild('confirmModalAgreem') confirmModalAgreem!: ElementRef;
  private modalInstance: any;
  private modalInstanceAgreem: any;
  private pendingDeleteId!: number;
  private pendingCloseAgreemId!: number;
  private MAX_EXPAND_COUNT = 500;

  //ANTICIPO
  nuevoAnticipo: any = {
    cantidad: 0,
    factura: '',
    fecha: '',
  }
  username: string = '';
  /// DETALLES
  nuevoDetContrato: detContrato[] = [{
    contrato_id: 0,
    circunferencia: 0,
    precioM3: 0,
    largo: 0,
    caracteristica: '',
    id: 0
  }];

  // DETALLES CONTRATO
  listDetContrato: any[] = [];
  selectedContratoId: number | null = null;
  selectedEstado: string | null = null; // Para almacenar el estado del contrato seleccionado

  //ANTICPOS
  listAnticipo: any[] = [];
  ultimoAnticipo: Record<string, number> = {};
  totalAnticipos: number = 0;
  totalAnticipo: Record<number, number> = {};
  corteValorTroza: Record<number, number> = {};

  contratoValorTroza: Record<number, number> = {};
  contratoSaldos: { [id: number]: { embarcado: number, anticipos: number, saldo: number } | undefined } = {};

  // CONTRATOS
  listContrato: any[] = [];
  contratosFiltrados: any[] = [];
  selectedContrato: any = null;
  // valores de filtro
  filtroCliente: number | null = null;
  filtroAnio: number | null = null;
  filtroFecha: Date | null = null;
  filtroEstado: string | null = null;

  // paginación
  paginaActual: number = 1;
  itemsPorPagina: number = 15;

  // listas de opciones para los selects
  bosques: any[] = [];
  contrato: any[] = [];
  raleoTipo: any[] = [];
  siemReb: any[] = [];
  selloTipo: any[] = [];
  siembTipo: any[] = [];
  clientes: any[] = [];
  cortesFiltrados: any[] = [];

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

  constructor(private contratoService: ApiService, private route: ActivatedRoute, private authService: AuthserviceService) { }

  ngOnInit(): void {
    const u = this.authService.getUserInfo();      // string | null
    this.username = u ?? 'Invitado';
    console.log('Usuario:', this.username);

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
    this.contratoService.getContratos().subscribe(contratos => {
      this.listContrato = contratos;
      this.getContratosFiltrados();
      // luego traigo los totales
      this.contratoService.getTotalesAnticipos()
        .subscribe(totales => {
          this.totalAnticipo = totales; // será un objeto { [contratoId]: total }
        });
    });
    this.contratoService.getValorTrozaAll().subscribe(map => {
      this.contratoValorTroza = {};
      // map viene de la API: keys son strings (json), values numbers
      Object.entries(map).forEach(([k, v]) => {
        this.contratoValorTroza[Number(k)] = Number(v) || 0;
      });
    });
    this.contratoService.getSaldosAll().subscribe(map => {
      this.contratoSaldos = {};
      Object.entries(map).forEach(([k, v]) => {
        const id = Number(k);
        this.contratoSaldos[id] = {
          embarcado: Number(v.embarcado) || 0,
          anticipos: Number(v.anticipos) || 0,
          saldo: Number(v.saldo) || 0
        };
        console.log(this.contratoSaldos)
      });
    }, err => {
      console.error('Error al obtener saldos:', err);
    });

    // EMBARQUE
    this.contratoService.getBosques().subscribe(
      exito => {
        this.bosques = exito;
      },
      error => {
        console.log(error);
      }
    );
    this.contratoService.getTipoArbol('raleoTipo').subscribe(
      exito => {
        console.log('raleo', exito);
        this.raleoTipo = exito;
      },
      error => {
        console.log(error);
      }
    );
    this.contratoService.getTipoArbol('siembraRebrote').subscribe(
      exito => {
        console.log('siembraRebrote', exito);
        this.siembTipo = exito;
      },
      error => {
        console.log(error);
      }
    );
    this.contratoService.getSiembraRebrotes().subscribe(
      exito => {
        this.siemReb = exito;
      },
      error => {
        console.log(error);
      }
    );
    this.contratoService.getSelloTipo('sello').subscribe(
      exito => {
        console.log('sello', exito);
        this.selloTipo = exito;
      },
      error => {
        console.log(error);
      }
    );
    this.contratoService.getValorTrozaAll2().subscribe(map => {
      this.corteValorTroza = {};
      Object.entries(map || {}).forEach(([k, v]) => {
        this.corteValorTroza[Number(k)] = Number(v) || 0;
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

  //--------------------------------------------------------
  // 1) Se llama al hacer clic en el icono de papelera
  openConfirmModal(id: number) {
    this.pendingDeleteId = id;
    this.modalInstance.show();
  }

  // 2) Si el usuario pulsa “Sí”
  confirmDelete() {
    this.eliminarContrato(this.pendingDeleteId);
    this.modalInstance.hide();
  }

  // 3) Si pulsa “No” o cierra el modal
  cancelDelete() {
    this.modalInstance.hide();
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
  //--------------------------------------------------------

  // Cerrar contrato

  openCloseAModal(id: number) {
    this.pendingCloseAgreemId = id;
    this.modalInstanceAgreem.show();
  }

  // 2) Si el usuario pulsa “Sí”
  confirmCloseA() {
    this.closeAgreement(this.pendingCloseAgreemId);
    this.modalInstanceAgreem.hide();
  }

  // 3) Si pulsa “No” o cierra el modal
  cancelCloseA() {
    this.modalInstanceAgreem.hide();
  }

  closeAgreement(id: number): void {
    this.contratoService.putContratoClose(id).subscribe(
      exito => {
        console.log(exito);
        const contrato = this.listContrato.find(c => c.id === id);
        if (contrato) {
          contrato.estado = 'C';
        }
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

        this.contratoService.getContrato(contratoId).subscribe(
          cab => this.selectedContrato = cab,
          err => {
            console.warn('No se pudo cargar cabecera:', err);
            this.selectedContrato = null;
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
    this.selectedContratoId = null; // Limpiar el ID del contrato seleccionado
  }

  openDetailModal2(contratoId: number) {
    this.selectedContratoId = contratoId;
    console.log('Contrato ID seleccionado:', this.selectedContratoId);
    this.selectedContrato = null;

    this.contratoService.getContrato(contratoId).subscribe({
      next: contrato => {
        this.selectedContrato = contrato;
      },
      error: err => {
        console.warn('No se pudo cargar contrato (no crítico):', err);
        this.selectedContrato = null;
      }
    });

    const modalEl = document.getElementById('detModal')!;
    const modal = new bootstrap.Modal(modalEl);
    modal.show();

    // Inicializar la primera fila con el contrato actual
    this.nuevoDetContrato = [{
      contrato_id: contratoId,
      circunferencia: 0,
      precioM3: 0,
      largo: 0,
      caracteristica: '',
      id: 0,
      useRange: false,
      desde: 0,
      hasta: 0
    }];
  }

  addRow() {
    this.nuevoDetContrato.push({
      contrato_id: this.selectedContratoId!,
      circunferencia: 0,
      precioM3: 0,
      largo: 0,
      caracteristica: '',
      id: 0,
      useRange: false,
      desde: 0,
      hasta: 0
    });
  }

  removeRow(i: number) {
    this.nuevoDetContrato.splice(i, 1);
  }

  private expandDetalles(detalles: detContrato[]): detContrato[] | null {
    const out: detContrato[] = [];

    for (const row of detalles) {
      // Validaciones básicas:
      if (row.useRange) {
        const desde = Number(row.desde);
        const hasta = Number(row.hasta);

        if (!Number.isFinite(desde) || !Number.isFinite(hasta)) {
          alert('Rango inválido: verifica "desde" y "hasta".');
          return null;
        }
        if (desde > hasta) {
          alert(`Rango inválido: "desde" (${desde}) no puede ser mayor que "hasta" (${hasta}).`);
          return null;
        }
        // calcular cantidad que generará este rango
        const count = Math.floor(hasta) - Math.ceil(desde) + 1;
        if (count <= 0) {
          alert('Rango inválido: no hay valores entre desde y hasta.');
          return null;
        }
        if (count > this.MAX_EXPAND_COUNT) {
          alert(`Rango demasiado grande (${count}) — máximo permitido por rango: ${this.MAX_EXPAND_COUNT}.`);
          return null;
        }

        // expandir: una fila por valor entero de circunferencia
        const start = Math.ceil(desde);
        const end = Math.floor(hasta);
        for (let c = start; c <= end; c++) {
          out.push({
            id: 0,
            contrato_id: row.contrato_id,
            circunferencia: c,
            precioM3: Number(row.precioM3),
            largo: Number(row.largo),
            caracteristica: row.caracteristica
          });
        }
      } else {
        // fila individual
        const circ = Number(row.circunferencia);
        out.push({
          id: 0,
          contrato_id: row.contrato_id,
          circunferencia: circ,
          precioM3: Number(row.precioM3),
          largo: Number(row.largo),
          caracteristica: row.caracteristica
        });
        console.log('circ', circ);
        if (!Number.isFinite(circ)) {
          alert('Circunferencia inválida en una fila.');
          return null;
        };
      }
    }

    // prevención adicional: no enviar demasiados registros totales
    if (out.length > 2000) {
      const confirmBig = confirm(`Se van a crear ${out.length} registros. ¿Deseas continuar?`);
      if (!confirmBig) return null;
    }

    return out;
  }

  onSaveDet() {
    const detallesAEnviar: detContrato[] = [];

    this.nuevoDetContrato.forEach(d => {
      if (typeof d.desde !== 'undefined' && typeof d.hasta !== 'undefined') {
        for (let c = d.desde; c <= d.hasta; c++) {
          detallesAEnviar.push({
            contrato_id: this.selectedContratoId!,
            circunferencia: c,
            precioM3: d.precioM3,
            largo: d.largo,
            caracteristica: d.caracteristica,
            id: 0
          });
        }
      } else {
        // Si no hay rango, agregar solo una fila con la circunferencia individual
        detallesAEnviar.push({
          contrato_id: this.selectedContratoId!,
          circunferencia: d.circunferencia,
          precioM3: d.precioM3,
          largo: d.largo,
          caracteristica: d.caracteristica,
          id: 0
        });
      }
    });

    this.contratoService.postDetContrato({ detalles: detallesAEnviar }).subscribe(
      response => {
        console.log('Detalles guardados:', response);
        const contrato = this.listContrato.find(c => c.id === this.selectedContratoId);
        if (contrato) {
          contrato.detalles_count = Array.isArray(response) ? response.length : detallesAEnviar.length;
        }
        this.getContratosFiltrados();
        this.contratoService.getValorTrozaAll().subscribe(map => {
          this.contratoValorTroza = {};
          // map viene de la API: keys son strings (json), values numbers
          Object.entries(map).forEach(([k, v]) => {
            this.contratoValorTroza[Number(k)] = Number(v) || 0;
          });
        });
        this.contratoService.getSaldosAll().subscribe(map => {
          this.contratoSaldos = {};
          Object.entries(map).forEach(([k, v]) => {
            const id = Number(k);
            this.contratoSaldos[id] = {
              embarcado: Number(v.embarcado) || 0,
              anticipos: Number(v.anticipos) || 0,
              saldo: Number(v.saldo) || 0
            };
          });
        }, err => {
          console.error('Error al obtener saldos:', err);
        });
        const modalEl = document.getElementById('detModal')!;
        const modalInstance = Modal.getInstance(modalEl) as Modal ?? new Modal(modalEl);
        modalInstance.hide();

        this.selectedContratoId = null;
      },
      error => {
        console.error('Error al guardar los detalles:', error);
      }
    );
  }


  //-------------EMBARQUE----------------------
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

  //MODAL DE EMBARQUE
  openEmbarqueModal(contratoId: number) {
    this.selectedContratoId = contratoId;
    console.log('Contrato ID seleccionado para anticipo:', this.selectedContratoId);
    this.contratoService.getCabeceraCorteByContrato(contratoId)
      .subscribe({
        next: corte => {
          this.cortesFiltrados = Array.isArray(corte) ? corte : [];
          console.log('Corte encontrado:', corte);
          this.contratoService.getContrato(contratoId).subscribe(
            cab => this.selectedContrato = cab,
            err => {
              console.warn('No se pudo cargar cabecera:', err);
              this.selectedContrato = null;
            }
          );
          const modalEl = document.getElementById('embarqueModal')!;
          new bootstrap.Modal(modalEl).show();
        },
        error: error => {
          console.error('Error al obtener el corte:', error);
          this.cortesFiltrados = [];
          const modalEl = document.getElementById('embarqueModal')!;
          new bootstrap.Modal(modalEl).show();
        }
      });
  }
  //--------------ANTICIPO---------------------
  openAnticipoModal(contratoId: number, estado: string) {
    this.selectedContratoId = contratoId;
    this.selectedEstado = estado;
    console.log('Contrato ID seleccionado para anticipo:', this.selectedContratoId);

    this.contratoService.getAnticipo(contratoId)
      .subscribe({
        next: list => {
          this.listAnticipo = Array.isArray(list) ? list : [list];
          this.totalAnticipos = this.listAnticipo.reduce((acc, curr) => acc + (Number(curr.cantidad) || 0), 0);
          this.contratoService.getUltimoAnticipo(contratoId).subscribe(
            ultimo => {
              this.ultimoAnticipo[contratoId] = ultimo?.cantidad || 0;
              this.contratoService.getContrato(contratoId).subscribe(
                cab => this.selectedContrato = cab,
                err => {
                  console.warn('No se pudo cargar cabecera:', err);
                  this.selectedContrato = null;
                }
              );
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
          this.totalAnticipos = 0;
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

          const cid = this.selectedContratoId!;

          // --- Asegúrate del tipo number en la respuesta:
          const added = Number(response.cantidad ?? 0);
          if (Number.isNaN(added)) {
            console.warn('cantidad no es número:', response.cantidad);
            return;
          }

          // 1) insertar el anticipo en la lista del modal (asegurando cantidad numérica)
          response.cantidad = added;
          this.listAnticipo = [response, ...this.listAnticipo];

          // 2) recalcular total dentro del modal (suma segura)
          this.totalAnticipos = this.listAnticipo
            .reduce((acc, curr) => acc + (Number(curr.cantidad) || 0), 0);

          // 3) actualizar mapa de totales por contrato (suma segura y redondeo a 2 decimales)
          const prev = Number(this.totalAnticipo[cid] || 0);
          const newTotal = prev + added;
          // evita errores de floating, mantener dos decimales
          this.totalAnticipo[cid] = Number(newTotal.toFixed(2));

          // 4) actualizar ultimoAnticipo
          this.ultimoAnticipo[cid] = added;

          //this.ultimoAnticipo[this.selectedContratoId!] = response.cantidad
          this.nuevoAnticipo = { cantidad: 0, fecha: '', factura: '' };

          //Actualiza el saldo
          this.contratoService.getSaldosAll().subscribe(map => {
            this.contratoSaldos = {};
            Object.entries(map).forEach(([k, v]) => {
              const id = Number(k);
              this.contratoSaldos[id] = {
                embarcado: Number(v.embarcado) || 0,
                anticipos: Number(v.anticipos) || 0,
                saldo: Number(v.saldo) || 0
              };
            });
          }, err => {
            console.error('Error al obtener saldos:', err);
          });
          const modalEl = document.getElementById('anticipoModal')!;
          bootstrap.Modal.getInstance(modalEl)?.hide();
        },
        error => {
          console.error('Error al guardar :', error);
        }
      );
  }
  exportToPDF() {
    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageSize = doc.internal.pageSize as any;
    const pageWidth = pageSize.getWidth();
    const pageHeight = pageSize.getHeight();
    const margin = 40;

    // Márgenes reducidos para aprovechar el ancho
    const marginLeft = 20;
    const marginRight = 20;
    const usableWidth = pageWidth - marginLeft - marginRight;
    const headerY = 36;

    const fmtCurrency = (v: any) => {
      const n = Number(v) || 0;
      try {
        return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD', minimumFractionDigits: 2 }).format(n);
      } catch {
        return n.toFixed(2);
      }
    };

    doc.setFontSize(14);
    doc.setFont('bold');

    doc.setFontSize(9);
    doc.setFont('normal');

    const username = this.username ?? 'Invitado';
    const generatedAt = new Date().toLocaleString('es-ES');

    // línea separadora ligera
    doc.setDrawColor(200);
    doc.setLineWidth(0.5);
    doc.line(margin, 42, pageWidth - margin, 42);

    const rows = this.contratosFiltrados.map(item => ({
      cliente_id: this.getClienteId(item.cliente_id),
      anio: item.anio,
      fecha: new Date(item.fecha).toLocaleDateString(),
      anticipo: fmtCurrency(this.contratoSaldos[item.id]?.anticipos ?? 0),
      embarcado: fmtCurrency(this.contratoSaldos[item.id]?.embarcado ?? 0),
      saldo: fmtCurrency(this.contratoSaldos[item.id]?.saldo ?? 0),
      estado: item.estado === 'A'
        ? 'Activo'
        : item.estado === 'C'
          ? 'Cerrado'
          : ''
    }));
    const columns = [
      { header: 'Estado', dataKey: 'estado' },
      { header: 'Cliente', dataKey: 'cliente_id' },
      { header: 'Año', dataKey: 'anio' },
      { header: 'Fecha', dataKey: 'fecha' },
      { header: 'Anticipo', dataKey: 'anticipo' },
      { header: 'Embarcado', dataKey: 'embarcado' },
      { header: 'Saldo', dataKey: 'saldo' }
    ];

    // Header/footer dibujados en cada página
    const drawHeader = (data: any) => {
      const page = data.pageNumber;
      // Título
      doc.setFontSize(12);
      doc.setFont('bold');
      doc.text('Reporte de Contrato', marginLeft, 18);

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
      //columnStyles: Object.fromEntries(Object.entries(columnWidths).map(([k, w]) => [Number(k), { cellWidth: Number(w) }])),
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

    const filename = `reporte_contrato.pdf`;
    doc.save(filename);
  }

  exportToPDF2() {
    if (!this.selectedContratoId) {
      alert('No hay contrato seleccionado para exportar.');
      return;
    }

    const contrato = this.listContrato.find((c: any) => Number(c.id) === Number(this.selectedContratoId));
    if (!contrato) {
      alert('No se encontró la información del contrato seleccionado.');
      return;
    }

    const fmtCurrency = (v: any) => {
      const n = Number(v) || 0;
      try { return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'USD' }).format(n); }
      catch { return n.toFixed(2); }
    };
    const fmtDate = (d: any) => d ? new Date(d).toLocaleDateString() : '';

    const doc = new jsPDF({ unit: 'pt', format: 'a4' });
    const pageWidth = (doc.internal.pageSize as any).width || doc.internal.pageSize.getWidth();
    const pageHeight = (doc.internal.pageSize as any).height || doc.internal.pageSize.getHeight();
    const margin = 40;

    // Header/foot layout
    const headerTop = 22;        // y inicial del header
    const lineHeight = 10;      // separación compacta
    const headerHeight = headerTop + lineHeight * 3 + 8; // reservar espacio para header

    const title = `Contrato - ID ${contrato.id}`;
    //const subtitle = `Cliente: ${this.getClienteId(contrato.cliente_id) || ''}`;
    const generatedAt = `Generado: ${new Date().toLocaleString()}`;
    const usuarioTexto = `Usuario: ${this.username ?? 'Invitado'}`;

    // Dibuja header (se llamará desde didDrawPage)
    const drawHeader = (pageNumber?: number) => {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(13);
      doc.text(title, margin, headerTop);

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(9);

      // // subtítulo (derecha si cabe)
      // const subW = doc.getTextWidth(subtitle);
      // if (subW < pageWidth - margin * 2 - 100) {
      //   doc.text(subtitle, pageWidth - margin - subW, headerTop);
      // } else {
      //   doc.text(subtitle, margin, headerTop + lineHeight);
      // }

      // Fecha y usuario en dos líneas compactas a la derecha
      const genY = headerTop + lineHeight;
      const usrY = genY + lineHeight;
      const genW = doc.getTextWidth(generatedAt);
      const usrW = doc.getTextWidth(usuarioTexto);
      doc.text(generatedAt, pageWidth - margin - genW, genY);
      doc.text(usuarioTexto, pageWidth - margin - usrW, usrY);

      // línea separadora
      doc.setDrawColor(200);
      doc.setLineWidth(0.6);
      doc.line(margin, usrY + 6, pageWidth - margin, usrY + 6);
    };

    // Cabecera (campo/valor) — datos pequeños encima de la tabla
    const cabeceraRows = [
      ['Cliente', this.getClienteId(contrato.cliente_id) || ''],
      ['Año', contrato.anio ?? ''],
      ['Fecha', fmtDate(contrato.fecha) ?? ''],
      ['Estado', contrato.estado === 'A' ? 'Activo' : contrato.estado === 'C' ? 'Cerrado' : (contrato.estado ?? '')],
      ['Total detalles', (this.listDetContrato || []).length.toString()]
    ];

    // Prepara filas de detalle
    const detailRows = (this.listDetContrato || []).map((item: any) => ({
      circunferencia: item.circunferencia ?? '',
      precioM3: typeof item.precioM3 !== 'undefined' ? fmtCurrency(item.precioM3) : '',
      largo: typeof item.largo !== 'undefined' ? Number(item.largo).toFixed(2) : '',
      caracteristica: item.caracteristica ?? ''
    }));

    // Dibujar tabla cabecera (campo/valor)
    autoTable(doc, {
      startY: headerHeight + 6,
      head: [['Campo', 'Valor']],
      body: cabeceraRows,
      theme: 'grid',
      styles: { fontSize: 9, cellPadding: 6 },
      headStyles: { fillColor: [34, 139, 34], textColor: 255 },
      columnStyles: { 0: { cellWidth: 120, fontStyle: 'bold' }, 1: { cellWidth: pageWidth - margin * 2 - 120 } },
      showHead: 'never', // no hace falta repetir en cada página
      didDrawPage: (data) => {
        // dibujar header en cada página
        drawHeader(data.pageNumber);
      }
    });

    // Y ahora la tabla de detalles, empezando después de la cabecera
    const afterHeaderY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 12 : headerHeight + 60;

    autoTable(doc, {
      startY: afterHeaderY,
      head: [['Circunferencia', 'Precio / m³', 'Largo (m)', 'Característica']],
      body: detailRows.map(r => [r.circunferencia, r.precioM3, r.largo, r.caracteristica]),
      styles: { fontSize: 10, cellPadding: 6 },
      headStyles: { fillColor: [34, 139, 34], textColor: 255, halign: 'left' },
      columnStyles: {
        0: { cellWidth: 120, halign: 'left', fontStyle: 'bold' },
        1: { halign: 'left' }
      },
      didDrawPage: (data) => {
        // footer con número de página y footer info
        const page = data.pageNumber;
        const pageText = `Página ${page}`;
        const footerText = `${usuarioTexto} · ${generatedAt}`;
        doc.setFontSize(9);
        doc.text(pageText, pageWidth - margin - doc.getTextWidth(pageText), pageHeight - 18);
        doc.text(footerText, margin, pageHeight - 18);

        // header también (asegura que siempre esté)
        drawHeader(page);
      },
      showHead: 'everyPage',
      margin: { top: headerHeight + 6, bottom: 30, left: margin, right: margin }
    });

    // Guardar
    const filename = `contrato_${contrato.id}_detalles.pdf`;
    doc.save(filename);
  }
}

