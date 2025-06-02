<?php

namespace App\Http\Controllers;

//use App\Models\FakeUser;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Hash;
//use Tymon\JWTAuth\Exceptions\JWTException;
use Tymon\JWTAuth\Facades\JWTAuth;

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

        // Crea manualmente un "user-like" array para JWT
        $customUser = [
            'id' => $user->id,
            'username' => $user->username,
            'email' => $user->email ?? null,
            'password' => $user->password,
        ];

        $token = JWTAuth::fromUser(new \App\Models\FakeUser($customUser));

        return response()->json([
           /* 'access_token' => $token,
            'token_type' => 'bearer',*/
            'token' => $token, // para que puedas probarlo
            'message' => 'Login exitoso',
            'username' => $user->username,
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
}
