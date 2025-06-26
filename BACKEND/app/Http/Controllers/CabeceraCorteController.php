<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\CabeceraCorte;
use Illuminate\Support\Facades\Validator;

class CabeceraCorteController extends Controller
{
    public function index()
    {
        $cabeceraCortes = CabeceraCorte::with(['bosque', 'contrato', 'siembraRebrote', 'raleoTipo', 'sello'])
            ->where('estado', 'A')->get();
        return response()->json($cabeceraCortes);
    }

    public function show($id)
    {
        $cabeceraCorte = CabeceraCorte::with(['bosque', 'contrato', 'siembraRebrote', 'raleoTipo', 'sello'])
            ->find($id);
        if (!$cabeceraCorte || $cabeceraCorte->estado !== 'A') {
            return response()->json(['message' => 'Cabecera de corte no encontrada'], 404);
        }

        return response()->json($cabeceraCorte);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'bosque_id' => 'required|integer|exists:bosque,id',
            'contrato_id' => 'required|integer|exists:contrato,id',
            'raleo_tipo_id' => 'required|integer|exists:parametro,id',
            'siembra_rebrote_id' => 'nullable|integer|exists:siembra_rebrote,id',
            'sello_id' => 'required|integer|exists:parametro,id',
            'fecha_embarque' => 'required|date',
            'cant_arboles' => 'required|integer|min:1',
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
            'bosque_id ' => $request->bosque_id,
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

        $validator = Validator::make($request->all(), [
            'bosque_id' => 'nullable|integer|exists:bosque,id',
            'contrato_id' => 'nullable|integer|exists:contrato,id',
            'raleo_tipo_id' => 'nullable|integer|exists:parametro,id',
            'siembra_rebrote_id' => 'nullable|integer|exists:siembra_rebrote,id',
            'sello_id' => 'nullable|integer|exists:parametro,id',
            'fecha_embarque' => 'nullable|date',
            'cant_arboles' => 'nullable|integer|min:1',
            'numero_viaje' => 'nullable|integer|min:1',
            'placa_carro' => 'nullable|string|max:50',
            'contenedor' => 'nullable|string|max:50',
            'conductor' => 'nullable|string|max:200',
            'supervisor' => 'nullable|string|max:200',
            'usuario_creacion' => 'nullable|string|max:200',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $cabeceraCorte->update($request->only([
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
            'supervisor',
            'usuario_creacion'
        ]));

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
}
