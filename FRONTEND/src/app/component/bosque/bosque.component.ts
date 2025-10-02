import { Component, ElementRef, ViewChild } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { RouterModule } from '@angular/router';
import { NgxPaginationModule } from 'ngx-pagination';
import { FormsModule } from '@angular/forms';
import { AfterViewInit } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AuthserviceService } from '../../auth/authservice.service';
import Swal from 'sweetalert2';
import { HasPermissionDirective } from '../../services/has-permission.directive';

declare const bootstrap: any;
interface Bosque {
  id: number;
  nombre: string;
  seccion_id: number;
  hectarea: number;
}

@Component({
  selector: 'app-bosque',
  standalone: true,
  imports: [CommonModule, RouterModule, NgxPaginationModule, FormsModule, HasPermissionDirective],
  templateUrl: './bosque.component.html',
  styleUrl: './bosque.component.css'
})
export class BosqueComponent implements AfterViewInit {
  @ViewChild('confirmModal') confirmModal!: ElementRef;
  private modalInstance: any;
  private pendingDeleteId!: number;

  username: string = '';
  listaBosques: any[] = [];
  bosquesFiltrados: any[] = [];
  // valores de filtro
  filtroNombre: string = '';
  filtroTipo: number | null = null;
  filtroSeccion: number | null = null;
  filtroHectarea: number | null = null;

  // paginación
  paginaActual: number = 1;
  itemsPorPagina: number = 15;

  // listas de opciones para los selects
  tipos: any[] = [];
  secciones: any[] = [];
  nuevoBosque: any = {
    nombre: '',
    seccion_id: null,
    hectarea: null
  };
  nuevoNombre: string = '';

  bosqueEditando: Bosque | null = null;

  errorMensajeNuevo: string = '';
  clearError() {
    this.errorMensajeNuevo = '';
  }

  @ViewChild('miModal') miModalEl!: ElementRef<HTMLDivElement>;

  // Auxiliar para saber si el nombre ya existe
  nombreDuplicado(nombre: string): boolean {
    const nom = nombre.trim().toLowerCase();
    return this.listaBosques.some(b => b.nombre.trim().toLowerCase() === nom);
  }

  constructor(private bosqueService: ApiService, private authService: AuthserviceService) { }

  // usuario_creacion = this.userService.getUsername() ?? ''

