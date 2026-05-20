<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Models\Corte;
use App\Models\SiembraRebrote;
use Illuminate\Support\Facades\DB;
use Illuminate\Support\Facades\Validator;

class CorteController extends Controller
{
    public function index()
    {
        $cortes = Corte::with(['bosque', 'siembraRebrote', 'raleoTipo'])
            ->where('estado', 'A')
            ->get();

        return response()->json($cortes);
    }

    // Obtener un corte específico
    public function show($id)
    {
        $corte = Corte::with(['bosque', 'siembraRebrote', 'raleoTipo'])->find($id);
        if (!$corte || $corte->estado !== 'A') {
            return response()->json(['message' => 'Corte no encontrado'], 404);
        }

        return response()->json($corte);
    }


    // Crear un nuevo corte
    public function store(Request $request)
    {
        $validator = Validator::make($request->all(), [
            'bosque_id' => 'required|integer',
            'siembra_rebrote_id' => 'required|integer',
            'raleo_tipo_id' => 'required|integer',
            'cant_arboles' => 'required|numeric'
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        $user = $request->user(); // obtiene el User autenticado
        
        try {
            DB::beginTransaction();

            $corte = Corte::create([
                'bosque_id'        => $request->bosque_id,
                'siembra_rebrote_id' => $request->siembra_rebrote_id,
                'raleo_tipo_id'    => $request->raleo_tipo_id,
                'fecha_desde'      => $request->fecha_desde,
                'fecha_hasta'      => $request->fecha_hasta,
                'cant_arboles'     => $request->cant_arboles,
                'usuario_creacion' => $user->username,  // o $user->name, según tu modelo
                'updated_by'       => $user->username,
                'estado'           => 'A',
            ]);

            // Actualizar tabla siembra rebrote sumando los árboles
            $this->applyCorteToSiembraRebrote($corte, 1);

            DB::commit();
            return response()->json($corte, 201);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error al crear: ' . $e->getMessage()], 500);
        }
    }

    // Actualizar un corte existente
    public function update(Request $request, $id)
    {
        $corte = Corte::find($id);
        if (!$corte || $corte->estado !== 'A') {
            return response()->json(['message' => 'Corte no encontrado'], 404);
        }

        $user = $request->user();
        $validator = Validator::make($request->all(), [
            'bosque_id' => 'nullable|integer',
            'siembra_rebrote_id' => 'nullable|integer',
            'raleo_tipo_id' => 'nullable|integer',
        ]);

        if ($validator->fails()) {
            return response()->json(['errors' => $validator->errors()], 422);
        }

        try {
            DB::beginTransaction();

            // Revertir los valores anteriores del corte en la siembra rebrote
            $this->applyCorteToSiembraRebrote($corte, -1);

            $corte->fill($request->only([
                'bosque_id',
                'siembra_rebrote_id',
                'raleo_tipo_id',
                'fecha_desde',
                'fecha_hasta',
                'cant_arboles',
                'usuario_creacion'
            ]));

            $corte->updated_by = $user->username; // Asignar el usuario que hizo la edición
            $corte->save(); // Guardar cambios

            // Aplicar los nuevos valores a la siembra rebrote
            $this->applyCorteToSiembraRebrote($corte, 1);

            DB::commit();
            return response()->json($corte);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error al actualizar: ' . $e->getMessage()], 500);
        }
    }

    // Eliminar 
    public function destroy(Request $request, $id)
    {
        $corte = Corte::find($id);
        if (!$corte || $corte->estado !== 'A') {
            return response()->json(['message' => 'Corte no encontrado'], 404);
        }
        
        try {
            DB::beginTransaction();

            // Revertir los valores del corte eliminado
            $this->applyCorteToSiembraRebrote($corte, -1);

            $corte->update([
                'estado' => 'I',
                'updated_by' => $request->user()->username
            ]);

            DB::commit();
            return response()->json(['message' => 'Marcado como inactivo']);
        } catch (\Exception $e) {
            DB::rollBack();
            return response()->json(['message' => 'Error al eliminar: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Aplica o revierte la cantidad de arboles del corte a su respectiva siembra_rebrote
     */
    private function applyCorteToSiembraRebrote(Corte $corte, int $multiplier)
    {
        if (!$corte->siembra_rebrote_id || !$corte->cant_arboles) return;

        // Se bloquea el registro con lockForUpdate() para transacciones concurrentes
        $siembra = SiembraRebrote::where('id', $corte->siembra_rebrote_id)->lockForUpdate()->first();

        if ($siembra) {
            $cantidad = (int)$corte->cant_arboles * $multiplier;
            
            // 7 = Comercial
            if ($corte->raleo_tipo_id == 7) {
                $siembra->arb_cortados = (int)($siembra->arb_cortados ?? 0) + $cantidad;
            } 
            // 22 = Muerto por naturaleza
            elseif ($corte->raleo_tipo_id == 22) {
                $siembra->arb_muertNat = (int)($siembra->arb_muertNat ?? 0) + $cantidad;
            } 
            // Otros Raleos (20 = Semi Comercial, 21 = Basureo, etc.)
            else {
                $siembra->arb_raleados = (int)($siembra->arb_raleados ?? 0) + $cantidad;
            }

            // Recalcular saldo: iniciales - (cortados + raleados + muertNat)
            $siembra->saldo = (int)($siembra->arb_iniciales ?? 0) - ((int)($siembra->arb_cortados ?? 0) + (int)($siembra->arb_raleados ?? 0) + (int)($siembra->arb_muertNat ?? 0));
            
            $siembra->save();
        }
    }
}
