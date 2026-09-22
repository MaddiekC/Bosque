<?php

namespace App\Http\Controllers;

use App\Models\Cliente;


class ClienteController extends Controller
{
    public function index()
    {
        $clientes = Cliente::get();
        return response()->json($clientes);
    }

    public function show($id)
    {
        $cliente = Cliente::where('idcliente', $id)->first();
        return response()->json($cliente);
    }

  
}
