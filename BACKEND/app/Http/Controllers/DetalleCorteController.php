<?php

namespace App\Http\Controllers;

use App\Models\CabeceraCorte;
use Illuminate\Http\Request;
use App\Models\DetalleCorte;
use App\Models\DetalleContrato;
use Illuminate\Support\Facades\DB;

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
        $creados  = [];

        $cabeceraIds = array_column($detalles, 'cabecera_corte_id');
        $mapeoContrato = CabeceraCorte::whereIn('id', $cabeceraIds)
            ->pluck('contrato_id', 'id');

        foreach ($detalles as $det) {
            $cabeceraId = $det['cabecera_corte_id'];
            $contratoId = $mapeoContrato[$cabeceraId] ?? null;

            if (! $contratoId) {
                return response()->json([
                    'message' => "Cabecera_corte $cabeceraId no existe o no tiene contrato asociado"
                ], 422);
            }

            // Calcula valores derivados
            $circNeta     = $det['circ_bruta'] - 2;
            $largoNeto    = $det['largo_bruto'] - 0.05;
            $volM3_raw = (($circNeta * $circNeta  * $largoNeto) / 16) / 10000;
            $volM3        = (float) number_format($volM3_raw, 4, '.', '');

            // 2) Buscar el detalle de contrato activo con misma circunferencia
            $detContrato = DetalleContrato::where('contrato_id', $contratoId)
                ->where('circunferencia', $circNeta)
                ->where('estado', 'A')
                ->first();
            if (! $detContrato) {
                return response()->json([
                    'message' => "No existe detalle de contrato activo para contrato $contratoId y circunferencia neta {$circNeta}"
                ], 422);
            }

            // 3) Tomar el precio del contrato
            $precioM3 = $detContrato->precioM3;

            // $valorM3      = (float) number_format($volM3 * 50, 2, '.', '');;
            $valorTroza = (float) number_format($precioM3 * $volM3, 2, '.', '');

            $creados[] = DetalleCorte::create([
                'cabecera_corte_id' => $det['cabecera_corte_id'],
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

        $counts = [];
        foreach ($cabeceraIds as $cabId) {
            $cnt = DetalleCorte::where('cabecera_corte_id', $cabId)->count();
            CabeceraCorte::where('id', $cabId)->update(['cant_arboles' => $cnt]);
            $counts[$cabId] = $cnt;
        }

        return response()->json([
            'created' => $creados,
            'counts' => $counts
        ], 201);
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
