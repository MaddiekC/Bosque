<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;          


class DetalleCorte extends Model
{
    use HasFactory;
    protected $table = 'detalle_contrato';
    protected $primaryKey = 'id';
    public $timestamps = true;
    protected $dates = ['created_at', 'updated_at'];

    protected $fillable = [
        'cabecera_corte_id',
        'trozas',
        'circ_bruta',
        'circ_neta',
        'largo_bruto',
        'largo_neto',
        'm_cubica',
        'valror_mcubico',
        'valor_troza',
        'estado',
        'usuario_creacion'
    ];

    public function cabeceraCorte()
    {
        return $this->belongsTo(CabeceraCorte::class, 'cabecera_corte_id');
    }

}