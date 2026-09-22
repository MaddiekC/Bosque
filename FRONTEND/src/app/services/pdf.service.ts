import { Injectable } from '@angular/core';
import jsPDF from 'jspdf';
import autoTable from 'jspdf-autotable';
import { AuthserviceService } from '../auth/authservice.service';

export interface PdfColumn {
  header: string;
  dataKey?: string;
  width?: number;
  align?: 'left' | 'center' | 'right';
}

export interface PdfTableConfig {
  titulo: string;
  subtitulo?: string;
  nombreArchivo?: string;
  orientacion?: 'p' | 'portrait' | 'l' | 'landscape';
  columnas?: PdfColumn[] | string[] | any[][];
  head?: any[][];
  datos: any[];
  filasTotales?: any[][];
  bloqueTotales?: { label: string; value: string | number }[];
  showFoot?: 'everyPage' | 'lastPage' | 'never';
  columnStyles?: Record<string | number, any>;
  headStyles?: Record<string, any>;
  footStyles?: Record<string, any>;
  didParseCell?: (data: any) => void;
  logoUrl?: string;
  mostrarFechaUsuario?: boolean;
}

export interface PdfDetailConfig {
  titulo: string;
  subtitulo?: string;
  nombreArchivo?: string;
  orientacion?: 'p' | 'portrait' | 'l' | 'landscape';
  infoCabecera: [string, string | number][];
  columnas?: string[] | string[][] | PdfColumn[] | any[][];
  head?: any[][];
  datos: any[][];
  filasTotales?: any[][];
  bloqueTotales?: { label: string; value: string | number }[];
  showFoot?: 'everyPage' | 'lastPage' | 'never';
  columnStyles?: Record<string | number, any>;
  headStyles?: Record<string, any>;
  footStyles?: Record<string, any>;
  didParseCell?: (data: any) => void;
  logoUrl?: string;
}

@Injectable({
  providedIn: 'root'
})
export class PdfService {

  private defaultLogoUrl = '/assets/images/bosque.png';
  private cachedLogoDataUrl: string | null = null;

  constructor(private authService: AuthserviceService) { }

