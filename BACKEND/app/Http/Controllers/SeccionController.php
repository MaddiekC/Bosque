<?php
//use App\Models\Seccion;
namespace App\Http\Controllers;

class SeccionController extends Controller
{
    // Aquí puedes definir los métodos para manejar las secciones
    public function index()
    {
        // Lógica para listar todas las secciones
        $secciones = \App\Models\Seccion::all();
        return response()->json($secciones);
    }

    public function show($id)
    {
        // Lógica para mostrar una sección específica por ID
        $seccion = \App\Models\Seccion::find($id);
        if (!$seccion) {
            return response()->json(['message' => 'Sección no encontrada'], 404);
        }
        return response()->json($seccion);
    }
}
