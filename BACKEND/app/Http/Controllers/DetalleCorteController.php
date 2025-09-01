<?php

namespace App\Http\Controllers;

use App\Models\CabeceraCorte;
use Illuminate\Http\Request;
use App\Models\DetalleCorte;
use App\Models\DetalleContrato;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Log;
use App\Models\SiembraRebrote;

class DetalleCorteController extends Controller
{
    public function index()
    {
        $detallesCorte = DetalleCorte::with('cabeceraCorte')
            ->where('estado', 'A')
            ->get();
        return response()->json($detallesCorte);
    }

    public function show($cabecera_corte_id)
    {
        $detalles = DetalleCorte::with('cabeceraCorte')
            ->where('cabecera_corte_id', $cabecera_corte_id)
            ->where('estado', 'A')
            ->get();

        if ($detalles->isEmpty()) {
            return response()->json(['message' => 'No hay detalles para esta cabecera'], 404);
        }

        return response()->json($detalles);
    }

    public function count($cabecera_corte_id)
    {
        // Obtiene todos los detalles activos para la cabecera
        $detalles = DetalleCorte::with('cabeceraCorte')
            ->where('cabecera_corte_id', $cabecera_corte_id)
            ->where('estado', 'A')
            ->get();

        // Cuenta cuántas trozas ya existen
        $count = $detalles->count();

        // Si no hay detalles, devolvemos mensaje de vacío
        if ($count === 0) {
            return response()->json([
                'detalles' => [],
                'count'    => 0,
                'message'  => 'No hay detalles para esta cabecera'
            ], 200);
        }

        // Devolver tanto los detalles como el conteo
        return response()->json([
            'detalles' => $detalles,
            'count'    => $count
        ], 200);
    }


