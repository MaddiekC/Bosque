<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;
//use App\Models\Parametro;

class Bosque extends Model
{
    use HasFactory;
    protected $table = 'bosque';
    protected $primaryKey = 'id';
    public $timestamps = true;
    protected $dates = ['created_at', 'updated_at'];

    protected $fillable = [
        'seccion_id',
        'nombre',
        'hectarea',
        'estado',
        'usuario_creacion'
    ];

    public function seccion()
    {
        return $this->belongsTo(Seccion::class, 'seccion_id');
    }

    public function siembraRebrote()
    {
        return $this->hasMany(SiembraRebrote::class, 'bosque_id');
    }

    public function cabeceraCortes()
    {
        return $this->hasMany(CabeceraCorte::class, 'bosque_id');
    }
}
