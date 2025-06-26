<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\DetalleContrato;

class DetalleContratoController extends Controller
{
    public function index()
    {
        $detallesContrato = DetalleContrato::with('contrato')
            ->where('estado', 'A')
            ->get();

        return response()->json($detallesContrato);
    }

    public function show($id)
    {
        $detalleContrato = DetalleContrato::with('contrato')->find($id);
        if (!$detalleContrato || $detalleContrato->estado !== 'A') {
            return response()->json(['message' => 'Detalle de contrato no encontrado'], 404);
        }

        return response()->json($detalleContrato);
    }

    public function store(Request $request)
    {
        $request->validate([
            'contrato_id' => 'required|integer|exists:contrato,id',
            'circuferencia' => 'required|numeric',
            'valor' => 'required|numeric',
            'rango' => 'required|integer|min:1'
        ]);
        $user = $request->user();
        $detalleContrato = DetalleContrato::create([
            (['contrato_id' => $request->contrato_id]),
            'circuferencia' => $request->circuferencia,
            'valor' => $request->valor,
            'rango' => $request->rango,
            'usuario_creacion' =>  $user->username,
            'estado' => 'A',
        ]);

        return response()->json($detalleContrato, 201);
    }

    public function update(Request $request, $id)
    {
        $detalleContrato = DetalleContrato::find($id);
        if (!$detalleContrato || $detalleContrato->estado !== 'A') {
            return response()->json(['message' => 'Detalle de contrato no encontrado'], 404);
        }

        $request->validate([
            'contrato_id' => 'nullable|integer|exists:contrato,id',
            'circuferencia' => 'nullable|numeric',
            'valor' => 'nullable|numeric',
            'rango' => 'nullable||integer|min:1',
            'usuario_creacion' => 'required|string|max:200',
        ]);

        $detalleContrato->update($request->only(['contrato_id', 'circuferencia', 'valor', 'rango', 'usuario_creacion']));

        return response()->json($detalleContrato);
    }

    public function destroy($id)
    {
        $detalleContrato = DetalleContrato::find($id);
        if (!$detalleContrato || $detalleContrato->estado !== 'A') {
            return response()->json(['message' => 'Detalle de contrato no encontrado'], 404);
        }

        $detalleContrato->update(['estado' => 'I']);

        return response()->json(['message' => 'Detalle de contrato marcado como inactivo']);
    }
}
