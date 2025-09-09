import { Component, ElementRef, ViewChild } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { ActivatedRoute, RouterModule } from '@angular/router';
import { NgxPaginationModule } from 'ngx-pagination';
import { FormsModule } from '@angular/forms';
import { AfterViewInit } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AuthserviceService } from '../../auth/authservice.service';
import Swal from 'sweetalert2';

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
  @ViewChild('confirmModal') confirmModal!: ElementRef;
  private modalInstance: any;
  private pendingDeleteId!: number;

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

  constructor(private SiembraRebService: ApiService, private route: ActivatedRoute, private authService: AuthserviceService) { }

  ngOnInit(): void {
    const u = this.authService.getUserInfo();      // string | null
    this.username = u ?? 'Invitado';
    console.log('Usuario:', this.username);

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
          hectarea_usada: Number(item.hectarea_usada).toFixed(2),
          saldo: Number(item.saldo).toFixed(2),
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
        Swal.fire({
          icon: 'error',
          title: 'No se puede eliminar',
          text: 'Se ha sobrepasado las has.',
          confirmButtonColor: '#d33'
        });
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
      Swal.fire({
        icon: 'error',
        title: 'No se puede eliminar',
        text: `Error: Solo quedan ${disponibleRestante.toFixed(2)} ha disponibles. No puede agregar más.`,
        confirmButtonColor: '#d33'
      });
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

    const rows = this.siembRebFiltrados.map(item => ({
      bosque_id: this.getBosqueNombre(item.bosque_id),
      tipo_id: this.getTipoNombre(item.tipo_id),
      tipo_arbol_id: this.getTipoArbolNombre(item.tipo_arbol_id),
      fecha: new Date(item.fecha).toLocaleDateString(),
      anio: item.anio,
      hectarea_usada: item.hectarea_usada,
      arb_iniciales: item.arb_iniciales,
      arb_cortados: item.arb_cortados,
      dist_siembra: item.dist_siembra,
      saldo: item.saldo
    }));

    const columns = [
      { header: 'Bosque', dataKey: 'bosque_id' },
      { header: 'Tipo', dataKey: 'tipo_id' },
      { header: 'Tipo Árbol', dataKey: 'tipo_arbol_id' },
      { header: 'Fecha', dataKey: 'fecha' },
      { header: 'Año', dataKey: 'anio' },
      { header: 'Hectárea Usada', dataKey: 'hectarea_usada' },
      { header: 'Árboles Iniciales', dataKey: 'arb_iniciales' },
      { header: 'Árboles Cortados', dataKey: 'arb_cortados' },
      { header: 'Distancia Siembra', dataKey: 'dist_siembra' },
      { header: 'Saldo', dataKey: 'saldo' }
    ];

    // Carga la imagen antes de dibujar el header/tablas
    let logoDataUrl: string | null = null;
    try {
      logoDataUrl = await loadImageAsDataURL('/assets/images/bosque.png');
    } catch (e) {
      console.warn('No se pudo cargar logo para el PDF:', e);
      logoDataUrl = null;
    }
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
      doc.text('Reporte de Siembras/Rebrotes', marginLeft, 50);

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
        0: { halign: 'left' },
        1: { halign: 'left' },
        2: { halign: 'center' },
        3: { halign: 'center' },
        4: { halign: 'right' },
        5: { halign: 'right' },
        6: { halign: 'right' },
        7: { halign: 'right' },
        8: { halign: 'center' },
        9: { halign: 'right' },
      },
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
    const filename = `siembra-rebrote.pdf`;
    doc.save(filename);
  }
}
