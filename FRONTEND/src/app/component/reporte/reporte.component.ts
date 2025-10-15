import { Component } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { NgxPaginationModule } from 'ngx-pagination';
import { FormsModule } from '@angular/forms';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AuthserviceService } from '../../auth/authservice.service';

@Component({
  selector: 'app-reporte',
  standalone: true,
  imports: [CommonModule, NgxPaginationModule, FormsModule],
  templateUrl: './reporte.component.html',
  styleUrl: './reporte.component.css'
})
export class ReporteComponent {
  reporteAcum: any;
  cabAnio: any;
  dateYear: number = 2025;
  filtoYear: number | null = null;
  totales: any = {             // totales generales
    total_trozas: 0,
    total_m3: 0,
    total_valor: 0
  };
  // paginación
  paginaActual: number = 1;
  itemsPorPagina: number = 9;
  username: string = '';

  constructor(private ReporteService: ApiService, private authService: AuthserviceService) { }
  ngOnInit(): void {
    const u = this.authService.getUserInfo();
    this.username = u ?? 'Invitado';
    this.loadAnios();
    this.loadReport(); // carga inicial (Todo)
  }

  loadAnios() {
    this.ReporteService.getCabeceraAnios().subscribe(data => {
      // adaptar según forma devuelta
      if (data && data.length && data[0].anio !== undefined) {
        this.cabAnio = data.map((x: any) => x.anio);
      } else {
        this.cabAnio = data || [];
      }
      console.log('Años disponibles:', this.cabAnio);
    });
  }

  loadReport() {
    const year = this.dateYear == null ? 0 : Number(this.dateYear);
    this.ReporteService.getAcumuladoVenta(year).subscribe(res => {
      console.log('API response for acumulado:', res);

      // Si el backend ahora devuelve { envios: [...], totales: {...} }
      if (res && res.envios !== undefined && Array.isArray(res.envios)) {
        this.reporteAcum = res.envios;
        this.totales = res.totales ?? { total_trozas: 0, total_m3: 0, total_valor: 0 };
      } else {
        // formato inesperado: intentar convertir si es objeto con clave única
        this.reporteAcum = [];
        this.totales = { total_trozas: 0, total_m3: 0, total_valor: 0 };
        console.warn('Respuesta inesperada de API:', res);
      }

      // reset paginador al recargar datos
      this.paginaActual = 1;
    }, err => {
      console.error('Error cargando reporte:', err);
      this.reporteAcum = [];
      this.totales = { total_trozas: 0, total_m3: 0, total_valor: 0 };
    });
  }

  onChangeYear() {
    this.paginaActual = 1;
    this.loadReport();
  }

  async exportToPDF() {
    const loadImageAsDataURL = (url: string): Promise<string> => {
      return new Promise((resolve, reject) => {
        const img = new Image();
        img.crossOrigin = 'anonymous';
        img.onload = () => {
          try {
            const canvas = document.createElement('canvas');
            canvas.width = img.naturalWidth || img.width;
            canvas.height = img.naturalHeight || img.height;
            const ctx = canvas.getContext('2d')!;
            ctx.drawImage(img, 0, 0);
            resolve(canvas.toDataURL('image/png'));
          } catch (e) {
            reject(e);
          }
        };
        img.onerror = (err) => reject(err);
        img.src = `/assets/images/bosque.png`;
      });
    };

    try {
      const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation: 'portrait' });
      const pageSize = doc.internal.pageSize as any;
      const pageWidth = pageSize.getWidth();
      const pageHeight = pageSize.getHeight();

      const marginLeft = 20;
      const marginRight = 20;
      const usableWidth = pageWidth - marginLeft - marginRight;
      const headerY = 60;
      const username = this.username ?? 'Invitado';
      const generatedAt = new Date().toLocaleString('es-ES');