  ngOnInit(): void {
    const u = this.authService.getUserInfo();      // string | null
    this.username = u ?? 'Invitado';
    console.log('Usuario:', this.username);

    this.bosqueService.getBosques().subscribe(
      exito => {
        console.log(exito);
        this.listaBosques = exito.map((item: { hectarea: any }) => ({
          ...item,
          // si viene como string o number, lo convertimos a number y a string con dos decimales
          hectarea: Number(item.hectarea).toFixed(2),
        }));
        this.getbosquesFiltrados();
        console.log(this.bosquesFiltrados)
      },
      error => {
        console.log(error);
      }
    );
    this.bosqueService.getSecciones().subscribe(
      exito => {
        console.log(exito);
        this.secciones = exito;
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

  getSeccionNombre(seccionId: number): string {
    const seccion = this.secciones?.find((s: any) => s.id == seccionId);
    return seccion ? seccion.nombre : '';
  }
  // método que devuelve los bosques ya filtrados
  getbosquesFiltrados() {
    const normalizar = (texto: string) =>
      texto.toLowerCase().trim().replace(/\s+/g, ' ');
    return this.bosquesFiltrados = this.listaBosques.filter(b =>
      (!this.filtroNombre || normalizar(b.nombre).includes(normalizar(this.filtroNombre)))
      && (!this.filtroSeccion || b.seccion_id == this.filtroSeccion)
      && (!this.filtroHectarea || b.hectarea == this.filtroHectarea)
    );
  }


  // 1) Se llama al hacer clic en el icono de papelera
  openConfirmModal(id: number) {
    this.pendingDeleteId = id;
    this.modalInstance.show();
  }

  // 2) Si el usuario pulsa “Sí”
  confirmDelete() {
    this.eliminarBosque(this.pendingDeleteId);
    this.modalInstance.hide();
  }

  // 3) Si pulsa “No” o cierra el modal
  cancelDelete() {
    this.modalInstance.hide();
  }

  eliminarBosque(id: number): void {
    this.bosqueService.countSiembrasByBosque(id).subscribe(count => {
      if (count > 0) {
        Swal.fire({
          icon: 'error',
          title: 'No se puede eliminar',
          text: 'Este bosque tiene ' + count + ' siembra-rebrotre y no se puede eliminar.',
          confirmButtonColor: '#d33'
        });
        return;
      }

      this.bosqueService.putBosqueInactive(id).subscribe(
        exito => {
          console.log(exito);
          this.listaBosques = this.listaBosques.filter(bosque => bosque.id !== id);
          this.getbosquesFiltrados();

          const totalItems = this.bosquesFiltrados.length;
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

  startEdit(id: number) {
    const original = this.listaBosques.find(s => s.id === id);
    if (!original) return;

    // Crear una copia para editar
    this.bosqueEditando = { ...original, seccion_id: Number(original.seccion_id) };
    const modal = new bootstrap.Modal(document.getElementById('editarModal'));
    modal.show();
  }

  cancelEdit() {
    this.bosqueEditando = null;
  }

  saveEdit() {
    if (!this.bosqueEditando) return;

    this.bosqueService.putBosque(this.bosqueEditando.id, this.bosqueEditando).subscribe(
      updated => {
        const idx = this.listaBosques.findIndex(s => s.id === updated.id);
        if (idx !== -1) this.listaBosques[idx] = updated;
        this.bosqueEditando = null;
        this.getbosquesFiltrados();
      },
      err => console.log(err)
    );
  }

  onSave() {
    this.errorMensajeNuevo = '';
    this.bosqueService.postBosque(this.nuevoBosque).subscribe(
      exito => {
        console.log(exito);
        const nuevo = {
          ...exito,
          hectarea: Number(exito.hectarea).toFixed(2), // aseguramos que hectarea sea un número con 2 decimales
        };
        this.listaBosques.push(nuevo);
        this.getbosquesFiltrados();
        this.nuevoBosque = {
          nombre: '',
          seccion_id: null,
          hectarea: null
        };
        const modalEl = document.getElementById('miModal');
        // obtener la instancia de Bootstrap (o crearla)
        const modal = modalEl
          ? (bootstrap.Modal.getInstance(modalEl) || new bootstrap.Modal(modalEl))
          : null;
        modal?.hide();
      },
      error => {
        console.log(error);
        if (error.status === 422 && error.error.errors?.nombre) {
          // Laravel devuelve aquí un array errors con la clave 'nombre'
          this.errorMensajeNuevo = 'No se pudo crear: el nombre ya existe en la tabla.';
        }
      }
    );
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
    //const margin = 40;
    const username = this.username ?? 'Invitado';
    const generatedAt = new Date().toLocaleString('es-ES');

    const rows = this.bosquesFiltrados.map(item => ({
      nombre: item.nombre,
      seccion_id: this.getSeccionNombre(item.seccion_id),
      hectarea: item.hectarea
    }));

    const columns = [
      { header: 'Nombre', dataKey: 'nombre' },
      { header: 'Sección', dataKey: 'seccion_id' },
      { header: 'Hectáreas', dataKey: 'hectarea' }
    ];

    // --- Cálculo total de hectáreas ---
    const totalHectareas = rows.reduce((sum, r) => {
      const raw = r.hectarea ?? 0;
      const num = Number(String(raw).replace(',', '.')) || 0;
      return sum + num;
    }, 0);

    const totalHectareasFormatted = new Intl.NumberFormat('es-ES', {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(totalHectareas);

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
      doc.text('Reporte de Bosques', marginLeft, 50);

      // Info a la derecha (fecha + usuario)
      doc.setFontSize(8);
      doc.setFont('normal');
      const gen = ` ${generatedAt}`;
      const usr = `${username}`;
      doc.text(gen, pageWidth - marginRight - doc.getTextWidth(gen), 14);
      doc.text(usr, pageWidth - marginRight - doc.getTextWidth(usr), 28);

      // Línea divisoria
      doc.setDrawColor(200);
      doc.setLineWidth(0.5);
      doc.line(marginLeft, headerY, pageWidth - marginRight, headerY);
    };

    // Construye body como array de arrays (autoTable fácil)
    const body = rows.map(r => columns.map((c) => (r as any)[c.dataKey]));

    const foot: any = [
      [
        { content: 'Total hectáreas:', colSpan: 2, styles: { halign: 'left', fontStyle: 'bold' } },
        { content: totalHectareasFormatted, styles: { halign: 'right', fontStyle: 'bold' } }
      ]
    ];

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
        1: { halign: 'center' },
        2: { halign: 'right' },
      },
      didDrawPage: (data) => {
        // número de página actual que te da autoTable
        const page = data.pageNumber;
        const pageText = `Página ${page}`;
        const footerText = ``;

        // footer alineado con los márgenes usados por la tabla
        doc.setFontSize(9);
        // calcular X derecho usando marginRight
        const xRight = pageWidth - marginRight - doc.getTextWidth(pageText);
        doc.text(pageText, xRight, pageHeight - 20);
        // texto a la izquierda usando marginLeft
        doc.text(footerText, marginLeft, pageHeight - 20);

        // dibujar header (usa drawHeader con el objeto data para consistencia)
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
      // dibuja header en la nueva página
      drawHeader({ pageNumber: newPageNum, settings: { margin: { left: marginLeft, right: marginRight } } });
      footStartY = headerY + 22; // colocar debajo del header en la nueva página
      doc.setPage(newPageNum);
    }

    // Asegurar que la tabla de totales usa exactamente los mismos márgenes que la tabla principal
    autoTable(doc, {
      startY: footStartY,
      body: foot,
      theme: 'grid',
      margin: { left: marginLeft, right: marginRight },
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
        1: { halign: 'center' },
        2: { halign: 'right' },
      },
      didDrawPage: (data) => {
        const pageText = ` `;
        const footerText = ``;
        doc.setFontSize(9);
        const xRight = pageWidth - marginRight - doc.getTextWidth(pageText);
        doc.text(pageText, xRight, pageHeight - 20);
        doc.text(footerText, marginLeft, pageHeight - 20);

        drawHeader(data);
      },
      showHead: 'everyPage'
    });
    const filename = `reporte_bosques.pdf`;
    doc.save(filename);
  }
}