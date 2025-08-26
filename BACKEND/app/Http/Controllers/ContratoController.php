<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Cache;
use Illuminate\Support\Facades\DB;
use App\Models\Contrato;
use App\Models\DetalleCorte;

class ContratoController extends Controller
{
    public function index()
    {
        $Contratos = Contrato::with(['cliente'])
            ->withCount('detalles')
            ->whereIn('estado', ['A', 'C'])
            ->get();
        return response()->json($Contratos);
    }


    public function show($id)
    {
        $Contrato = Contrato::with(['cliente'])
            ->find($id);
        if (!$Contrato) {
            return response()->json(['message' => 'Contrato no encontrado'], 404);
        }

        return response()->json($Contrato, 200);
    }


    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'cliente_id' => 'required|string|size:36',
            'anio' => 'required|integer|min:1000|max:2100',
            'fecha' => 'required|date'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = $request->user();
        $Contrato = Contrato::create([
            'cliente_id' => $request->cliente_id,
            'anio' => $request->anio,
            'fecha' => $request->fecha,
            'usuario_creacion' =>  $user->username,
            'estado' => 'A',
        ]);

        return response()->json($Contrato, 201);
    }

    public function update(Request $request, $id)
    {
        $Contrato = Contrato::find($id);
        if (!$Contrato || $Contrato->estado !== 'A') {
            return response()->json(['message' => 'Contrato no encontrado'], 404);
        }
        $user = $request->user();
        $validator = Validator::make($request->all(), [
            'cliente_id' => 'nullable|string|size:36',
            'anio' => 'nullable|integer|min:2000|max:2100',
            'fecha' => 'nullable|date'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        // Asignar campos válidos
        $Contrato->fill($request->only(['cliente_id', 'anio', 'fecha']));

        // Asignar el usuario que hizo la edición
        $Contrato->updated_by = $user->username;

        // Guardar cambios
        $Contrato->save();


        return response()->json($Contrato);
    }

    public function destroy($id)
    {
        $Contrato = Contrato::find($id);
        if (!$Contrato || $Contrato->estado !== 'A') {
            return response()->json(['message' => 'Contrato no encontrado'], 404);
        }

        $Contrato->update(['estado' => 'I']);

        return response()->json(['message' => 'Marcado como inactivo']);
    }

    public function closeAgreement($id)
    {
        $Contrato = Contrato::find($id);
        if (!$Contrato || $Contrato->estado !== 'A') {
            return response()->json(['message' => 'Contrato no encontrado'], 404);
        }

        $Contrato->update(['estado' => 'C']);

        return response()->json(['message' => 'Contrato cerrado correctamente']);
    }

    public function valorTrozaAll()
    {
        $rows = DB::table('cabecera_corte as cc')
            ->join('detalle_corte as dc', 'dc.cabecera_corte_id', '=', 'cc.id')
            ->where('dc.estado', 'A')    // solo detalles activos (ajusta si necesario)
            ->where('cc.estado', 'A')    // opcional: solo cortes activos
            ->select('cc.contrato_id', DB::raw('SUM(dc.valor_troza) as total'))
            ->groupBy('cc.contrato_id')
            ->get();

        $map = [];
        foreach ($rows as $r) {
            $map[(int)$r->contrato_id] = (float)$r->total;
        }

        return response()->json($map);
    }

    public function saldosAll()
    {
        // Subconsulta para embarcado (valor_troza)
        $embarcadoSub = DB::table('cabecera_corte as cc')
            ->join('detalle_corte as dc', 'dc.cabecera_corte_id', '=', 'cc.id')
            ->where('dc.estado', 'A')
            ->where('cc.estado', 'A')
            ->select('cc.contrato_id', DB::raw('SUM(dc.valor_troza) as embarcado'))
            ->groupBy('cc.contrato_id');

        // Subconsulta para anticipos
        $anticiposSub = DB::table('anticipo as a')
            ->where('a.estado', 'A')
            ->select('a.contrato_id', DB::raw('SUM(a.cantidad) as anticipos'))
            ->groupBy('a.contrato_id');

        // Query principal uniendo subconsultas
        $rows = DB::table('contrato as c')
            ->leftJoinSub($embarcadoSub, 'emb', function ($join) {
                $join->on('c.id', '=', 'emb.contrato_id');
            })
            ->leftJoinSub($anticiposSub, 'ant', function ($join) {
                $join->on('c.id', '=', 'ant.contrato_id');
            })
            ->select(
                'c.id as contrato_id',
                DB::raw('COALESCE(emb.embarcado, 0) as embarcado'),
                DB::raw('COALESCE(ant.anticipos, 0) as anticipos'),
                DB::raw('COALESCE(ant.anticipos, 0) - COALESCE(emb.embarcado, 0)  as saldo')
            )
            ->get();

        // convertir a estructura JSON amigable
        $map = [];
        foreach ($rows as $r) {
            $map[(int)$r->contrato_id] = [
                'embarcado' => (float)$r->embarcado,
                'anticipos' => (float)$r->anticipos,
                'saldo'     => (float)$r->saldo,
            ];
        }

        return response()->json($map);
    }
}