      // ---------- Aplanar datos (si vienen agrupados) ----------
      const flatRows: any[] = [];
      if (this.reporteAcum && this.reporteAcum.length && this.reporteAcum[0].items) {
        this.reporteAcum.forEach((envio: any) => {
          (envio.items || []).forEach((it: any) => {
            flatRows.push({
              numero_envio: envio.numero_envio,
              fecha_embarque: envio.fecha_embarque,
              contenedor: it.contenedor,
              bosque_nombre: it.bosque_nombre ?? it.bosque_id ?? '',
              total_trozas: Number(it.total_trozas) || 0,
              total_m3: Number(it.total_m3) || 0,
              total_valor: Number(it.total_valor) || 0
            });
          });
        });
      } else {
        (this.reporteAcum || []).forEach((r: any) => {
          flatRows.push({
            numero_envio: r.numero_envio ?? '',
            fecha_embarque: r.fecha_embarque ?? '',
            contenedor: r.contenedor ?? '',
            bosque_nombre: r.bosque_nombre ?? r.bosque_id ?? '',
            total_trozas: Number(r.total_trozas) || 0,
            total_m3: Number(r.total_m3) || 0,
            total_valor: Number(r.total_valor) || 0
          });
        });
      }

      // ---------- Calcular totales generales ----------
      const totalTrozas = flatRows.reduce((s, r) => s + (Number(r.total_trozas) || 0), 0);
      const totalM3 = flatRows.reduce((s, r) => s + (Number(r.total_m3) || 0), 0);
      const totalValor = flatRows.reduce((s, r) => s + (Number(r.total_valor) || 0), 0);
      // elimina entradas vacías/undefined y cuenta únicos
      const totalContenedor = new Set(
        flatRows
          .map(r => r.contenedor)
          .filter(c => c !== null && c !== undefined && String(c).trim() !== '')
      ).size;

