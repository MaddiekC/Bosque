<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;          


class DetalleCorte extends Model
{
    use HasFactory;
    protected $table = 'detalle_corte';
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
        'valor_mcubico',
        'valor_troza',
        'estado',
        'usuario_creacion',
        'bosque_id',
        'siembra_rebrote_id'
    ];

    public function cabeceraCorte()
    {
        return $this->belongsTo(CabeceraCorte::class, 'cabecera_corte_id');
    }

    public function bosque()
    {
        return $this->belongsTo(Bosque::class, 'bosque_id');
    }
    
    public function siembraRebrote()
    {
        return $this->belongsTo(SiembraRebrote::class, 'siembra_rebrote_id');
    }


}