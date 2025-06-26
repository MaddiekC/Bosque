import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';
import { AuthserviceService } from '../auth/authservice.service';
//import { EncryptionService } from './encryption.service';
@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl: string = environment.apiUrl;

  constructor(private http: HttpClient, private authService: AuthserviceService) {
  }
  /*postSecure(url: string, data: any): Observable<any> {
    const encrypted = this.encryptionService.encrypt(data);
    return this.http.post(url, encrypted);
  }*/
  //-----BOSQUE--------//
  getBosques(): Observable<any> {
    return this.http.get(`${this.baseUrl}/bosques`, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }
  getBosque(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/bosques/${id}`, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }
  postBosque(bosque: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/bosques`, bosque, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }
  putBosque(id: number, bosque: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/bosques/${id}`, bosque, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }
  putBosqueInactive(id: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/bosques/${id}/inactive`, {}, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }
  countSiembrasByBosque(id: number): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}/siembras-rebrote/count-by-bosque/${id}`, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }
  //-----CABECERA CORTE-------//
  getCabeceraCortes(): Observable<any> {
    return this.http.get(`${this.baseUrl}/cabecera_cortes`, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }
  getCabeceraCorte(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/cabecera_cortes/${id}`, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }
  postCabeceraCorte(cabeceraCorte: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/cabecera_cortes`, cabeceraCorte, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }
  putCabeceraCorte(id: number, cabeceraCorte: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/cabecera_cortes/${id}`, cabeceraCorte, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }
  putCabeceraCorteInactive(id: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/cabecera_cortes/${id}/inactive`, {}, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }

  //-----DETALLE CORTE-------//
  getDetalleCortes(): Observable<any> {
    return this.http.get(`${this.baseUrl}/detalle_cortes`, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }
  getDetalleCorte(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/detalle_cortes/${id}`, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }
  postDetalleCorte(detalleCorte: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/detalle_cortes`, detalleCorte, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }
  putDetalleCorte(id: number, detalleCorte: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/detalle_cortes/${id}`, detalleCorte, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }
  putDetalleCorteInactive(id: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/detalle_cortes/${id}/inactive`, {}, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }

  //-----CLIENTE-------//
  getClientes(): Observable<any> {
    return this.http.get(`${this.baseUrl}/clientes`, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }

  getCliente(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/clientes/${id}`, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }

  postCliente(cliente: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/clientes`, cliente, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }
  putCliente(id: number, cliente: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/clientes/${id}`, cliente, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }
  putClienteInactive(id: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/clientes/${id}/inactive`, {}, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }

  //-----SIEMBRA REBROTE-------//
  sumHectareaUsada(bosqueId: number): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}/siembra-rebrote/sum-hectarea/${bosqueId}`, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }
  getSiembraRebrotes(): Observable<any> {
    return this.http.get(`${this.baseUrl}/siembra-rebrotes`, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }
  getSiembraRebrote(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/siembra-rebrotes/${id}`, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }
  postSiembraRebrote(siembraRebrote: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/siembra-rebrotes`, siembraRebrote, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }
  putSiembraRebrote(id: number, siembraRebrote: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/siembra-rebrotes/${id}`, siembraRebrote, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }
  putSiembraRebroteInactive(id: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/siembra-rebrotes/${id}/inactive`, {}, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }

  //-----CONTRATO-------//
  getContratos(): Observable<any> {
    return this.http.get(`${this.baseUrl}/contratos`, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }
  getContrato(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/contratos/${id}`, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }
  postContrato(contrato: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/contratos`, contrato, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }
  putContrato(id: number, contrato: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/contratos/${id}`, contrato, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }
  putContratoInactive(id: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/contratos/${id}/inactive`, {}, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }

  //-----DETALLE CONTRATO-------//
  getDetalleContratos(): Observable<any> {
    return this.http.get(`${this.baseUrl}/detalle_contratos`, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }
  getDetalleContrato(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/detalle_contratos/${id}`, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }
  postDetalleContrato(detalleContrato: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/detalle_contratos`, detalleContrato, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }
  putDetalleContrato(id: number, detalleContrato: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/detalle_contratos/${id}`, detalleContrato, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }
  putDetalleContratoInactive(id: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/detalle_contratos/${id}/inactive`, {}, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }

  //-----PARAMETRO-------//
  getParametros(): Observable<any> {
    return this.http.get(`${this.baseUrl}/parametros`, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }
  getParametro(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/parametros/${id}`, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }
  postParametro(parametro: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/parametros`, parametro, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }
  putParametro(id: number, parametro: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/parametros/${id}`, parametro, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }
  putParametroInactive(id: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/parametros/${id}/inactive`, {}, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }
  getTipoArbol(categoria: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/parametros/categoria/${categoria}`, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }
  getSecciones(categoria: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/parametros/categoria/${categoria}`, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }
  getTipoSR(categoria: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/parametros/categoria/${categoria}`, { headers: { Authorization: `Bearer ${this.authService.getToken()}` } });
  }
}