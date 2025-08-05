<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;          

class Parametro extends Model
{
    use HasFactory;
    protected $table = 'parametro';
    protected $primaryKey = 'id';
    public $timestamps = true;
    protected $dates = ['created_at', 'updated_at'];
    protected $fillable = [
        'categoria',
        'nombre',
        'descripcion',
        'estado',
        'usuario_creacion'
    ];

    public function siembraRebrotes()
    {
        return $this->hasMany(SiembraRebrote::class, 'tipo_id');
    }

    public function sellos()
    {
        return $this->hasMany(CabeceraCorte::class, 'sello_id');
    }

    public function raleoTipos()
    {
        return $this->hasMany(CabeceraCorte::class, 'raleo_tipo_id');
    }

    public function tipoArboles()
    {
        return $this->hasMany(Bosque::class, 'tipo_arbol_id');
    }
}