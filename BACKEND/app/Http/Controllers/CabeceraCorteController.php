<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\CabeceraCorte;
use Illuminate\Support\Facades\Validator;

class CabeceraCorteController extends Controller
{
    public function index()
    {
        $cabeceraCortes = CabeceraCorte::with(['bosque', 'contrato.cliente', 'siembraRebrote', 'raleoTipo', 'sello'])
            ->withCount('detalleCortes')
            ->whereIn('estado', ['A', 'C'])
            ->get();
        return response()->json($cabeceraCortes);
    }

    public function show($id)
    {
        $cabeceraCorte = CabeceraCorte::with(['bosque', 'contrato', 'siembraRebrote', 'raleoTipo', 'sello'])
            ->find($id);

        if (!$cabeceraCorte) { 
            return response()->json(['message' => 'Cabecera de corte no encontrada'], 404);
        }

        // devolver la cabecera independientemente del estado (A, C, etc.)
        return response()->json($cabeceraCorte, 200);
    }

    public function getContrato($contrato_id)
    {
        $cabeceraCorte = CabeceraCorte::with(['bosque', 'siembraRebrote', 'raleoTipo', 'sello'])
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
    {
        $validator = Validator::make($request->all(), [
            'bosque_id' => 'required|integer|exists:bosque,id',
            //'contrato_id' => 'required|integer|exists:contrato,id',
            'raleo_tipo_id' => 'required|integer|exists:parametro,id',
            'siembra_rebrote_id' => 'nullable|integer|exists:siembra_rebrote,id',
            'sello_id' => 'required|integer|exists:parametro,id',
            'fecha_embarque' => 'required|date',
            //'cant_arboles' => 'required|integer|min:1',
            'numero_viaje' => 'nullable|integer|min:1',
            'placa_carro' => 'nullable|string|max:50',
            'contenedor' => 'nullable|string|max:50',
            'conductor' => 'nullable|string|max:200',
            'supervisor' => 'nullable|string|max:200'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }
        $user = $request->user(); // obtiene el User autenticado
        $cabeceraCorte = CabeceraCorte::create([
            'bosque_id' => $request->bosque_id,
            'contrato_id'  => $request->contrato_id,
            'raleo_tipo_id' => $request->raleo_tipo_id,
            'siembra_rebrote_id' => $request->siembra_rebrote_id,
            'sello_id' => $request->sello_id,
            'fecha_embarque' => $request->fecha_embarque,
            'cant_arboles'  => $request->cant_arboles,
            'numero_viaje'  => $request->numero_viaje,
            'placa_carro'   => $request->placa_carro,
            'contenedor' => $request->contenedor,
            'conductor' => $request->conductor,
            'supervisor' => $request->supervisor,
            'usuario_creacion' => $user->username,
            'estado' => 'A',
        ]);
        return response()->json($cabeceraCorte, 201);
    }

    public function update(Request $request, $id)
    {
        $cabeceraCorte = CabeceraCorte::find($id);
        if (!$cabeceraCorte || $cabeceraCorte->estado !== 'A') {
            return response()->json(['message' => 'Cabecera de corte no encontrada'], 404);
        }

        $user = $request->user();
        $validator = Validator::make($request->all(), [
            'bosque_id' => 'required|integer|exists:bosque,id',
            'contrato_id' => 'required|integer|exists:contrato,id',
            'raleo_tipo_id' => 'required|integer|exists:parametro,id',
            'siembra_rebrote_id' => 'required|integer|exists:siembra_rebrote,id',
            'sello_id' => 'required|integer|exists:parametro,id',
            'fecha_embarque' => 'required|date',
            //'cant_arboles' => 'nullable|integer|min:1',
            'numero_viaje' => 'required|integer|min:1',
            'placa_carro' => 'required|string|max:50',
            'contenedor' => 'required|string|max:50',
            'conductor' => 'required|string|max:200',
            'supervisor' => 'required|string|max:200'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $cabeceraCorte->fill($request->only([
            'bosque_id',
            'contrato_id',
            'raleo_tipo_id',
            'siembra_rebrote_id',
            'sello_id',
            'fecha_embarque',
            'cant_arboles',
            'numero_viaje',
            'placa_carro',
            'contenedor',
            'conductor',
            'supervisor'
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
