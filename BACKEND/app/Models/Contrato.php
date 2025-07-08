<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;


class Contrato extends Model
{
    use HasFactory;
    protected $table = 'contrato';
    protected $primaryKey = 'id';
    public $timestamps = true;
    protected $dates = ['created_at', 'updated_at'];
    protected $fillable = [
        'cliente_id',
        'anio',
        'fecha',
        'estado',
        'usuario_creacion'
    ];

    protected $casts = [
        'cliente_id' => 'string'
    ];

    public function cliente()
    {
        return $this->belongsTo(Cliente::class, 'idcliente');
    }
    public function detalles()
    {
        return $this->hasMany(DetalleContrato::class, 'contrato_id');
    }

    public function cabeceraCortes()
    {
        return $this->hasMany(CabeceraCorte::class, 'contrato_id');
    }
    public function anticipos()
    {
        return $this->hasMany(Anticipo::class, 'anticipo_id');
    }
}
