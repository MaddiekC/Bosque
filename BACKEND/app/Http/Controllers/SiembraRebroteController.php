<?php

namespace App\Http\Controllers;

use App\Models\SiembraRebrote;
use Illuminate\Http\Request;

class SiembraRebroteController extends Controller
{
    public function sumHectarea($bosqueId)
    {
        $sum = SiembraRebrote::where('bosque_id', $bosqueId)->sum('hectarea_usada');
        return response()->json($sum);
    }

    public function index()
    {
        $siembraRebrotes = SiembraRebrote::with(['bosque', 'tipo', 'tipoArbol'])
            ->where('estado', 'A')
            ->get();
        return response()->json($siembraRebrotes);
    }
    public function show($id)
    {
        $siembraRebrote = SiembraRebrote::with(['bosque', 'tipo', 'tipoArbol'])
            ->find($id);
        if (!$siembraRebrote || $siembraRebrote->estado !== 'A') {
            return response()->json(['message' => 'Siembra/Rebrote no encontrado'], 404);
        }
        return response()->json($siembraRebrote);
    }
    public function store(Request $request)
    {
        $data = $request->validate([
            'bosque_id' => 'required|integer|exists:bosque,id',
            'tipo_id' => 'required|integer|exists:parametro,id',
            'tipo_arbol_id' => 'required|integer|exists:parametro,id',
            'fecha' => 'required|date',
            'anio' => 'required|integer|min:1',
            'hectarea_usada' => 'required|numeric|min:0',
            'arb_iniciales' => 'required|integer|min:0',
            //'arb_cortados' => 'required|integer|min:1',
            'dist_siembra' => 'required|string|max:30',
            //'saldo' => 'required|integer|min:1'
            // 'usuario_creacion' => 'required|string|max:200',
        ]);

        // 1) Obtén el bosque y su hectarea total
        $bosque = \App\Models\Bosque::findOrFail($data['bosque_id']);
        $disponible = $bosque->hectarea;

        // 2) Suma ya usada
        $usadoAntes = SiembraRebrote::where('bosque_id', $bosque->id)
            ->where('estado', 'A')
            ->sum('hectarea_usada');

        // 3) Si excede, regresa error
        if (($usadoAntes + $data['hectarea_usada']) > $disponible) {
            return response()->json([
                'errors' => [
                    'hectarea_usada' => [
                        "No puedes usar más de {$disponible} ha. Ya llevas usadas {$usadoAntes} ha."
                    ]
                ]
            ], 422);
        }

        $user = $request->user();

        $siembraRebrote = SiembraRebrote::create([
            ...$request->only(['bosque_id', 'tipo_id', 'tipo_arbol_id', 'fecha', 'anio', 'hectarea_usada', 'arb_iniciales','arb_raleados', 'arb_cortados', 'dist_siembra', 'usuario_creacion']),
            'usuario_creacion' => $user->username,
            'estado' => 'A',
        ]);

        return response()->json($siembraRebrote, 201);
    }
    public function update(Request $request, $id)
    {
        $siembraRebrote = SiembraRebrote::findOrFail($id);
        abort_if($siembraRebrote->estado !== 'A', 404, 'Siembra/Rebrote no encontrado');

        $data = $request->validate([
            'bosque_id' => 'required|integer|exists:bosque,id',
            'tipo_id' => 'required|integer|exists:parametro,id',
            'tipo_arbol_id' => 'required|integer|exists:parametro,id',
            'fecha' => 'required|date',
            'anio' => 'required|integer|min:1',
            'hectarea_usada' => 'required|numeric|min:0',
            'arb_iniciales' => 'required|integer|min:0',
            'arb_raleados'     => 'required|integer|min:0',
            'arb_cortados' => 'required|integer|min:0',
            'dist_siembra' => 'required|string|max:30',
            //'saldo' => 'required|integer|min:1',
        ]);

        // Recalcula el saldo
        $data['saldo'] = $data['arb_iniciales'] - ($data['arb_cortados'] + $data['arb_raleados']);

        // 1) Capacidad del bosque
        $bosque = \App\Models\Bosque::findOrFail($data['bosque_id']);
        $disponible = $bosque->hectarea;

        // 2) Suma ya usada excluyendo esta siembra
        $usadoAntes = SiembraRebrote::where('bosque_id', $bosque->id)
            ->where('estado', 'A')
            ->where('id', '<>', $siembraRebrote->id)
            ->sum('hectarea_usada');

        // 3) Validación de exceso
        if (($usadoAntes + $data['hectarea_usada']) > $disponible) {
            return response()->json([
                'errors' => [
                    'hectarea_usada' => [
                        "No puedes usar más de {$disponible} ha. Ya llevas usadas {$usadoAntes} ha."
                    ]
                ]
            ], 422);
        }

        // 4) Actualizar
        $siembraRebrote->fill($data);
        $user = $request->user();
        $siembraRebrote->updated_by = $user()->username; // Asignar el usuario que hizo la edición
        $siembraRebrote->save();
        return response()->json($siembraRebrote);
    }
    public function destroy($id)
    {
        $siembraRebrote = SiembraRebrote::find($id);
        if (!$siembraRebrote || $siembraRebrote->estado !== 'A') {
            return response()->json(['message' => 'Siembra/Rebrote no encontrado'], 404);
        }
        $siembraRebrote->update(['estado' => 'I']);
        return response()->json(['message' => 'Siembra/Rebrote eliminado correctamente']);
    }
}
