<?php

namespace App\Http\Controllers;

use Illuminate\Support\Facades\DB;
use Illuminate\Http\Request;
use App\Models\CabeceraCorte;
use App\Models\SiembraRebrote;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class CabeceraCorteController extends Controller
{
    // public function index()
    // {
    //     $cabeceraCortes = CabeceraCorte::with(['bosque', 'contrato.cliente', 'siembraRebrote', 'raleoTipo'])
    //         ->withCount('detalleCortes')
    //         ->whereIn('estado', ['A', 'C'])
    //         ->orderByDesc('created_at')  
    //         ->get();
    //     return response()->json($cabeceraCortes);
    // }

    public function index()
    {
        // 1) Carga principal (igual que antes)
        $cabeceraCortes = CabeceraCorte::with(['bosque', 'contrato.cliente', 'siembraRebrote', 'raleoTipo'])
            ->withCount('detalleCortes')
            ->whereIn('estado', ['A', 'C'])
            ->orderByDesc('created_at')
            ->get();

        if ($cabeceraCortes->isEmpty()) {
            return response()->json($cabeceraCortes);
        }

        // 2) Recolectar ids para una sola consulta a detalle_corte
        $cabIds = $cabeceraCortes->pluck('id')->all();

        // 3) Obtener pares únicos por cabecera (evita N+1). Filtramos nulos para mayor limpieza.
        $pares = DB::table('detalle_corte as d')
            ->select('d.cabecera_corte_id', 'd.bosque_id', 'd.siembra_rebrote_id')
            ->whereIn('d.cabecera_corte_id', $cabIds)
            ->whereNotNull('d.bosque_id')
            ->whereNotNull('d.siembra_rebrote_id')
            ->groupBy('d.cabecera_corte_id', 'd.bosque_id', 'd.siembra_rebrote_id')
            ->get()
            ->groupBy('cabecera_corte_id'); // key = cabecera id -> colección de filas

        // 4) Adjuntar al resultado
        $cabeceraCortes->transform(function ($cab) use ($pares) {
            $id = $cab->id;

            if (isset($pares[$id]) && ($cab->bosque_id === null || $cab->siembra_rebrote_id === null)) {
                // Recolectamos todos los bosque_id y siembra_rebrote_id distintos
                $cab->bosque_id = $pares[$id]->pluck('bosque_id')->unique()->values()->all();
                $cab->siembra_rebrote_id = $pares[$id]->pluck('siembra_rebrote_id')->unique()->values()->all();
            }

            return $cab;
        });
        return response()->json($cabeceraCortes);
    }

    public function show($id)
    {
        $cabeceraCorte = CabeceraCorte::with(['bosque', 'contrato', 'siembraRebrote', 'raleoTipo'])
            ->find($id);

        if (!$cabeceraCorte) {
            return response()->json(['message' => 'Cabecera de corte no encontrada'], 404);
        }

        // devolver la cabecera independientemente del estado (A, C, etc.)
        return response()->json($cabeceraCorte, 200);
    }

    public function getContrato($contrato_id)
    {
        $cabeceraCorte = CabeceraCorte::with(['bosque', 'siembraRebrote', 'raleoTipo'])
            ->where('contrato_id', $contrato_id)
            ->where('estado', 'A') // opcional: solo activas
            ->orderBy('fecha_embarque', 'desc')
            ->get();
        if ($cabeceraCorte->isEmpty()) {
            return response()->json([], 200);
        }
        return response()->json($cabeceraCorte);
    }

    public function store(Request $request)
    { {
            $validator = Validator::make($request->all(), [
                'bosque_id' => 'nullable|integer|exists:bosque,id',
                //'contrato_id' => 'required|integer|exists:contrato,id',
                'raleo_tipo_id' => 'required|integer|exists:parametro,id',
                'siembra_rebrote_id' => 'nullable|integer|exists:siembra_rebrote,id',
                //'sello_id' => 'required|integer|exists:parametro,id',
                'fecha_embarque' => 'required|date',
                //'cant_arboles' => 'nullable|integer|min:0',
                'numero_viaje' => 'nullable|integer|min:1',
                'numero_envio' => 'nullable|integer|min:1',
                'placa_carro' => 'nullable|string|max:50',
                'contenedor' => 'nullable|string|max:50',
                'naviera' => 'nullable|string|max:200',
                'supervisor' => 'nullable|string|max:200',
                'sello_empresa' => 'nullable|string|max:200',
                'sello_rastreo' => 'nullable|string|max:200',
                'sello_inspeccion' => 'nullable|string|max:200'
            ]);

            if ($validator->fails()) {
                return response()->json(['errors' => $validator->errors()], 422);
            }

            $user = $request->user();

            // usamos transacción para validar y crear de forma atómica
            try {
                $result = DB::transaction(function () use ($request, $user) {
                    $siembraId = $request->siembra_rebrote_id;
                    $bosqueId = $request->bosque_id;
                    $cantArboles = (int) ($request->cant_arboles ?? 0);

                    if ($siembraId) {
                        // bloqueamos la fila de siembra para evitar race conditions
                        $siembra = SiembraRebrote::where('id', $siembraId)
                            ->where('bosque_id', $bosqueId)
                            ->lockForUpdate()
                            ->first();

                        if (! $siembra) {
                            return response()->json(['errors' => ['siembra_rebrote_id' => ['Siembra/Rebrote no encontrada para ese bosque.']]], 422);
                        }

                        // disponible = arb_iniciales - arb_cortados
                        $available = (int)($siembra->arb_iniciales ?? 0) - (int)($siembra->arb_cortados ?? 0);
                        if ($cantArboles > $available) {
                            return response()->json(['errors' => ['cant_arboles' => ["La cantidad de árboles ({$cantArboles}) excede el saldo disponible ({$available})."]]], 422);
                        }
                    }

                    $cabeceraCorte = CabeceraCorte::create([
                        'bosque_id' => $request->bosque_id,
                        'contrato_id'  => $request->contrato_id,
                        'raleo_tipo_id' => $request->raleo_tipo_id,
                        'siembra_rebrote_id' => $request->siembra_rebrote_id,
                        //'sello_id' => $request->sello_id,
                        'fecha_embarque' => $request->fecha_embarque,
                        'cant_arboles'  => $request->cant_arboles,
                        'numero_viaje'  => $request->numero_viaje,
                        'numero_envio'  => $request->numero_envio,
                        'placa_carro'   => $request->placa_carro,
                        'contenedor' => $request->contenedor,
                        'naviera' => $request->naviera,
                        'supervisor' => $request->supervisor,
                        'sello_empresa' => $request->sello_empresa,
                        'sello_rastreo' => $request->sello_rastreo,
                        'sello_inspeccion' => $request->sello_inspeccion,
                        'usuario_creacion' => $user->username,
                        'estado' => 'A',
                    ]);

                    // si hay siembra, incrementamos arb_cortados en la siembra (diferencia = cantArboles)
                    if ($siembraId && $cabeceraCorte->cant_arboles) {
                        $siembra->arb_cortados = (int)$siembra->arb_cortados + (int)$cabeceraCorte->cant_arboles;
                        $siembra->saldo = (int)($siembra->arb_iniciales ?? 0) - (int)$siembra->arb_cortados;
                        $siembra->save();
                    }

                    return $cabeceraCorte;
                }, 5); // reintenta transacción hasta 5 veces en caso de deadlock

                // Si la transacción devolvió una respuesta de error (422), la retornamos
                if ($result instanceof \Illuminate\Http\JsonResponse) {
                    return $result;
                }

                return response()->json($result, 201);
            } catch (\Throwable $e) {
                Log::error('Error creando cabecera corte: ' . $e->getMessage());
                return response()->json(['message' => 'Error interno al crear cabecera'], 500);
            }
        }
    }

    public function update(Request $request, $id)
    {
        $cabeceraCorte = CabeceraCorte::find($id);
        if (!$cabeceraCorte || $cabeceraCorte->estado !== 'A') {
            return response()->json(['message' => 'Cabecera de corte no encontrada'], 404);
        }
        if ($cabeceraCorte->estado !== 'A') {
            return response()->json(['message' => 'No se puede editar una cabecera inactiva/cerrada'], 422);
        }

        $validator = Validator::make($request->all(), [
            'bosque_id' => 'nullable|integer|exists:bosque,id',
            'contrato_id' => 'nullable|integer|exists:contrato,id',
            'raleo_tipo_id' => 'required|integer|exists:parametro,id',
            'siembra_rebrote_id' => 'nullable|integer|exists:siembra_rebrote,id',
            //'sello_id' => 'required|integer|exists:parametro,id',
            'fecha_embarque' => 'required|date',
            //'cant_arboles' => 'nullable|integer|min:1',
            'numero_viaje' => 'required|integer|min:1',
            'numero_envio' => 'required|integer|min:1',
            'placa_carro' => 'required|string|max:50',
            'contenedor' => 'required|string|max:50',
            'naviera' => 'nullable|string|max:200',
            'supervisor' => 'required|string|max:200',
            'sello_empresa' => 'nullable|string|max:200',
            'sello_rastreo' => 'nullable|string|max:200',
            'sello_inspeccion' => 'nullable|string|max:200'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }
        $user = $request->user();


        $cabeceraCorte->fill($request->only([
            'bosque_id',
            'contrato_id',
            'raleo_tipo_id',
            'siembra_rebrote_id',
            //'sello_id',
            'fecha_embarque',
            'cant_arboles',
            'numero_viaje',
            'numero_envio',
            'placa_carro',
            'contenedor',
            'naviera',
            'supervisor',
            'sello_empresa',
            'sello_rastreo',
            'sello_inspeccion'
        ]));
        $cabeceraCorte->updated_by = $user->username; // Asignar el usuario que hizo la edición
        $cabeceraCorte->save(); // Guardar cambios

        return response()->json($cabeceraCorte);
    }

    public function destroy($id)
    {
        $cabeceraCorte = CabeceraCorte::find($id);
        if (!$cabeceraCorte || $cabeceraCorte->estado !== 'A') {
            return response()->json(['message' => 'Cabecera de corte no encontrada'], 404);
        }
        $cabeceraCorte->update(['estado' => 'I']);
        return response()->json(['message' => 'Marcado como inactivo']);
    }

    public function closeCorte($cabecera_corte_id)
    {
        $Contrato = CabeceraCorte::find($cabecera_corte_id);
        if (!$Contrato || $Contrato->estado !== 'A') {
            return response()->json(['message' => 'Corte no encontrado'], 404);
        }

        $Contrato->update(['estado' => 'C']);

        return response()->json(['message' => 'Corte cerrado correctamente']);
    }
}
