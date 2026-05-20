<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;          


class CabeceraCorte extends Model
{
    use HasFactory;
    protected $table = 'cabecera_corte';
    protected $primaryKey = 'id';   
    public $timestamps = true;
    protected $dates = ['created_at', 'updated_at'];
    protected $fillable = [
        'contrato_id',
        'raleo_tipo_id',
        'fecha_embarque',
        'cant_arboles',
        'numero_viaje',
        'numero_envio',
        'placa_carro',
        'contenedor',
        'naviera',
        'supervisor',
        'sello_empresa',
        'sello_rastreo',
        'sello_inspeccion',
        'estado',
        'usuario_creacion'
    ];
    public function contrato()
    {
        return $this->belongsTo(Contrato::class, 'contrato_id');
    }

    public function raleoTipo()
    {
        return $this->belongsTo(Parametro::class, 'raleo_tipo_id')
        ->where('categoria', 'raleoTipo');
    }
    
    public function detalleCortes()
    {
        return $this->hasMany(DetalleCorte::class, 'cabecera_corte_id');
    }
}