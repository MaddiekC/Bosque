<?php

namespace App\Http\Controllers;

//use App\Models\FakeUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
//use Tymon\JWTAuth\Exceptions\JWTException;
use Tymon\JWTAuth\Facades\JWTAuth;
use Illuminate\Http\JsonResponse;

class AuthController extends Controller
{
    public function login(Request $request)
    {
        $request->validate([
            'username' => 'required|string',
            'password' => 'required|string',
        ]);

        $user = DB::table('users')
            ->where('username', $request->username)
            ->first();

        if (!$user || !Hash::check($request->password, $user->password)) {
            return response()->json(['error' => 'Credenciales inválidas'], 401);
        }

        // en tu login controller:
        $credentials = $request->only('username', 'password');

        if (! $token = JWTAuth::attempt($credentials)) {
            return response()->json(['error' => 'Credenciales inválidas'], 401);
        }
        // TTL en minutos (por defecto 60)
        $ttl = JWTAuth::factory()->getTTL();
        return response()->json([
            /* 'access_token' => $token,
            'token_type' => 'bearer',*/
            'access_token' => $token, // para que puedas probarlo
            'message' => 'Login exitoso',
            'expires_in'   => $ttl * 60,
            'username' => $user->username,
            'id' => $user->id,
            'email' => $user->email
        ]);
    }


    public function logout()
    {
        $token = JWTAuth::getToken();

        if (!$token) {
            return response()->json(['error' => 'Token no proporcionado'], 400);
        }

        try {
            JWTAuth::invalidate($token);
            return response()->json(['message' => 'Sesión cerrada correctamente']);
        } catch (\Tymon\JWTAuth\Exceptions\TokenInvalidException $e) {
            return response()->json(['error' => 'Token inválido'], 401);
        } catch (\Tymon\JWTAuth\Exceptions\JWTException $e) {
            return response()->json(['error' => 'No se pudo cerrar la sesión'], 500);
        }
    }



    public function me()
    {
        return response()->json(auth()->user());
    }

    public function permissions(): JsonResponse
    {
        /** @var \App\Models\User $user */
        $user = auth()->user();

        // Asumiendo relación many-to-many user↔transacciones
        $perms = $user->transacciones->pluck('id');

        return response()->json($perms);
    }
}
