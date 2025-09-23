<?php

namespace App\Http\Middleware;

use Closure;
use Tymon\JWTAuth\Facades\JWTAuth;
use Tymon\JWTAuth\Exceptions\JWTException;
use Illuminate\Http\Request;

class RefreshJwtToken
{
    /**
     * Si quedan menos de $threshold segundos para expirar, refresca el token.
     */
    protected $thresholdSeconds = 600; // 10 minutos por ejemplo

    public function handle(Request $request, Closure $next)
    {
        try {
            $token = JWTAuth::getToken();
            if (!$token) {
                // no hay token en la petición (rutas públicas), seguir
                return $next($request);
            }

            // obtener payload del token actual
            $payload = JWTAuth::getPayload($token);
            $exp = $payload->get('exp'); // timestamp UNIX
            $remaining = $exp - time();

            if ($remaining <= $this->thresholdSeconds) {
                try {
                    // refrescar token (devuelve nuevo token)
                    $newToken = JWTAuth::refresh($token);

                    // procesar la petición normalmente
                    $response = $next($request);

                    // adjuntar header Authorization con el token nuevo
                    $response->headers->set('Authorization', 'Bearer ' . $newToken);

                    // si la petición espera JSON, añadimos token en el body (opcional)
                    if ($request->wantsJson()) {
                        $content = $response->getContent();
                        $data = json_decode($content, true);

                        if (is_array($data)) {
                            $data['token'] = $newToken;
                            $response->setContent(json_encode($data));
                        }
                    }

                    return $response;
                } catch (JWTException $e) {
                    // no se pudo refrescar (expired/perdido), seguimos sin bloquear
                }
            }
        } catch (\Exception $e) {
            // cualquier error de parseo/obtención de payload: no detener la petición
        }

        return $next($request);
    }
}
