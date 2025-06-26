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

    public function cliente()
    {
        return $this->belongsTo(Cliente::class, 'cliente_id');
    }
    public function contrato()
    {
        return $this->hasMany(DetalleContrato::class, 'contrato_id');
    }

    public function cabeceraCortes()
    {
        return $this->hasMany(CabeceraCorte::class, 'contrato_id');
    }   

}