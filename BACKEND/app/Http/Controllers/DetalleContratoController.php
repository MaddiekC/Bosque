<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\DetalleContrato;

class DetalleContratoController extends Controller
{
    public function index()
    {
        $detallesContrato = DetalleContrato::with('contrato')
            ->where('estado', 'A')
            ->get();

        return response()->json($detallesContrato);
    }
    public function show($contrato_id)
    {
        // traemos todos los detalles cuyo contrato_id coincida y que estén activos
        $detalles = DetalleContrato::with('contrato')
            ->where('contrato_id', $contrato_id)
            ->where('estado', 'A')
            ->get();

        if ($detalles->isEmpty()) {
            return response()->json(['message' => 'Detalle de contrato no encontrado'], 404);
        }

        return response()->json($detalles);
    }


    public function store(Request $request)
    {
        $request->validate([
            'detalles'                  => 'required|array|min:1',
            'detalles.*.contrato_id'    => 'required|numeric|exists:contrato,id',
            'detalles.*.circunferencia' => 'required|numeric|min:0',
            'detalles.*.precioM3'       => 'required|numeric|min:0',
            'detalles.*.largo'          => 'required|numeric|min:0',
            'detalles.*.caracteristica' => 'required|string|max:255',
        ]);
        $user = $request->user();
        $creados = [];

        foreach ($request->input('detalles') as $det) {
            $creados[] = DetalleContrato::create([
                'contrato_id'      => $det['contrato_id'],
                'circunferencia'   => $det['circunferencia'],
                'precioM3'         => $det['precioM3'],
                'largo'            => $det['largo'],
                'caracteristica'   => $det['caracteristica'],
                'usuario_creacion' => $user->username,
                'estado'           => 'A',
            ]);
        }


        return response()->json($creados, 201);
    }

    public function update(Request $request, $id)
    {
        $detalleContrato = DetalleContrato::find($id);
        if (!$detalleContrato || $detalleContrato->estado !== 'A') {
            return response()->json(['message' => 'Detalle de contrato no encontrado'], 404);
        }
        $user = $request->user();
        $request->validate([
            'contrato_id' => 'required|numeric|exists:contrato,id',
            'circunferencia' => 'required|string|max:255',
            'precioM3' => 'required|integer|min:1',
            'largo' => 'required|numeric|min:0',
            'caracteristica' => 'required|string|max:255',
        ]);

        $detalleContrato->fill($request->only(['contrato_id', 'circuferencia', 'pprecioM3', 'largo', 'caracteristica']));
        $detalleContrato->updated_by = $user->username; // Asignar el usuario que hizo la edición
        $detalleContrato->save(); // Guardar cambios
        return response()->json($detalleContrato);
    }

    public function destroy($id)
    {
        $detalleContrato = DetalleContrato::find($id);
        if (!$detalleContrato || $detalleContrato->estado !== 'A') {
            return response()->json(['message' => 'Detalle de contrato no encontrado'], 404);
        }

        $detalleContrato->update(['estado' => 'I']);

        return response()->json(['message' => 'Detalle de contrato marcado como inactivo']);
    }
}
