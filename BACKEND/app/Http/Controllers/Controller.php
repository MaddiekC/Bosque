<?php

namespace App\Http\Controllers;

use Illuminate\Foundation\Auth\Access\AuthorizesRequests;
use Illuminate\Foundation\Validation\ValidatesRequests;
use Illuminate\Routing\Controller as BaseController;

class Controller extends BaseController
{
    use AuthorizesRequests, ValidatesRequests;

    /*function decryptPayload(string $payload, string $iv): array
    {
        $key = '123456789012345678901234567890123456789'; // Debe coincidir con Angular
        $ivDecoded = base64_decode($iv);
        $cipher = "AES-256-CBC";

        $decrypted = openssl_decrypt(base64_decode($payload), $cipher, $key, OPENSSL_RAW_DATA, $ivDecoded);
        return json_decode($decrypted, true);
    }*/
}
