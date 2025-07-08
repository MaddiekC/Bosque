<?php

namespace App\Http\Controllers;

use App\Models\Parametro;

use Illuminate\Http\Request;

class ParametroController extends Controller
{
    public function index()
    {
        $parametros = Parametro::all();
        return response()->json($parametros);
    }
    public function show($id)
    {
        $parametro = Parametro::find($id);
        if (!$parametro) {
            return response()->json(['message' => 'Parametro no encontrado'], 404);
        }
        return response()->json($parametro);
    }
    public function store(Request $request)
    {
        $request->validate([
            'categoria' => 'required|string|max:50',
            'nombre' => 'required|string|max:100',
            'descripcion' => 'nullable|string|max:255'
        ]);
        $user = $request->user();
        $parametro = Parametro::create([
            'categoria' => $request->categoria,
            'nombre' => $request->nombre,
            'descripcion' => $request->descripcion,
            'usuario_creacion' => $user->username,
            'estado' => 'A',
        ]);
        return response()->json($parametro, 201);
    }
    public function update(Request $request, $id)
    {
        $parametro = Parametro::find($id);
        if (!$parametro) {
            return response()->json(['message' => 'Parametro no encontrado'], 404);
        }
        $user = $request->user();
        $request->validate([
            'categoria' => 'required|string|max:50',
            'nombre' => 'required|string|max:100',
            'descripcion' => 'nullable|string|max:255'
        ]);

        $parametro->fill($request->only([
            'categoria',
            'nombre',
            'descripcion']
        ));
        $parametro->updated_by = $user->username; // Asignar el usuario que hizo la edición
        $parametro->save(); // Guardar cambios
        return response()->json($parametro);
    }
    public function destroy($id)
    {
        $parametro = Parametro::find($id);
        if (!$parametro) {
            return response()->json(['message' => 'Parametro no encontrado'], 404);
        }

        $parametro->delete();
        return response()->json(['message' => 'Parametro eliminado correctamente']);
    }
    public function getByCategoria($categoria)
    {
        $parametros = Parametro::where('categoria', $categoria)->get();
        if ($parametros->isEmpty()) {
            return response()->json(['message' => 'No se encontraron parametros para esta categoria'], 404);
        }
        return response()->json($parametros);
    }
    public function getByNombre($nombre)
    {
        $parametros = Parametro::where('nombre', 'like', '%' . $nombre . '%')->get();
        if ($parametros->isEmpty()) {
            return response()->json(['message' => 'No se encontraron parametros con este nombre'], 404);
        }
        return response()->json($parametros);
    }
}