    public function store(Request $request)
    {
        $request->validate([
            'detalles' => 'required|array|min:1',
            'detalles.*.cabecera_corte_id' => 'required|integer|exists:cabecera_corte,id',
            'detalles.*.trozas'  => 'required|integer|min:1',
            'detalles.*.circ_bruta' => 'required|numeric|min:0',
            'detalles.*.largo_bruto' => 'required|numeric|min:0',
        ]);

        $user     = $request->user();
        $detalles = $request->input('detalles');

        // UNIQUE cabecera ids y suma solicitada por cabecera (pedido)
        $cabeceraIds = array_values(array_unique(array_column($detalles, 'cabecera_corte_id')));
        // CORREGIDO: requested = número de filas enviadas para cada cabecera
        $requestedPerCabecera = [];
        foreach ($detalles as $d) {
            $cid = (int) $d['cabecera_corte_id'];
            $requestedPerCabecera[$cid] = ($requestedPerCabecera[$cid] ?? 0) + 1;
        }


        // --- 0) Conteos existentes por cabecera (antes de insertar)
        $existingCounts = DetalleCorte::whereIn('cabecera_corte_id', $cabeceraIds)
            ->where('estado', 'A')
            ->groupBy('cabecera_corte_id')
            ->selectRaw('cabecera_corte_id, COUNT(*) as cnt')
            ->pluck('cnt', 'cabecera_corte_id')
            ->toArray();

        // 1) obtener cabeceras para mapear siembra_rebrote_id, bosque_id y contrato_id
        $cabeceras = CabeceraCorte::whereIn('id', $cabeceraIds)
            ->select('id', 'siembra_rebrote_id', 'bosque_id', 'contrato_id')
            ->get()
            ->keyBy('id');

        // sanity check: todas las cabeceras solicitadas existen
        foreach ($cabeceraIds as $cid) {
            if (!isset($cabeceras[$cid])) {
                return response()->json(['message' => "Cabecera_corte {$cid} no encontrada"], 422);
            }
        }

        // 2) agrupar pedido por siembra_rebrote_id + bosque_id (solo para cabeceras que tienen siembra)
        $requestedPerSiembraBosque = [];
        foreach ($requestedPerCabecera as $cabId => $qty) {
            $cab = $cabeceras[$cabId];
            if (!$cab->siembra_rebrote_id) continue; // si no hay siembra (ej. basureo), no validar contra siembra
            $key = $cab->siembra_rebrote_id . ':' . $cab->bosque_id;
            $requestedPerSiembraBosque[$key] = ($requestedPerSiembraBosque[$key] ?? 0) + $qty;
        }

        // Ejecutar todo en transacción (validación con lock + inserts + updates)
        try {
            $result = DB::transaction(function () use (
                $requestedPerSiembraBosque,
                $cabeceras,
                $detalles,
                $user,
                $cabeceraIds,
                $existingCounts
            ) {
                // 3) Validar saldos con lockForUpdate() en las siembras
                $errors = [];
                foreach ($requestedPerSiembraBosque as $key => $toAdd) {
                    list($siemId, $bosqueId) = explode(':', $key);
                    $siembra = SiembraRebrote::where('id', (int)$siemId)
                        ->where('bosque_id', (int)$bosqueId)
                        ->lockForUpdate()
                        ->first();

                    if (!$siembra) {
                        $errors[] = "Siembra {$siemId} (bosque {$bosqueId}) no encontrada.";
                        continue;
                    }

                    $available = (int)($siembra->arb_iniciales ?? 0) - (int)($siembra->arb_cortados ?? 0);
                    if ($toAdd > $available) {
                        $errors[] = "La cantidad de árboles: {$toAdd} excede el saldo disponible: {$available}.";
                    }
                }

                if (!empty($errors)) {
                    // lanzar excepción para que la transacción haga rollback y se capture afuera
                    throw new \RuntimeException(implode(' | ', $errors));
                }

                // 4) Insertar detalles (validaciones de circunferencia/contrato como antes)
                $creados = [];
                foreach ($detalles as $det) {
                    $cabeceraId = $det['cabecera_corte_id'];
                    $contratoId = $cabeceras[$cabeceraId]->contrato_id ?? null;

                    if (! $contratoId) {
                        throw new \RuntimeException("Cabecera_corte {$cabeceraId} no tiene contrato asociado");
                    }

                    $circNeta = $det['circ_bruta'] - 2;
                    $largoNeto = $det['largo_bruto'] - 0.05;
                    $volM3_raw = (($circNeta * $circNeta  * $largoNeto) / 16) / 10000;
                    $volM3 = (float) number_format($volM3_raw, 4, '.', '');

                    $detContrato = DetalleContrato::where('contrato_id', $contratoId)
                        ->where('circunferencia', $circNeta)
                        ->where('estado', 'A')
                        ->first();
                    if (! $detContrato) {
                        throw new \RuntimeException("No existe detalle de contrato activo para contrato {$contratoId} y circunferencia neta {$circNeta}");
                    }

                    $precioM3 = $detContrato->precioM3;
                    $valorTroza = (float) number_format($precioM3 * $volM3, 2, '.', '');

                    $creados[] = DetalleCorte::create([
                        'cabecera_corte_id' => $cabeceraId,
                        'trozas'            => $det['trozas'],
                        'circ_bruta'        => $det['circ_bruta'],
                        'circ_neta'         => $circNeta,
                        'largo_bruto'       => $det['largo_bruto'],
                        'largo_neto'        => $largoNeto,
                        'm_cubica'          => $volM3,
                        'valor_mcubico'     => $precioM3,
                        'valor_troza'       => $valorTroza,
                        'usuario_creacion'  => $user->username,
                        'estado'            => 'A',
                    ]);
                }

                // 5) Recalcular counts por cabecera y actualizar CabeceraCorte.cant_arboles (solo detalles activos)
                $counts = [];
                foreach ($cabeceraIds as $cabId) {
                    $cnt = DetalleCorte::where('cabecera_corte_id', $cabId)->where('estado', 'A')->count();
                    CabeceraCorte::where('id', $cabId)->update(['cant_arboles' => $cnt]);
                    $counts[$cabId] = $cnt;
                }

                // 6) Calcular diffs (new - old) y agrupar por siembra:bosque
                $diffs = [];
                foreach ($counts as $cabId => $newCnt) {
                    $oldCnt = isset($existingCounts[$cabId]) ? (int)$existingCounts[$cabId] : 0;
                    $diff = (int)$newCnt - $oldCnt;
                    if ($diff > 0) $diffs[$cabId] = $diff;
                }

                if (!empty($diffs)) {
                    $cabecerasParaDiff = CabeceraCorte::whereIn('id', array_keys($diffs))
                        ->select('id', 'siembra_rebrote_id', 'bosque_id')
                        ->get();

                    $grouped = [];
                    foreach ($cabecerasParaDiff as $c) {
                        $cabId = $c->id;
                        $siemId = $c->siembra_rebrote_id;
                        $bosId = $c->bosque_id;
                        $inc = $diffs[$cabId] ?? 0;
                        if ($inc <= 0 || !$siemId) continue;
                        $key = $siemId . ':' . $bosId;
                        $grouped[$key] = ($grouped[$key] ?? 0) + $inc;
                    }

                    // aplicar incrementos con lock y recalcular saldo
                    foreach ($grouped as $key => $totalAdded) {
                        list($siemId, $bosId) = explode(':', $key);
                        $siembra = SiembraRebrote::where('id', (int)$siemId)
                            ->where('bosque_id', (int)$bosId)
                            ->lockForUpdate()
                            ->first();
                        if (!$siembra) continue;
                        $siembra->arb_cortados = (int)($siembra->arb_cortados ?? 0) + (int)$totalAdded;
                        $siembra->saldo = (int)($siembra->arb_iniciales ?? 0) - (int)$siembra->arb_cortados;
                        $siembra->save();
                    }
                }

                // devolver objeto de éxito dentro de la transacción
                return [
                    'created' => $creados,
                    'counts' => $counts,
                    'diffs' => $diffs
                ];
            }, 5); // reintentos de transacción en caso de deadlock
        } catch (\RuntimeException $e) {
            // errores esperados de validación/negocio -> 422
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\Throwable $e) {
            Log::error('Error en DetalleCorte::store - ' . $e->getMessage());
            return response()->json(['message' => 'Error interno al guardar detalles'], 500);
        }

        return response()->json($result, 201);
    }


