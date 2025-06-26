<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Cliente;
use Illuminate\Support\Facades\Validator;

class ClienteController extends Controller
{
    public function index()
    {
        $clientes = Cliente::where('estado', 'A')->get();
        return response()->json($clientes);
    }

    public function show($id)
    {
        $cliente = Cliente::find($id);
        if (!$cliente || $cliente->estado !== 'A') {
            return response()->json(['message' => 'Cliente no encontrado'], 404);
        }
        return response()->json($cliente);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'identificacion' => 'required|string|max:50|unique:cliente,identificacion',
            'nombre' => 'required|string|max:200',
            'telefono' => 'nullable|string|max:50',
            'correo' => 'nullable|email|max:100'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = $request->user(); // obtiene el User autenticado
        $cliente = Cliente::create([
            'identificacion' => $request->identificacion, 
            'nombre' => $request->nombre, 
            'telefono' => $request->telefono, 
            'correo' => $request->correo, 
            'usuario_creacion' =>  $user->username,
            'estado' => 'A',
        ]);
        return response()->json($cliente, 201);
    }

    public function update(Request $request, $id)
    {
        $cliente = Cliente::find($id);
        if (!$cliente || $cliente->estado !== 'A') {
            return response()->json(['message' => 'Cliente no encontrado'], 404);
        }

        $validator = Validator::make($request->all(), [
            'identificacion' => 'nullable|string|max:50|unique:cliente,identificacion',
            'nombre' => 'nullable|string|max:200',
            'telefono' => 'nullable|string|max:50',
            'correo' => 'nullable|email|max:100',
            'usuario_creacion' => 'required|string|max:200',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $cliente->update($request->only([
            'identificacion', 
            'nombre', 
            'telefono', 
            'correo', 
            'usuario_creacion'
        ]));

        return response()->json($cliente);
    }
    public function destroy($id)
    {
        $cliente = Cliente::find($id);
        if (!$cliente || $cliente->estado !== 'A') {
            return response()->json(['message' => 'Cliente no encontrado'], 404);
        }

        $cliente->update(['estado' => 'I']);

        return response()->json(['message' => 'Marcado como inactivo']);
    }
}
