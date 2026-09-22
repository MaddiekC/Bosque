import { Component } from '@angular/core';
import { ApiService } from '../../services/api.service';
import { CommonModule } from '@angular/common';
import { NgxPaginationModule } from 'ngx-pagination';
import { FormsModule } from '@angular/forms';
import { AuthserviceService } from '../../auth/authservice.service';
import { PdfService } from '../../services/pdf.service';

@Component({
  selector: 'app-reporte',
  standalone: true,
  imports: [CommonModule, NgxPaginationModule, FormsModule],
  templateUrl: './reporte.component.html',
  styleUrl: './reporte.component.css'
})
export class ReporteComponent {
  reporteAcum: any[] = [];
  cabAnio: any;
  dateYear: number = new Date().getFullYear();
  filtoYear: number | null = null;
  totales: any = {             // totales generales
    total_trozas: 0,
    total_m3: 0,
    total_valor: 0,
    total_contenedor: 0
  };
  // paginación
  paginaActual: number = 1;
  itemsPorPagina: number = 9;
  username: string = '';

  constructor(
    private ReporteService: ApiService,
    private authService: AuthserviceService,
    private pdfService: PdfService
  ) { }

  ngOnInit(): void {
    const u = this.authService.getUserInfo();
    this.username = u ?? 'Invitado';
    this.loadAnios();
  }

  loadAnios() {
    this.ReporteService.getCabeceraAnios().subscribe(data => {
      // adaptar según forma devuelta
      if (data && data.length && data[0].anio !== undefined) {
        this.cabAnio = data.map((x: any) => Number(x.anio));
      } else if (Array.isArray(data)) {
        this.cabAnio = data.map((x: any) => Number(x));
      } else {
        this.cabAnio = [];
      }

      // Ordenar descendente (el año más reciente primero)
      this.cabAnio.sort((a: number, b: number) => b - a);

      // Asignar el año más reciente disponible por defecto
      if (this.cabAnio.length > 0) {
        this.dateYear = this.cabAnio[0];
      }

      // Cargar el reporte con el año seleccionado
      this.loadReport();
      console.log('Años disponibles:', this.cabAnio, 'Año seleccionado:', this.dateYear);
    }, error => {
      console.log('Error al cargar años:', error);
    });
  }

  loadReport() {
    this.filtoYear = this.dateYear;
    this.ReporteService.getAcumuladoVenta(this.filtoYear).subscribe(data => {
      console.log('Reporte:', data);
      if (data && data.envios) {
        this.reporteAcum = data.envios;
        this.totales = data.totales || { total_trozas: 0, total_m3: 0, total_valor: 0, total_contenedor: 0 };
      } else if (Array.isArray(data)) {
        this.reporteAcum = data;
        this.calculateTotals();
      } else {
        this.reporteAcum = [];
        this.totales = { total_trozas: 0, total_m3: 0, total_valor: 0, total_contenedor: 0 };
      }
    }, error => {
      console.log('Error al cargar reporte:', error);
    });
  }

  calculateTotals() {
    this.totales = {
      total_trozas: 0,
      total_m3: 0,
      total_valor: 0,
      total_contenedor: 0
    };
    const containers = new Set<string>();
    if (this.reporteAcum && this.reporteAcum.length) {
      this.reporteAcum.forEach((item: any) => {
        if (item.items && item.items.length) {
          item.items.forEach((sub: any) => {
            this.totales.total_trozas += Number(sub.total_trozas) || 0;
            this.totales.total_m3 += Number(sub.total_m3) || 0;
            this.totales.total_valor += Number(sub.total_valor) || 0;
            if (sub.contenedor) containers.add(String(sub.contenedor).trim());
          });
        } else {
          this.totales.total_trozas += Number(item.total_trozas) || 0;
          this.totales.total_m3 += Number(item.total_m3) || 0;
          this.totales.total_valor += Number(item.total_valor) || 0;
          if (item.contenedor) containers.add(String(item.contenedor).trim());
        }
      });
    }
    this.totales.total_contenedor = containers.size;
  }

  onChangeYear() {
    this.paginaActual = 1;
    this.loadReport();
  }

  async exportToPDF() {
    try {
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

      const totalTrozas = flatRows.reduce((s, r) => s + (Number(r.total_trozas) || 0), 0);
      const totalM3 = flatRows.reduce((s, r) => s + (Number(r.total_m3) || 0), 0);
      const totalValor = flatRows.reduce((s, r) => s + (Number(r.total_valor) || 0), 0);
      const totalContenedor = new Set(
        flatRows
          .map(r => r.contenedor)
          .filter(c => c !== null && c !== undefined && String(c).trim() !== '')
      ).size;

      const columns = [
        { header: 'N° Envío', dataKey: 'numero_envio', align: 'center' as const },
        { header: 'Fecha Embarque', dataKey: 'fecha_embarque', align: 'center' as const },
        { header: 'Contenedor', dataKey: 'contenedor', align: 'center' as const },
        { header: 'Bosque', dataKey: 'bosque_nombre', align: 'left' as const },
        { header: 'Total Trozas', dataKey: 'total_trozas', align: 'right' as const },
        { header: 'Total m³', dataKey: 'total_m3', align: 'right' as const },
        { header: 'Total Valor', dataKey: 'total_valor', align: 'right' as const }
      ];

      const rows = flatRows.map(item => ({
        numero_envio: item.numero_envio,
        fecha_embarque: this.pdfService.fmtDate(item.fecha_embarque),
        contenedor: item.contenedor,
        bosque_nombre: item.bosque_nombre,
        total_trozas: this.pdfService.fmtInteger(item.total_trozas),
        total_m3: this.pdfService.fmtNumber(item.total_m3, 4, 4),
        total_valor: this.pdfService.fmtCurrency(item.total_valor)
      }));

      const bloqueTotales = [
        { label: 'N. contenedores:', value: this.pdfService.fmtInteger(totalContenedor) },
        { label: 'Total Trozas:', value: this.pdfService.fmtInteger(totalTrozas) },
        { label: 'Total m³:', value: this.pdfService.fmtNumber(totalM3, 4, 4) },
        { label: 'Total Valor (USD):', value: this.pdfService.fmtCurrency(totalValor) }
      ];

      await this.pdfService.exportarTabla({
        titulo: 'Reporte Acumulado de Venta General',
        nombreArchivo: 'reporte_acumuladoVenta.pdf',
        columnas: columns,
        datos: rows,
        bloqueTotales
      });
    } catch (err) {
      console.error('Error generando PDF exportToPDF():', err);
      alert('Ocurrió un error al generar el PDF. Mira la consola para más detalles.');
    }
  }
}