    public function update(Request $request, $id)
    {
        $detalleCorte = DetalleCorte::find($id);
        if (!$detalleCorte || $detalleCorte->estado !== 'A') {
            return response()->json(['message' => 'Detalle de corte no encontrado'], 404);
        }

        $user = $request->user();
        $request->validate([
            'cabecera_corte_id' => 'nullable|integer|exists:cabecera_corte,id',
            'trozas' => 'nullable|integer|min:1',
            'circ_bruta' => 'nullable|numeric|min:0',
            'circ_neta' => 'nullable|numeric|min:0',
            'largo_bruto' => 'nullable|numeric|min:0',
            'largo_neto' => 'nullable|numeric|min:0',
            'm_cubica' => 'nullable|numeric|min:0',
            'valor_mcubico' => 'nullable|numeric|min:0',
            'valor_troza' => 'nullable|numeric|min:0'
        ]);

        $detalleCorte->fill($request->only([
            'cabecera_corte_id',
            'trozas',
            'circ_bruta',
            'circ_neta',
            'largo_bruto',
            'largo_neto',
            'm_cubica',
            'valor_mcubico',
            'valor_troza'
        ]));
        $detalleCorte->updated_by = $user->username; // Asignar el usuario que hizo la edición
        $detalleCorte->save(); // Guardar cambios

        return response()->json($detalleCorte);
    }

    public function destroy($id)
    {
        $detalleCorte = DetalleCorte::find($id);
        if (!$detalleCorte || $detalleCorte->estado !== 'A') {
            return response()->json(['message' => 'Detalle de corte no encontrado'], 404);
        }

        $detalleCorte->update(['estado' => 'I']);
        return response()->json(['message' => 'Detalle de corte marcado como inactivo']);
    }

    public function valorTrozaAll()
    {
        // Sumamos valor_troza por cabecera_corte_id para detalles activos
        $rows = DB::table('detalle_corte')
            ->select('cabecera_corte_id', DB::raw('COALESCE(SUM(valor_troza),0) as total'))
            ->where('estado', 'A')
            ->groupBy('cabecera_corte_id')
            ->get();

        // Convertir a map { corteId: total }
        $map = [];
        foreach ($rows as $r) {
            $map[$r->cabecera_corte_id] = (float) $r->total;
        }

        return response()->json($map);
    }
}
