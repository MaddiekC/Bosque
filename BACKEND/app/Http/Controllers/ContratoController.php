<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;
use App\Models\Contrato;

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
        if (!$Contrato || $Contrato->estado !== 'A') {
            return response()->json(['message' => 'Contrato no encontrado'], 404);
        }

        return response()->json($Contrato);
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

    
}