      const fmtInteger = (n: number) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: 0, maximumFractionDigits: 0 }).format(Math.round(n));
      const fmtM3 = (n: number) => new Intl.NumberFormat('es-ES', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(n);
      const fmtMoney = (n: number) => '$' + new Intl.NumberFormat('es-ES', { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(n);

      // ---------- Preparar filas para autoTable ----------
      const rows = flatRows.map(item => [
        item.numero_envio,
        item.fecha_embarque ? new Date(item.fecha_embarque).toLocaleDateString('es-ES') : '',
        item.contenedor,
        item.bosque_nombre,
        String(item.total_trozas),
        new Intl.NumberFormat('es-ES', { minimumFractionDigits: 4, maximumFractionDigits: 4 }).format(item.total_m3),
        fmtMoney(item.total_valor)
      ]);

      const columns = [
        { header: 'N° Envío', dataKey: 'numero_envio' },
        { header: 'Fecha Embarque', dataKey: 'fecha_embarque' },
        { header: 'Contenedor', dataKey: 'contenedor' },
        { header: 'Bosque', dataKey: 'bosque_nombre' },
        { header: 'Total Trozas', dataKey: 'total_trozas' },
        { header: 'Total m³', dataKey: 'total_m3' },
        { header: 'Total Valor', dataKey: 'total_valor' }
      ];

      // cargar logo (no bloqueante)
      let logoDataUrl: string | null = null;
      try {
        logoDataUrl = await loadImageAsDataURL('/assets/images/bosque.png');
      } catch (e) {
        console.warn('No se pudo cargar logo para el PDF:', e);
        logoDataUrl = null;
      }

      const drawHeader = (data: any) => {
        if (logoDataUrl) {
          const desiredWidth = 60;
          const img = new Image();
          img.src = logoDataUrl;
          const ratio = (img.naturalHeight && img.naturalWidth) ? (img.naturalHeight / img.naturalWidth) : 0.5;
          const desiredHeight = ratio ? desiredWidth * ratio : 30;
          doc.addImage(logoDataUrl, 'PNG', marginLeft, 8, desiredWidth, desiredHeight);
        }
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Reporte Acumulado de venta General', marginLeft, 50);

        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        const gen = `${generatedAt}`;
        const usr = `${username}`;
        doc.text(gen, pageWidth - marginRight - doc.getTextWidth(gen), 14);
        doc.text(usr, pageWidth - marginRight - doc.getTextWidth(usr), 28);

        doc.setDrawColor(200);
        doc.setLineWidth(0.5);
        doc.line(marginLeft, headerY, pageWidth - marginRight, headerY);
      };

      autoTable(doc, {
        startY: headerY + 22,
        head: [columns.map(c => c.header)],
        body: rows,
        margin: { left: marginLeft, right: marginRight, top: headerY + 6 },
        styles: {
          fontSize: 10,
          cellPadding: 3,
          overflow: 'linebreak',
          halign: 'right',
          valign: 'middle',
        },
        columnStyles: {
          0: { halign: 'center' },
          1: { halign: 'center' },
          2: { halign: 'center' },
          3: { halign: 'center' },
          4: { halign: 'right' },
          5: { halign: 'right' },
          6: { halign: 'right' }
        },
        headStyles: { fillColor: [34, 139, 34], textColor: 255, halign: 'center' },
        tableWidth: usableWidth,
        didDrawPage: (data) => {
          const page = data.pageNumber;
          const pageText = `Página ${page}`;
          doc.setFontSize(9);
          const xRight = pageWidth - marginRight - doc.getTextWidth(pageText);
          doc.text(pageText, xRight, pageHeight - 20);
          doc.text('', marginLeft, pageHeight - 20);
          drawHeader(data);
        },
        showHead: 'everyPage'
      });

      // ---------- Dibujar bloque de totales generales debajo de la tabla ----------
      const lastTable = (doc as any).lastAutoTable;
      const lastY = lastTable ? lastTable.finalY : (pageHeight - 60);
      const lastPage = (doc as any).internal.getNumberOfPages ? (doc as any).internal.getNumberOfPages() : 1;

      // ir a la última página
      doc.setPage(lastPage);

      // posición inicial para los totales (debajo de la tabla)
      let y = lastY + 12;
      const lineHeight = 14;

      // preparar líneas de totales
      const totalsLines = [
        { label: 'N. contenedores:', value: fmtInteger(totalContenedor) },
        { label: 'Total Trozas:', value: fmtInteger(totalTrozas) },
        { label: 'Total m³:', value: fmtM3(totalM3) },
        { label: 'Total Valor (USD):', value: fmtMoney(totalValor) }
      ];

      const neededHeight = totalsLines.length * lineHeight + 10;
      if (y + neededHeight > pageHeight - 30) {
        doc.addPage();
        const newPage = (doc as any).internal.getNumberOfPages();
        drawHeader({ pageNumber: newPage });
        doc.setPage(newPage);
        y = headerY + 22;
      }

      // estilo de totales: etiqueta normal gris, valor negrita negro alineado a la derecha
      const xLeft = marginLeft;
      const xRightBase = pageWidth - marginRight;

      for (const item of totalsLines) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(10);
        doc.setTextColor(100);
        doc.text(item.label, xLeft, y);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(0);
        const valueText = String(item.value);
        const xValue = xRightBase - doc.getTextWidth(valueText);
        doc.text(valueText, xValue, y);

        y += lineHeight;
      }

      // línea separadora opcional
      doc.setDrawColor(200);
      doc.setLineWidth(0.5);
      doc.line(marginLeft, y + 4, pageWidth - marginRight, y + 4);

      // Guardar el PDF
      const filename = `reporte_acumuladoVenta.pdf`;
      doc.save(filename);

    } catch (err) {
      console.error('Error generando PDF exportToPDF():', err);
      alert('Ocurrió un error al generar el PDF. Mira la consola para más detalles.');
    }
  }
}
