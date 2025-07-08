<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\DetalleCorte;

class DetalleCorteController extends Controller
{
    public function index()
    {
        $detallesCorte = DetalleCorte::with('cabeceraCorte')
            ->where('estado', 'A')
            ->get();        
        return response()->json($detallesCorte);
    }

    public function show($id)
    {
        $detalleCorte = DetalleCorte::with('cabeceraCorte')->find($id);
        if (!$detalleCorte || $detalleCorte->estado !== 'A') {
            return response()->json(['message' => 'Detalle de corte no encontrado'], 404);
        }
        return response()->json($detalleCorte);
    }

    public function store(Request $request)
    {
        $request->validate([
            'cabecera_corte_id' => 'required|integer|exists:cabecera_corte,id',
            'trozas' => 'required|integer|min:1',
            'circ_bruta' => 'required|numeric|min:0',
            'circ_neta' => 'required|numeric|min:0',
            'largo_bruto' => 'required|numeric|min:0',
            'largo_neto' => 'required|numeric|min:0',
            'm_cubica' => 'required|numeric|min:0',
            'valror_mcubico' => 'required|numeric|min:0',
            'valor_troza' => 'required|numeric|min:0'
        ]);

        $user = $request->user();
        $detalleCorte = DetalleCorte::create([
                'cabecera_corte_id' => $request->cabecera_corte_id, 
                'trozas' => $request->trozas, 
                'circ_bruta' => $request->circ_bruta, 
                'circ_neta' => $request->circ_neta, 
                'largo_bruto'   => $request->largo_bruto, 
                'largo_neto' => $request->largo_neto, 
                'm_cubica' => $request->m_cubica, 
                'valror_mcubico'  => $request->valror_mcubico, 
                'valor_troza' => $request->valor_troza, 
                'usuario_creacion' =>  $user->username,
                'estado' => 'A',
        ]);

        return response()->json($detalleCorte, 201);
    }

    public function update(Request $request, $id)
    {
        $detalleCorte = DetalleCorte::find($id);
        if (!$detalleCorte || $detalleCorte->estado !== 'A') {
            return response()->json(['message' => 'Detalle de corte no encontrado'], 404);
        }

        $user = $request->user();
        $request->validate([
            'cabecera_corte_id' => 'nullable|integer|exists:cabecera_corte,id',
            'trozas' => 'nullable|integer|min:1',
            'circ_bruta' => 'nullable|numeric|min:0',
            'circ_neta' => 'nullable|numeric|min:0',
            'largo_bruto' => 'nullable|numeric|min:0',
            'largo_neto' => 'nullable|numeric|min:0',
            'm_cubica' => 'nullable|numeric|min:0',
            'valror_mcubico' => 'nullable|numeric|min:0',
            'valor_troza' => 'nullable|numeric|min:0'
        ]);

        $detalleCorte->fill($request->only([
            'cabecera_corte_id', 
            'trozas', 
            'circ_bruta', 
            'circ_neta', 
            'largo_bruto', 
            'largo_neto', 
            'm_cubica', 
            'valror_mcubico', 
            'valor_troza'
        ]));
        $detalleCorte->updated_by = $user->username; // Asignar el usuario que hizo la edición
        $detalleCorte->save(); // Guardar cambios

        return response()->json($detalleCorte);
    }

    public function destroy($id)
    {
        $detalleCorte = DetalleCorte::find($id);
        if (!$detalleCorte || $detalleCorte->estado !== 'A') {
            return response()->json(['message' => 'Detalle de corte no encontrado'], 404);
        }

        $detalleCorte->update(['estado' => 'I']);
        return response()->json(['message' => 'Detalle de corte marcado como inactivo']);
    }
}
