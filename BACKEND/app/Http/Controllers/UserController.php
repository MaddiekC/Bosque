<?php

namespace App\Http\Controllers;

use App\Models\User;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Hash;
use Illuminate\Support\Facades\Validator;
use Illuminate\Support\Facades\Log;

class UserController extends Controller
{
    public function index()
    {
        $usuarios = User::where('estado', '!=', 'I')->orWhereNull('estado')->orderByDesc('created_at')->get();
        return response()->json($usuarios);
    }

    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'name' => 'required|string|max:255',
            'surname' => 'required|string|max:255',
            'username' => 'required|string|max:255|unique:users,username',
            'password' => 'required|string|min:6',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            $user = User::create([
                'name' => $request->name,
                'surname' => $request->surname,
                'username' => $request->username,
                'password' => Hash::make($request->password),
                'estado' => 'A'
            ]);

            return response()->json($user, 201);
        } catch (\Throwable $e) {
            Log::error('Error creando usuario: ' . $e->getMessage());
            return response()->json(['message' => 'Error interno al crear usuario'], 500);
        }
    }

    public function destroy($id)
    {
        try {
            $user = User::findOrFail($id);
            $user->estado = 'I';
            $user->save();
            return response()->json(['message' => 'Usuario inactivo']);
        } catch (\Throwable $e) {
            Log::error('Error al inactivar usuario: ' . $e->getMessage());
            return response()->json(['message' => 'Error interno al inactivar usuario'], 500);
        }
    }
}