  /**
   * Carga una imagen y devuelve su DataURL en base64 (con caché)
   */
  async loadImageAsDataURL(url: string = this.defaultLogoUrl): Promise<string | null> {
    if (url === this.defaultLogoUrl && this.cachedLogoDataUrl) {
      return this.cachedLogoDataUrl;
    }

    return new Promise((resolve) => {
      const img = new Image();
      img.crossOrigin = 'anonymous';
      img.onload = () => {
        try {
          const canvas = document.createElement('canvas');
          canvas.width = img.naturalWidth || img.width;
          canvas.height = img.naturalHeight || img.height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0);
            const dataUrl = canvas.toDataURL('image/png');
            if (url === this.defaultLogoUrl) {
              this.cachedLogoDataUrl = dataUrl;
            }
            resolve(dataUrl);
            return;
          }
        } catch (e) {
          console.warn('Error convirtiendo imagen a DataURL:', e);
        }
        resolve(null);
      };
      img.onerror = () => {
        console.warn('No se pudo cargar la imagen para el PDF:', url);
        resolve(null);
      };
      img.src = url;
    });
  }

  /**
   * Formateador de moneda en USD
   */
  fmtCurrency(value: any): string {
    const n = Number(value) || 0;
    try {
      const abs = Math.abs(n);
      const formatted = new Intl.NumberFormat('es-ES', {
        minimumFractionDigits: 2,
        maximumFractionDigits: 2
      }).format(abs);
      return (n < 0 ? '-$' : '$') + formatted;
    } catch {
      return (n < 0 ? '-$' : '$') + Math.abs(n).toFixed(2);
    }
  }

  /**
   * Formateador numérico genérico
   */
  fmtNumber(value: any, minDecimals = 0, maxDecimals = 2): string {
    if (value === null || value === undefined || value === '') return '';
    const n = Number(value);
    if (isNaN(n)) return String(value);
    try {
      return new Intl.NumberFormat('es-ES', {
        minimumFractionDigits: minDecimals,
        maximumFractionDigits: maxDecimals
      }).format(n);
    } catch {
      return n.toFixed(maxDecimals);
    }
  }

  /**
   * Formateador de enteros
   */
  fmtInteger(value: any): string {
    return this.fmtNumber(value, 0, 0);
  }

  /**
   * Formateador de fecha
   */
  fmtDate(value: any): string {
    if (!value) return '';
    try {
      return new Date(value).toLocaleDateString('es-ES');
    } catch {
      return String(value);
    }
  }

  /**
   * Exporta un reporte estándar en formato de tabla
   */
  async exportarTabla(config: PdfTableConfig): Promise<void> {
    const orientation = (config.orientacion === 'l' || config.orientacion === 'landscape') ? 'landscape' : 'portrait';
    const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const marginLeft = 25;
    const marginRight = 25;
    const headerY = 55;

    const username = this.authService.getUserInfo() ?? 'Invitado';
    const generatedAt = new Date().toLocaleString('es-ES');

    const logoDataUrl = await this.loadImageAsDataURL(config.logoUrl || this.defaultLogoUrl);

    const drawHeader = () => {
      if (logoDataUrl) {
        doc.addImage(logoDataUrl, 'PNG', marginLeft, 12, 60, 25);
      }

      // Título
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(33, 37, 41);
      doc.text(config.titulo, marginLeft + (logoDataUrl ? 70 : 0), 28);

      // Subtítulo si existe
      if (config.subtitulo) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(108, 117, 125);
        doc.text(config.subtitulo, marginLeft + (logoDataUrl ? 70 : 0), 42);
      }

      // Info a la derecha (fecha + usuario)
      if (config.mostrarFechaUsuario !== false) {
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(100, 100, 100);
        const genText = `Fecha: ${generatedAt}`;
        const usrText = `Usuario: ${username}`;
        doc.text(genText, pageWidth - marginRight - doc.getTextWidth(genText), 22);
        doc.text(usrText, pageWidth - marginRight - doc.getTextWidth(usrText), 34);
      }

      // Línea divisoria
      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(marginLeft, headerY, pageWidth - marginRight, headerY);
    };

    const isPdfColumnArray = Array.isArray(config.columnas) && config.columnas.length > 0 && typeof config.columnas[0] === 'object';

    // Mapeo de datos para el body
    const body = config.datos.map(row => {
      if (Array.isArray(row)) return row;
      if (isPdfColumnArray) {
        return (config.columnas as PdfColumn[]).map(col => {
          const val = col.dataKey ? row[col.dataKey] : '';
          return val !== undefined && val !== null ? val : '';
        });
      }
      return Object.values(row);
    });

    let head: any[];
    if (config.head) {
      head = config.head;
    } else if (Array.isArray(config.columnas) && config.columnas.length > 0 && Array.isArray(config.columnas[0])) {
      head = config.columnas as any[][];
    } else if (Array.isArray(config.columnas)) {
      head = [
        isPdfColumnArray
          ? (config.columnas as PdfColumn[]).map(col => col.header)
          : (config.columnas as string[])
      ];
    } else {
      head = [];
    }

    const defaultColumnStyles: Record<number, any> = {};
    if (isPdfColumnArray) {
      (config.columnas as PdfColumn[]).forEach((col, idx) => {
        const style: any = {};
        if (col.align) style.halign = col.align;
        if (col.width) style.cellWidth = col.width;
        if (Object.keys(style).length > 0) {
          defaultColumnStyles[idx] = style;
        }
      });
    }

    autoTable(doc, {
      startY: headerY + 15,
      head: head,
      body: body,
      foot: config.filasTotales || undefined,
      showFoot: config.showFoot || 'lastPage',
      margin: { left: marginLeft, right: marginRight, top: headerY + 15, bottom: 35 },
      styles: {
        fontSize: 8.5,
        cellPadding: 4,
        overflow: 'linebreak'
      },
      headStyles: {
        fillColor: [34, 139, 34],
        textColor: 255,
        fontStyle: 'bold',
        halign: 'left',
        ...(config.headStyles || {})
      },
      footStyles: {
        fillColor: [240, 240, 240],
        textColor: 0,
        fontStyle: 'bold',
        ...(config.footStyles || {})
      },
      columnStyles: { ...defaultColumnStyles, ...(config.columnStyles || {}) },
      didParseCell: config.didParseCell,
      didDrawPage: (data) => {
        drawHeader();
        const pageNumber = data.pageNumber;
        const totalPages = (doc as any).internal.getNumberOfPages ? (doc as any).internal.getNumberOfPages() : pageNumber;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120, 120, 120);
        const footerText = `Página ${pageNumber} de ${totalPages}`;
        doc.text(footerText, pageWidth / 2 - doc.getTextWidth(footerText) / 2, pageHeight - 15);
      }
    });

    // Si se define bloqueTotales, dibujar bloque en la última página
    if (config.bloqueTotales && config.bloqueTotales.length > 0) {
      const lastTable = (doc as any).lastAutoTable;
      const lastY = lastTable ? lastTable.finalY : (pageHeight - 60);
      const lastPage = (doc as any).internal.getNumberOfPages ? (doc as any).internal.getNumberOfPages() : 1;

      doc.setPage(lastPage);

      let y = lastY + 14;
      const lineHeight = 15;
      const neededHeight = config.bloqueTotales.length * lineHeight + 15;

      if (y + neededHeight > pageHeight - 35) {
        doc.addPage();
        const newPage = (doc as any).internal.getNumberOfPages();
        doc.setPage(newPage);
        drawHeader();
        y = headerY + 20;
      }

      const xLeft = marginLeft;
      const xRightBase = pageWidth - marginRight;

      for (const item of config.bloqueTotales) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(100, 100, 100);
        doc.text(item.label, xLeft, y);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(20, 20, 20);
        const valueText = String(item.value);
        const xValue = xRightBase - doc.getTextWidth(valueText);
        doc.text(valueText, xValue, y);

        y += lineHeight;
      }

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(marginLeft, y + 2, pageWidth - marginRight, y + 2);
    }

    const filename = config.nombreArchivo || `${config.titulo.toLowerCase().replace(/\s+/g, '_')}.pdf`;
    doc.save(filename);
  }

  /**
   * Exporta un reporte tipo Ficha: Información de Cabecera (campo/valor) + Tabla de Detalles
   */
  async exportarFichaDetalle(config: PdfDetailConfig): Promise<void> {
    const orientation = (config.orientacion === 'l' || config.orientacion === 'landscape') ? 'landscape' : 'portrait';
    const doc = new jsPDF({ unit: 'pt', format: 'a4', orientation });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();

    const margin = 35;
    const headerY = 55;

    const username = this.authService.getUserInfo() ?? 'Invitado';
    const generatedAt = new Date().toLocaleString('es-ES');

    const logoDataUrl = await this.loadImageAsDataURL(config.logoUrl || this.defaultLogoUrl);

    const drawHeader = () => {
      if (logoDataUrl) {
        doc.addImage(logoDataUrl, 'PNG', margin, 12, 60, 25);
      }

      // Título
      doc.setFontSize(13);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(33, 37, 41);
      doc.text(config.titulo, margin + (logoDataUrl ? 70 : 0), 28);

      if (config.subtitulo) {
        doc.setFontSize(9);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(108, 117, 125);
        doc.text(config.subtitulo, margin + (logoDataUrl ? 70 : 0), 42);
      }

      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(100, 100, 100);
      const genText = `Fecha: ${generatedAt}`;
      const usrText = `Usuario: ${username}`;
      doc.text(genText, pageWidth - margin - doc.getTextWidth(genText), 22);
      doc.text(usrText, pageWidth - margin - doc.getTextWidth(usrText), 34);

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(margin, headerY, pageWidth - margin, headerY);
    };

    // 1) Tabla de Resumen de Cabecera (clave - valor en dos columnas compactas)
    const cabeceraBody = config.infoCabecera.map(([k, v]) => [k, String(v ?? '')]);

    autoTable(doc, {
      startY: headerY + 10,
      body: cabeceraBody,
      theme: 'grid',
      styles: { fontSize: 8.5, cellPadding: 3 },
      columnStyles: {
        0: { cellWidth: 140, fontStyle: 'bold', fillColor: [245, 245, 245] },
        1: { cellWidth: pageWidth - margin * 2 - 140 }
      },
      showHead: 'never',
      margin: { left: margin, right: margin }
    });

    const finalY = (doc as any).lastAutoTable ? (doc as any).lastAutoTable.finalY + 15 : headerY + 80;

    // 2) Preparar estilos y cabecera de la tabla de detalles
    const defaultColumnStyles: Record<number, any> = {};
    const isPdfColumnArray = Array.isArray(config.columnas) && config.columnas.length > 0 && typeof config.columnas[0] === 'object' && !Array.isArray(config.columnas[0]);

    if (isPdfColumnArray) {
      (config.columnas as PdfColumn[]).forEach((col, idx) => {
        const style: any = {};
        if (col.align) style.halign = col.align;
        if (col.width) style.cellWidth = col.width;
        if (Object.keys(style).length > 0) {
          defaultColumnStyles[idx] = style;
        }
      });
    }

    let head: any[];
    if (config.head) {
      head = config.head;
    } else if (Array.isArray(config.columnas) && config.columnas.length > 0 && Array.isArray(config.columnas[0])) {
      head = config.columnas as any[][];
    } else if (Array.isArray(config.columnas)) {
      head = [
        isPdfColumnArray
          ? (config.columnas as PdfColumn[]).map(c => c.header)
          : (config.columnas as string[])
      ];
    } else {
      head = [];
    }

    autoTable(doc, {
      startY: finalY,
      head: head,
      body: config.datos,
      foot: config.filasTotales || undefined,
      showFoot: config.showFoot || 'lastPage',
      margin: { left: margin, right: margin, top: headerY + 15, bottom: 35 },
      styles: { fontSize: 8.5, cellPadding: 3, overflow: 'linebreak' },
      headStyles: { fillColor: [34, 139, 34], textColor: 255, fontStyle: 'bold', ...(config.headStyles || {}) },
      footStyles: { fillColor: [240, 240, 240], textColor: 0, fontStyle: 'bold', ...(config.footStyles || {}) },
      columnStyles: { ...defaultColumnStyles, ...(config.columnStyles || {}) },
      didParseCell: config.didParseCell,
      didDrawPage: (data) => {
        drawHeader();
        const pageNumber = data.pageNumber;
        const totalPages = (doc as any).internal.getNumberOfPages ? (doc as any).internal.getNumberOfPages() : pageNumber;
        doc.setFontSize(8);
        doc.setFont('helvetica', 'normal');
        doc.setTextColor(120, 120, 120);
        const footerText = `Página ${pageNumber} de ${totalPages}`;
        doc.text(footerText, pageWidth / 2 - doc.getTextWidth(footerText) / 2, pageHeight - 15);
      }
    });

    if (config.bloqueTotales && config.bloqueTotales.length > 0) {
      const lastTable = (doc as any).lastAutoTable;
      const lastY = lastTable ? lastTable.finalY : (pageHeight - 60);
      const lastPage = (doc as any).internal.getNumberOfPages ? (doc as any).internal.getNumberOfPages() : 1;

      doc.setPage(lastPage);

      let y = lastY + 14;
      const lineHeight = 15;
      const neededHeight = config.bloqueTotales.length * lineHeight + 15;

      if (y + neededHeight > pageHeight - 35) {
        doc.addPage();
        const newPage = (doc as any).internal.getNumberOfPages();
        doc.setPage(newPage);
        drawHeader();
        y = headerY + 20;
      }

      const xLeft = margin;
      const xRightBase = pageWidth - margin;

      for (const item of config.bloqueTotales) {
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(9.5);
        doc.setTextColor(100, 100, 100);
        doc.text(item.label, xLeft, y);

        doc.setFont('helvetica', 'bold');
        doc.setTextColor(20, 20, 20);
        const valueText = String(item.value);
        const xValue = xRightBase - doc.getTextWidth(valueText);
        doc.text(valueText, xValue, y);

        y += lineHeight;
      }

      doc.setDrawColor(200, 200, 200);
      doc.setLineWidth(0.5);
      doc.line(margin, y + 2, pageWidth - margin, y + 2);
    }

    const filename = config.nombreArchivo || `${config.titulo.toLowerCase().replace(/\s+/g, '_')}.pdf`;
    doc.save(filename);
  }
}
