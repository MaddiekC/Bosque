<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;          

class Cliente extends Model
{
    use HasFactory;
    protected $table = 'cliente';
    protected $primaryKey = 'id';
    public $timestamps = true;
    protected $dates = ['created_at', 'updated_at'];    

    protected $fillable = [
        'identificacion',
        'nombre',
        'telefono',
        'correo',
        'estado',
        'usuario_creacion'
    ];
    public function contratos()
    {
        return $this->hasMany(Contrato::class, 'cliente_id');
    }

}