import { HttpClient } from '@angular/common/http';
import { Injectable } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../environment/environment';

//import { EncryptionService } from './encryption.service';
@Injectable({
  providedIn: 'root'
})
export class ApiService {
  private baseUrl: string = environment.apiUrl;

  constructor(private http: HttpClient) {
  }
  /*postSecure(url: string, data: any): Observable<any> {
    const encrypted = this.encryptionService.encrypt(data);
    return this.http.post(url, encrypted);
  }*/
  //-----BOSQUE--------//
  getBosques(): Observable<any> {
    return this.http.get(`${this.baseUrl}/bosques`);
  }
  getBosque(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/bosques/${id}`);
  }
  postBosque(bosque: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/bosques`, bosque);
  }
  putBosque(id: number, bosque: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/bosques/${id}`, bosque);
  }
  putBosqueInactive(id: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/bosques/${id}/inactive`, {});
  }
  countSiembrasByBosque(id: number): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}/siembras-rebrote/count-by-bosque/${id}`);
  }
  //-----CABECERA CORTE-------//
  getCabeceraCortes(): Observable<any> {
    return this.http.get(`${this.baseUrl}/cabecera_cortes`);
  }
  getCabeceraCorte(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/cabecera_cortes/${id}`);
  }
  postCabeceraCorte(cabeceraCorte: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/cabecera_cortes`, cabeceraCorte);
  }
  putCabeceraCorte(id: number, cabeceraCorte: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/cabecera_cortes/${id}`, cabeceraCorte);
  }
  putCabeceraCorteInactive(id: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/cabecera_cortes/${id}/inactive`, {});
  }

  //-----DETALLE CORTE-------//
  getDetalleCortes(): Observable<any> {
    return this.http.get(`${this.baseUrl}/detalle_cortes`);
  }
  getDetalleCorte(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/detalle_cortes/${id}`);
  }
  postDetalleCorte(detalleCorte: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/detalle_cortes`, detalleCorte);
  }
  putDetalleCorte(id: number, detalleCorte: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/detalle_cortes/${id}`, detalleCorte);
  }
  putDetalleCorteInactive(id: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/detalle_cortes/${id}/inactive`, {});
  }

  //-----CLIENTE-------//
  getClientes(): Observable<any> {
    return this.http.get(`${this.baseUrl}/clientes`);
  }

  getCliente(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/clientes/${id}`);
  }


  //-----SIEMBRA REBROTE-------//
  sumHectareaUsada(bosqueId: number): Observable<number> {
    return this.http.get<number>(`${this.baseUrl}/siembra-rebrote/sum-hectarea/${bosqueId}`);
  }
  getSiembraRebrotes(): Observable<any> {
    return this.http.get(`${this.baseUrl}/siembra-rebrotes`);
  }
  getSiembraRebrote(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/siembra-rebrotes/${id}`);
  }
  postSiembraRebrote(siembraRebrote: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/siembra-rebrotes`, siembraRebrote);
  }
  putSiembraRebrote(id: number, siembraRebrote: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/siembra-rebrotes/${id}`, siembraRebrote);
  }
  putSiembraRebroteInactive(id: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/siembra-rebrotes/${id}/inactive`, {});
  }

  //-----CONTRATO-------//
  getContratos(): Observable<any> {
    return this.http.get(`${this.baseUrl}/contratos`);
  }
  getContrato(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/contratos/${id}`);
  }
  getContratoEstados(): Observable<any> {
    return this.http.get(`${this.baseUrl}/contratos`);
  }
  postContrato(contrato: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/contratos`, contrato);
  }
  putContrato(id: number, contrato: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/contratos/${id}`, contrato);
  }
  putContratoInactive(id: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/contratos/${id}/inactive`, {});
  }
  putContratoClose(id: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/contratos/${id}/close`, {});
  }

  //-----DETALLE CONTRATO-------//
  getDetContratos(): Observable<any> {
    return this.http.get(`${this.baseUrl}/detalle-contratos`);
  }
  getDetContratoByContratoId(contrato_id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/detalle-contratos/${contrato_id}`);
  }
  postDetContrato(detalleContrato: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/detalle-contratos`, detalleContrato);
  }
  putDetContrato(id: number, detalleContrato: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/detalle-contratos/${id}`, detalleContrato);
  }
  putDetContratoInactive(id: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/detalle-contratos/${id}/inactive`, {});
  }
  //-----ANTICIPO-------//
  getAnticipos(): Observable<any> {
    return this.http.get(`${this.baseUrl}/anticipos`);
  }
  getAnticipo(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/anticipos/${id}`);
  }
  getUltimosAnticipos(): Observable<any> {
    return this.http.get(`${this.baseUrl}/anticipos/ultimos`);
  }
  getTotalesAnticipos(): Observable<any> {
    return this.http.get(`${this.baseUrl}/anticipos/totales`);
  }
  getUltimoAnticipo(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/anticipos/ultimo/${id}`);
  }
  postAnticipo(contratoId: number, anticipo: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/anticipos/${contratoId}`, anticipo);
  }
  putAnticipo(id: number, anticipo: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/anticipos/${id}`, anticipo);
  }
  putAnticipoInactive(id: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/anticipos/${id}/inactive`, {});
  }

  //-----PARAMETRO-------//
  getParametros(): Observable<any> {
    return this.http.get(`${this.baseUrl}/parametros`);
  }
  getParametro(id: number): Observable<any> {
    return this.http.get(`${this.baseUrl}/parametros/${id}`);
  }
  postParametro(parametro: any): Observable<any> {
    return this.http.post(`${this.baseUrl}/parametros`, parametro);
  }
  putParametro(id: number, parametro: any): Observable<any> {
    return this.http.put(`${this.baseUrl}/parametros/${id}`, parametro);
  }
  putParametroInactive(id: number): Observable<any> {
    return this.http.put(`${this.baseUrl}/parametros/${id}/inactive`, {});
  }
  getTipoArbol(categoria: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/parametros/categoria/${categoria}`);
  }
  getSecciones(categoria: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/parametros/categoria/${categoria}`);
  }
  getTipoSR(categoria: string): Observable<any> {
    return this.http.get(`${this.baseUrl}/parametros/categoria/${categoria}`);
  }
}