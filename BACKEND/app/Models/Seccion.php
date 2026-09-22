<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Seccion extends Model
{
    use HasFactory;

    protected $table = 'seccion';
    protected $primaryKey = 'id';
    public $timestamps = true;
    protected $dates = ['created_at', 'updated_at'];

    protected $fillable = [
        'nombre',
        'descripcion',
        'estado',
        'usuario_creacion'
    ];
    public function bosques()
    {
        return $this->hasMany(Bosque::class, 'seccion_id');
    }
}
