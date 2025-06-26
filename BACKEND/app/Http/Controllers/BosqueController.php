<?php

namespace App\Http\Controllers;

use App\Models\Bosque;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Validator;

class BosqueController extends Controller
{
    // Obtener todos los bosques con sus relaciones
    public function index()
    {
        $bosques = Bosque::with(['seccion'])->where('estado', 'A')->get();
        return response()->json($bosques);
    }

    // Obtener un bosque específico
    public function show($id)
    {
        $bosque = Bosque::with(['seccion'])->find($id);
        if (!$bosque || $bosque->estado !== 'A') {
            return response()->json(['message' => 'Bosque no encontrado'], 404);
        }

        return response()->json($bosque);
    }

    // Crear un nuevo bosque
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'seccion_id' => 'required|integer|exists:parametro,id',
            'nombre' => 'required|string|max:500',
            'hectarea' => 'required|numeric',
            // 'usuario_creacion' => 'required|string|max:200',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = $request->user(); // obtiene el User autenticado
        $bosque = Bosque::create([
            'seccion_id'       => $request->seccion_id,
            'nombre'           => $request->nombre,
            'hectarea'         => $request->hectarea,
            'usuario_creacion' => $user->username,  // o $user->name, según tu modelo
            'estado'           => 'A',
        ]);

        return response()->json($bosque, 201);
    }


    // Actualizar un bosque existente
    public function update(Request $request, $id)
    {
        $bosque = Bosque::find($id);
        if (!$bosque || $bosque->estado !== 'A') {
            return response()->json(['message' => 'Bosque no encontrado'], 404);
        }

        $validator = Validator::make($request->all(), [
            'seccion_id' => 'nullable|integer|exists:parametro,id',
            'nombre' => 'nullable|string|max:500',
            'hectarea' => 'nullable|numeric',
            'usuario_creacion' => 'nullable|string|max:200',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $bosque->update($request->only([
            'seccion_id',
            'nombre',
            'hectarea',
            'usuario_creacion'
        ]));

        return response()->json($bosque);
    }

    // Eliminar lógicamente un bosque (cambiar estado)
    public function destroy($id)
    {
        $bosque = Bosque::find($id);
        if (!$bosque || $bosque->estado !== 'A') {
            return response()->json(['message' => 'Bosque no encontrado'], 404);
        }
        if ($bosque->siembraRebrote()->exists()) {
            return response()->json([
                'message' => 'No se puede eliminar: existen siembras-rebrote asociadas.'
            ], 400);
        }
        $bosque->update(['estado' => 'I']);

        return response()->json(['message' => 'Marcado como inactivo']);
    }
}
