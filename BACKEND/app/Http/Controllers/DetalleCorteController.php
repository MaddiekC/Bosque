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

    public function distinctBosqueSiembByCab(int $cabecera_corte_id)
    {
        return DetalleCorte::where('cabecera_corte_id', $cabecera_corte_id)
            ->select('bosque_id', 'siembra_rebrote_id')
            ->distinct()
            ->get();
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
            'detalles.*.bosque_id' => 'required|integer|min:1',
            'detalles.*.siembra_rebrote_id' => 'nullable|integer|min:1',
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
        // $requestedPerSiembraBosque = [];
        // foreach ($requestedPerCabecera as $cabId => $qty) {
        //     $cab = $cabeceras[$cabId];
        //     if (!$cab->siembra_rebrote_id) continue; // si no hay siembra (ej. basureo), no validar contra siembra
        //     $key = $cab->siembra_rebrote_id . ':' . $cab->bosque_id;
        //     $requestedPerSiembraBosque[$key] = ($requestedPerSiembraBosque[$key] ?? 0) + $qty;
        // }
        $requestedPerSiembraBosque = [];
        foreach ($detalles as $d => $qty) {
            $sid = isset($d['siembra_rebrote_id']) && $d['siembra_rebrote_id'] !== null ? (int)$d['siembra_rebrote_id'] : null;
            $bid = isset($d['bosque_id']) ? (int)$d['bosque_id'] : null;

            // si no hay siembra, ignoramos 
            if (!$sid) continue;

            $key = $sid . ':' . $bid;
            $requestedPerSiembraBosque[$key] = ($requestedPerSiembraBosque[$key] ?? 0) + $qty;
        }

        // -------------------------------------------------
        // VALIDACIÓN ADICIONAL: no permitir si (existingValor + nuevoValor) > anticipo del contrato
        // -------------------------------------------------

        // 1) calcular el valor a agregar por contrato (simulando los cálculos)
        $valorToAddPerContrato = []; // [contratoId => sumValorAAgregar]
        foreach ($detalles as $det) {
            $cabId = (int)$det['cabecera_corte_id'];
            $cab = $cabeceras[$cabId] ?? null;
            if (!$cab) {
                return response()->json(['message' => "Cabecera_corte {$cabId} no encontrada"], 422);
            }
            $contratoId = $cab->contrato_id;
            if (! $contratoId) {
                return response()->json(['message' => "Cabecera_corte {$cabId} no tiene contrato asociado"], 422);
            }

            // reproducir cálculos (igual que harás cuando insertes)
            $circNeta     = $det['circ_bruta'] - 2;
            $largoNeto    = $det['largo_bruto'] - 0.05;
            $volM3_raw = (($circNeta * $circNeta  * $largoNeto) / 16) / 10000;
            $volM3        = (float) number_format($volM3_raw, 4, '.', '');

            // obtener detalle contrato (precio) - necesario para pre-calcular valorTroza
            $detContrato = DetalleContrato::where('contrato_id', $contratoId)
                ->where('circunferencia', $circNeta)
                //->where('largo', $det['largo_bruto'])
                ->where('estado', 'A')
                ->first();
            if (! $detContrato) {
                return response()->json([
                    //'message' => "Este contrato no tiene la circunferencia neta {$circNeta} o largo {$det['largo_bruto']} en sus detalles"
                    'message' => "Este contrato no tiene la circunferencia neta {$circNeta} en sus detalles"
                ], 422);
            }
            $precioM3 = $detContrato->precioM3;
            $valorTroza = (float) number_format($precioM3 * $volM3, 2, '.', '');

            $valorToAddPerContrato[$contratoId] = ($valorToAddPerContrato[$contratoId] ?? 0) + $valorTroza;
        }

        // 2) recuperar existingValor (sum valor_troza) por contrato para detalles activos
        $existingValorPerContrato = DB::table('detalle_corte as det')
            ->join('cabecera_corte as cab', 'det.cabecera_corte_id', '=', 'cab.id')
            ->whereIn('cab.id', $cabeceraIds) // limitar a cabeceras que nos interesan (optimiza)
            ->where('det.estado', 'A')
            ->select('cab.contrato_id', DB::raw('COALESCE(SUM(det.valor_troza),0) as total_valor'))
            ->groupBy('cab.contrato_id')
            ->pluck('total_valor', 'contrato_id')
            ->toArray();

        // 3) obtener total anticipo por contrato (ajusta el modelo/nombre de campo según tu app)
        $contratoIds = array_values(array_unique(array_column($cabeceras->toArray(), 'contrato_id')));
        $totalAnticipoPerContrato = DB::table('anticipo')
            ->whereIn('contrato_id', $contratoIds)
            ->where('estado', 'A') // si aplicable
            ->select('contrato_id', DB::raw('COALESCE(SUM(cantidad),0) as total_anticipo'))
            ->groupBy('contrato_id')
            ->pluck('total_anticipo', 'contrato_id')
            ->toArray();

        // 4) validar por contrato
        $anticipoErrors = [];
        foreach ($valorToAddPerContrato as $contratoId => $toAdd) {
            $existing = isset($existingValorPerContrato[$contratoId]) ? (float)$existingValorPerContrato[$contratoId] : 0.0;
            $anticipo = isset($totalAnticipoPerContrato[$contratoId]) ? (float)$totalAnticipoPerContrato[$contratoId] : 0.0;
            if (($existing + $toAdd) > $anticipo) {
                $anticipoErrors[] = "ValorTroza excede anticipo para contrato {$contratoId}. Anticipo: {$anticipo}, existente: {$existing}, solicitado: {$toAdd}";
            }
        }
        if (!empty($anticipoErrors)) {
            return response()->json(['message' => implode(' | ', $anticipoErrors)], 422);
        }
        // -------------------------------------------------
        // (Si pasa la validación de anticipo, seguimos con tu transacción habitual)
        // -------------------------------------------------

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
                        'bosque_id'         => $det['bosque_id'],
                        'siembra_rebrote_id' => $det['siembra_rebrote_id'],
                        'trozas'            => $det['trozas'],
                        'circ_bruta'        => $det['circ_bruta'],
                        'circ_neta'         => $circNeta,
                        'largo_bruto'       => $det['largo_bruto'],
                        'largo_neto'        => $largoNeto,
                        'm_cubica'          => $volM3,
                        'valor_mcubico'     => $precioM3,
                        'valor_troza'       => $valorTroza,
                        'bosque_id'         => $det['bosque_id'],
                        'siembra_rebrote_id' => $det['siembra_rebrote_id'],
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
                    $cabecerasParaDiff = DetalleCorte::whereIn('cabecera_corte_id', array_keys($diffs))
                        ->select('id', 'cabecera_corte_id', 'siembra_rebrote_id', 'bosque_id')
                        ->get();

                    $grouped = [];
                    foreach ($cabecerasParaDiff as $c) {
                        $cabId = $c->cabecera_corte_id;
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
                        $siembra->saldo = (int)($siembra->arb_iniciales ?? 0) - ((int)$siembra->arb_cortados + (int)$siembra->arb_raleados + (int)$siembra->arb_muertNat);
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

    public function uploadExcel(Request $request)
    {
        $request->validate([
            'file' => 'required|file|mimes:xlsx,xls,csv|max:51200',
            'cabecera_corte_id' => 'required|integer|exists:cabecera_corte,id',
            'bosque_id' => 'required|integer|exists:bosque,id',
            'siembra_rebrote_id' => 'required|integer|exists:siembra_rebrote,id',
        ]);

        $cabecera = CabeceraCorte::find($request->cabecera_corte_id);
        $bosqueId = $request->bosque_id;
        $siembraId = $request->siembra_rebrote_id;

        $existingCount = (int) DetalleCorte::where('cabecera_corte_id', $cabecera->id)
            ->where('estado', 'A')
            ->count();

        // Leemos el archivo Excel
        $filePath = $request->file('file')->getRealPath();
        $spreadsheet = \PhpOffice\PhpSpreadsheet\IOFactory::load($filePath);
        $sheet = $spreadsheet->getActiveSheet();
        $rows = $sheet->toArray(null, true, true, true);

        // Mapeo dinámico según tus columnas
        // (Asumiendo que la primera fila es encabezado)
        $headers = array_map('strtolower', $rows[1]);
        unset($rows[1]); // quitar encabezado

        $summary = [
            'creados' => 0,
            'skipped' => 0,
            'errors' => []
        ];

        DB::beginTransaction();
        try {
            foreach ($rows as $row) {
                if (empty($row['A']) || !is_numeric($row['A'])) continue;

                // normaliza/convierte los valores como necesites
                $trozas = (int) ($row['A'] ?? 0);
                $circ_bruta = $row['B'] ?? 0;
                $circ_neta = $row['C'] ?? 0;
                $largo_bruto = $row['D'] ?? 0;
                $largo_neto = $row['E'] ?? 0;
                $m3 = $row['F'] ?? 0;
                $valor_mcubico = $row['G'] ?? 0;
                $valor_troza = $row['H'] ?? 0;

                // comprueba si ya existe un detalle idéntico (ajusta campos de comparación)
                $exists = DetalleCorte::where('cabecera_corte_id', $cabecera->id)
                    ->where('bosque_id', $bosqueId)
                    ->where('siembra_rebrote_id', $siembraId)
                    ->where('trozas', $trozas)
                    ->where('circ_bruta', $circ_bruta)
                    ->where('circ_neta', $circ_neta)
                    ->where('largo_bruto', $largo_bruto)
                    ->where('largo_neto', $largo_neto)
                    ->where('m_cubica', $m3)
                    ->where('valor_mcubico', $valor_mcubico)
                    ->where('valor_troza', $valor_troza)
                    ->where('estado', 'A')
                    ->exists();

                if ($exists) {
                    // opcional: acumular en resumen de duplicados
                    $summary['skipped_duplicates'] = ($summary['skipped_duplicates'] ?? 0) + 1;
                    throw new \RuntimeException("No se puede insertar detalles duplicados.");
                    //continue;
                }

                // si no existe, crear el detalle
                DetalleCorte::create([
                    'cabecera_corte_id' => $cabecera->id,
                    'bosque_id' => $bosqueId,
                    'siembra_rebrote_id' => $siembraId,
                    'trozas' => $trozas,
                    'circ_bruta' => $circ_bruta,
                    'circ_neta' => $circ_neta,
                    'largo_bruto' => $largo_bruto,
                    'largo_neto' => $largo_neto,
                    'm_cubica' => $m3,
                    'valor_mcubico' => $valor_mcubico,
                    'valor_troza' => $valor_troza,
                    'estado' => 'A',
                ]);
            }

            // --------- recalculos usando COUNT en vez de SUM ----------
            $newCount = (int) DetalleCorte::where('cabecera_corte_id', $cabecera->id)
                ->where('estado', 'A')
                ->count();

            // actualizar campo cant_arboles en la cabecera usando COUNT (número de filas/records)
            $cabecera->cant_arboles = $newCount;
            $cabecera->save();

            // calcular diff (por cantidad de filas agregadas)
            $diff = $newCount - $existingCount;

            if ($diff > 0 && $siembraId) {
                $siembra = SiembraRebrote::where('id', (int)$siembraId)
                    ->where('bosque_id', (int)$bosqueId)
                    ->lockForUpdate()
                    ->first();
                if ($siembra) {
                    // actualizar arb_cortados sumando el número de filas agregadas
                    $siembra->arb_cortados = (int)($siembra->arb_cortados ?? 0) + $diff;
                    // recalcular saldo: arb_iniciales - (arb_cortados + arb_raleados + arb_muertNat)
                    $siembra->saldo = (int)($siembra->arb_iniciales ?? 0)
                        - ((int)$siembra->arb_cortados + (int)($siembra->arb_raleados ?? 0) + (int)($siembra->arb_muertNat ?? 0));
                    $siembra->save();
                }
            }

            DB::commit();

            return response()->json([
                'message' => 'Detalles importados correctamente',
                'cabecera_id' => $cabecera->id,
                'existing_count' => $existingCount,
                'new_count' => $newCount,
                'added_rows' => max(0, $diff),
                'summary' => $summary
            ], 200);
        } catch (\RuntimeException $e) {
            // errores esperados de validación/negocio -> 422
            return response()->json(['message' => $e->getMessage()], 422);
        } catch (\Throwable $th) {
            DB::rollBack();
            return response()->json(['error' => $th->getMessage(), 'summary' => $summary], 500);
        }
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
            'valor_troza' => 'nullable|numeric|min:0',
            'bosque_id' => 'required|integer|min:1',
            'siembra_rebrote_id' => 'nullable|integer|min:1'
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
            'valor_troza',
            'bosque_id',
            'siembra_rebrote_id'
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


    public function reporteAcumulado($dateYear)
    {
        // Query: sumar por numero_envio + contenedor (+ bosque si quieres)
        $rows = DetalleCorte::from('detalle_corte as d')
            ->join('cabecera_corte as c', 'd.cabecera_corte_id', '=', 'c.id')
            ->leftJoin('bosque as b', 'd.bosque_id', 'b.id')
            ->whereYear('c.fecha_embarque', $dateYear)
            ->where('d.estado', 'A')
            ->select(
                'c.id as cabecera_id',
                'c.numero_envio',
                'c.fecha_embarque',
                'c.contenedor',
                'b.nombre as bosque_nombre',
                DB::raw('COUNT(d.trozas) as total_trozas'),
                DB::raw('SUM(d.m_cubica) as total_m3'),
                DB::raw('SUM(d.valor_troza) as total_valor')
            )
            ->groupBy('c.id', 'c.numero_envio', 'c.fecha_embarque', 'c.contenedor', 'd.bosque_id', 'b.nombre')
            ->orderBy('c.numero_envio', 'asc')
            ->get();

        // Reorganizar en estructura: por envio -> items (contenedor ...)
        $grouped = [];
        foreach ($rows as $r) {
            $key = $r->numero_envio . '||' . $r->fecha_embarque; // llave compuesta (puedes usar c.id si prefieres)
            if (!isset($grouped[$key])) {
                $grouped[$key] = [
                    'numero_envio'  => $r->numero_envio,
                    'fecha_embarque' => $r->fecha_embarque,
                    'cabecera_id' => $r->cabecera_id,
                    'items' => [],
                    // opcional: subtotal por envío
                    'subtotal_trozas' => 0,
                    'subtotal_m3'     => 0.0,
                    'subtotal_valor'  => 0.0,
                ];
            }
            $totalTrozas = (int) $r->total_trozas;
            $totalM3    = (float) $r->total_m3;
            $totalValor = (float) $r->total_valor;

            $grouped[$key]['items'][] = [
                'contenedor'    => $r->contenedor,
                'bosque_nombre'     => $r->bosque_nombre,
                'total_trozas' => $totalTrozas,
                'total_m3'      => $totalM3,
                'total_valor'   => $totalValor
            ];
            // acumular subtotales por envío
            $grouped[$key]['subtotal_trozas'] += $totalTrozas;
            $grouped[$key]['subtotal_m3']     += $totalM3;
            $grouped[$key]['subtotal_valor']  += $totalValor;
        }

        // Reindexar a array (sin llaves compuestas)
        $result = array_values($grouped);

        $uniqueContainers = collect($rows)
            ->pluck('contenedor')          // extrae todos los valores de contenedor
            ->map(fn($c) => trim((string)$c)) // normaliza a string
            ->filter()                     // elimina vacíos
            ->unique()
            ->values();

        $totalesGenerales = [
            'total_trozas' => array_sum(array_map(fn($e) => (int)$e['subtotal_trozas'], $result)),
            'total_m3'     => array_sum(array_map(fn($e) => (float)$e['subtotal_m3'], $result)),
            'total_valor'  => array_sum(array_map(fn($e) => (float)$e['subtotal_valor'], $result)),
            'total_contenedor' => $uniqueContainers->count()
        ];

        return response()->json([
            'envios' => $result,
            'totales' => $totalesGenerales
        ]);
    }
}
