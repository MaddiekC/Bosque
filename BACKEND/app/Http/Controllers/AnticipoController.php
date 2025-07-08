<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Anticipo;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\DB;

class AnticipoController extends Controller
{
    public function index()
    {
        $anticipos = Anticipo::with(['contrato'])->where('estado', 'A')->get();
        return response()->json($anticipos);
    }

    public function show($id)
    {
        $anticipo = Anticipo::with('contrato')
            ->where('contrato_id', $id)
            ->where('estado', 'A')
            ->orderBy('fecha', 'desc')
            ->get();
        if ($anticipo->isEmpty()) {
            return response()->json(['message' => 'Anticipo no encontrado'], 404);
        }

        return response()->json($anticipo);
    }

    public function store(Request $request, $contratoId)
    {
        $validator = Validator::make($request->all(), [
            'factura' => 'required|string|max:255',
            'fecha' => 'required|date',
            'cantidad' => 'required|numeric|min:1',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = $request->user();
        $anticipo = Anticipo::create([
            'contrato_id' => $contratoId,
            'factura' => $request->factura,
            'fecha' => $request->fecha,
            'cantidad' => $request->cantidad,
            'usuario_creacion' => $user->username,
            'estado' => 'A',
        ]);

        return response()->json($anticipo, 201);
    }

    public function update(Request $request, $id)
    {
        $anticipo = Anticipo::find($id);
        if (!$anticipo || $anticipo->estado !== 'A') {
            return response()->json(['message' => 'Anticipo no encontrado'], 404);
        }

        $validator = Validator::make($request->all(), [
            'contrato_id' => 'sometimes|required|integer|exists:contrato,id',
            'factura' => 'sometimes|required|string|max:255',
            'fecha' => 'sometimes|required|date',
            'cantidad' => 'sometimes|required|numeric',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $anticipo->update($request->all());
        return response()->json($anticipo);
    }

    public function destroy($id)
    {
        $anticipo = Anticipo::find($id);
        if (!$anticipo || $anticipo->estado !== 'A') {
            return response()->json(['message' => 'Anticipo no encontrado'], 404);
        }

        $anticipo->estado = 'I'; // Cambiar estado a Inactivo
        $anticipo->save();

        return response()->json(['message' => 'Anticipo eliminado correctamente']);
    }

    public function ultimosPorContrato()
    {
        // agarramos el último anticipo por cada contrato activo
        $rows = Anticipo::select('contrato_id', DB::raw('MAX(fecha) as ultima_fecha'))
            ->where('estado', 'A')
            ->groupBy('contrato_id')
            ->get();

        $result = [];
        foreach ($rows as $r) {
            // busca el anticipo con esa fecha máxima
            $a = Anticipo::where('contrato_id', $r->contrato_id)
                ->where('fecha', $r->ultima_fecha)
                ->first();
            $result[$r->contrato_id] = $a->cantidad;
        }
        return response()->json($result);
    }

    public function ultimoPorContrato($contratoId)
    {
        $ultimo = Anticipo::where('contrato_id', $contratoId)
            ->where('estado', 'A')
            ->orderByDesc('fecha')
            ->first();

        return response()->json($ultimo ?: []);
    }
}
