<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use App\Models\Parametro;

class SiembraRebrote extends Model
{
    use HasFactory;
    protected $table = 'siembra_rebrote';
    protected $primaryKey = 'id';
    public $timestamps = true;
    protected $dates = ['created_at', 'updated_at'];

    protected $fillable = [
        'bosque_id',
        'tipo_id',
        'tipo_arbol_id',
        'fecha',
        'anio',
        'hectarea_usada',
        'arb_iniciales',
        'arb_cortados',
        'dist_siembra',
        'saldo',
        'estado',
        'usuario_creacion'
    ];

    public function bosque()
    {
        return $this->belongsTo(Bosque::class, 'bosque_id');
    }
    public function tipo()
    {
        return $this->belongsTo(Parametro::class, 'tipo_id')
            ->where('categoria', 'siembra_rebrote');
    }
    public function tipoArbol()
    {
        return $this->belongsTo(Parametro::class, 'tipo_arbol_id')
            ->where('categoria', 'tipoArbol');
    }
    public function cabeceraCortes()
    {
        return $this->hasMany(CabeceraCorte::class, 'siembra_rebrote_id');
    }
        public function detalleCortes()
    {
        return $this->hasMany(CabeceraCorte::class, 'siembra_rebrote_id');
    }
}
