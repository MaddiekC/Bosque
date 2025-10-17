<?php

use App\Http\Controllers\AuthController;
use App\Http\Controllers\BosqueController;
use App\Http\Controllers\CabeceraCorteController;
use App\Http\Controllers\ClienteController;
use App\Http\Controllers\ContratoController;
use App\Http\Controllers\DetalleContratoController;
use App\Http\Controllers\DetalleCorteController;
use App\Http\Controllers\ParametroController;
use App\Http\Controllers\SiembraRebroteController;
use App\Http\Controllers\AnticipoController;
use App\Http\Controllers\SeccionController;

use Illuminate\Support\Facades\Route;

/*
|--------------------------------------------------------------------------
| API Routes
|--------------------------------------------------------------------------
|
| Here is where you can register API routes for your application. These
| routes are loaded by the RouteServiceProvider and all of them will
| be assigned to the "api" middleware group. Make something great!
|
*/

/*Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
    return $request->user();
});*/

//Route::post('/refresh', [AuthController::class, 'refresh']);

Route::group(
    [
        'prefix' => 'auth'
    ],
    function () {
        Route::post('/login', [AuthController::class, 'login'])->name('login');
        Route::post('/logout', [AuthController::class, 'logout']);
    }
);

Route::group(
    [
        'middleware' =>  'auth:api'
    ],
    function () {
        Route::get('/me/permissions', [AuthController::class, 'permissions']); // Transacciones
        Route::get('/bosques', [BosqueController::class, 'index']);        // Listar todos los bosques
        Route::post('/bosques', [BosqueController::class, 'store']); // Crear un bosque
        Route::get('/bosques/{id}', [BosqueController::class, 'show']);    // Ver un bosque por ID
        Route::get('/secciones', [SeccionController::class, 'index']);
        Route::put('/bosques/{id}', [BosqueController::class, 'update']);  // Actualizar un bosque (PUT)
        Route::put('/bosques/{id}/inactive', [BosqueController::class, 'destroy']); // Marcar un bosque como inactivo

        Route::get('/cabecera-cortes', [CabeceraCorteController::class, 'index']); // Listar todas las cabeceras de corte
        Route::get('/cabecera-raleos', [CabeceraCorteController::class, 'raleoIndex']);
        Route::get('/cabecera-cortes/anios', [CabeceraCorteController::class, 'getAnios']); 
        Route::get('/cabecera-corte/{id}', [CabeceraCorteController::class, 'show']); // Ver una cabecera de corte por ID
        Route::get('/cabecera-cortes/contrato/{contrato_id}', [CabeceraCorteController::class, 'getContrato']); // Ver una cabecera de corte por contrato ID
        Route::get('corte/count-by-SR/{id}', function ($id) {
            return response()->json(\App\Models\CabeceraCorte::where('siembra_rebrote_id', $id)->count());
        });
        Route::post('/cabecera-cortes', [CabeceraCorteController::class, 'store']); // Crear una cabecera de corte
        Route::put('/cabecera-cortes/{id}', [CabeceraCorteController::class, 'update']); // Actualizar una cabecera de corte (PUT)
        Route::put('/cabecera-cortes/{id}/inactive', [CabeceraCorteController::class, 'destroy']); // Marcar una cabecera de corte como inactiva
        Route::put('/cortes/{cabecera_corte_id}/close', [CabeceraCorteController::class, 'closeCorte']); // Marcar un contrato como cerrado

        Route::get('/detalle-cortes', [DetalleCorteController::class, 'index']); // Listar todos los detalles de corte
        Route::get('/detalle-cortes/valor-troza-all', [DetalleCorteController::class, 'valorTrozaAll']);
        Route::get('/detalle-cortes/distinct/{cabecera_corte_id}', [DetalleCorteController::class, 'distinctBosqueSiembByCab']);
        Route::get('/detalle-cortes/{cabecera_corte_id}', [DetalleCorteController::class, 'show']); // Ver un detalle de corte por ID
        Route::get('detalle-cortes/count/{cabecera_corte_id}', [DetalleCorteController::class, 'count']); // Contar detalles de corte por cabecera
        Route::get('detalle-cortes/venta/{dataYear}', [DetalleCorteController::class, 'reporteAcumulado']); 
        Route::post('/detalle-cortes', [DetalleCorteController::class, 'store']); // Crear un detalle de corte
        Route::post('/detalle-cortes/excel', [DetalleCorteController::class, 'uploadExcel']); // Subir detalles de corte desde Excel
        Route::put('/detalle-cortes/{id}', [DetalleCorteController::class, 'update']); // Actualizar un detalle de corte (PUT)
        Route::put('/detalle-cortes/{id}/inactive', [DetalleCorteController::class, 'destroy']); // Marcar un detalle de corte como inactivo

        Route::get('/clientes', [ClienteController::class, 'index']); // Listar todos los clientes
        Route::get('/clientes/{id}', [ClienteController::class, 'show']); // Ver un cliente por ID


        Route::get('siembra-rebrote/sum-hectarea/{bosque}', [SiembraRebroteController::class, 'sumHectarea']);
        Route::get('/siembra-rebrotes', [SiembraRebroteController::class, 'index']); // Listar todas las siembras/rebrotes
        Route::get('/siembra-rebrotes/{id}', [SiembraRebroteController::class, 'show']); // Ver una siembra/rebrote por ID
        Route::get('siembra-rebrote/count-by-bosque/{id}', function ($id) {
            return response()->json(\App\Models\SiembraRebrote::where('bosque_id', $id)->count());
        });
        Route::post('/siembra-rebrotes', [SiembraRebroteController::class, 'store']); // Crear una siembra/rebrote  
        Route::put('/siembra-rebrotes/{id}', [SiembraRebroteController::class, 'update']); // Actualizar una siembra/rebrote (PUT)
        Route::put('/siembra-rebrotes/{id}/inactive', [SiembraRebroteController::class, 'destroy']); // Marcar una siembra/rebrote como inactiva

        Route::get('/contratos/saldos', [ContratoController::class, 'saldosAll']);
        Route::get('/contratos/valor-troza', [ContratoController::class, 'valorTrozaAll']);
        Route::get('/contratos', [ContratoController::class, 'index']); // Listar todos los contratos
        Route::get('/contratos/{id}', [ContratoController::class, 'show']); // Ver un contrato por ID
        Route::post('/contratos', [ContratoController::class, 'store']); // Crear un contrato
        Route::put('/contratos/{id}', [ContratoController::class, 'update']); // Actualizar un contrato (PUT)
        Route::put('/contratos/{id}/inactive', [ContratoController::class, 'destroy']); // Marcar un contrato como inactivo
        Route::get('corte/count-by-contrato/{id}', function ($id) {
            return response()->json(\App\Models\CabeceraCorte::where('contrato_id', $id)->count());
        });
        Route::put('/contratos/{id}/close', [ContratoController::class, 'closeAgreement']); // Marcar un contrato como cerrado

        Route::get('/detalle-contratos', [DetalleContratoController::class, 'index']); // Listar todos los detalles de contrato
        Route::get('/detalle-contratos/{contrato_id}', [DetalleContratoController::class, 'show']); // Ver un detalle de contrato por ID
        Route::post('/detalle-contratos', [DetalleContratoController::class, 'store']); // Crear un detalle de contrato
        Route::put('/detalle-contratos/{id}', [DetalleContratoController::class, 'update']); // Actualizar un detalle de contrato (PUT)
        Route::put('/detalle-contratos/{id}/inactive', [DetalleContratoController::class, 'destroy']); // Marcar un detalle de contrato como inactivo

        Route::get('/anticipos', [AnticipoController::class, 'index']); // Listar todos los anticipos
        Route::get('/anticipos/ultimos', [AnticipoController::class, 'ultimosPorContrato']);
        Route::get('/anticipos/totales', [AnticipoController::class, 'totalesPorContrato']);
        Route::get('/anticipos/ultimo/{contratoId}', [AnticipoController::class, 'ultimoPorContrato']);
        Route::get('/anticipos/{id}', [AnticipoController::class, 'show']); // Ver un anticipo por ID
        Route::post('/anticipos/{id}', [AnticipoController::class, 'store']); // Crear un anticipo
        Route::put('/anticipos/{id}', [AnticipoController::class, 'update']); // Actualizar un anticipo (PUT)
        Route::put('/anticipos/{id}/inactive', [AnticipoController::class, 'destroy']); // Marcar un anticipo como inactivo

        Route::get('/parametros', [ParametroController::class, 'index']); // Listar todos los parámetros
        Route::get('/parametros/{id}', [ParametroController::class, 'show']); // Ver un parámetro por ID
        Route::post('/parametros', [ParametroController::class, 'store']); // Crear un parámetro
        Route::put('/parametros/{id}', [ParametroController::class, 'update']); // Actualizar un parámetro (PUT)
        Route::put('/parametros/{id}/inactive', [ParametroController::class, 'destroy']); // Marcar un parámetro como inactivo
        Route::get('/parametros/categoria/{categoria}', [ParametroController::class, 'getByCategoria']); // Obtener parámetros por categoría
        Route::get('/parametros/raleo/{categoria}', [ParametroController::class, 'getByRaleo']);

    }
);

// Route::middleware('auth:sanctum')->get('/user', function (Request $request) {
//     return $request->user();
// });
// Route::get('/prueba', function(){
//     return response()->json(['mensaje' => 'funciona']);
// });
// Route::group([
//     'middleware' => 'api',
//     'prefix' => 'auth'], function (){
//     Route::post('/login', [AuthController::class, 'login']);
//     Route::post('/logout', [AuthController::class, 'logout']);
//     Route::post('/bosques', [BosqueController::class, 'store']); // Crear un bosque

// });
