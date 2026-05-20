<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;          


class Corte extends Model
{
    use HasFactory;
    protected $table = 'cortes';
    protected $primaryKey = 'id';   
    public $timestamps = true;
    protected $dates = ['created_at', 'updated_at'];
    protected $fillable = [
        'raleo_tipo_id',
        'bosque_id',
        'siembra_rebrote_id',
        'fecha_desde',
        'fecha_hasta',
        'cant_arboles',
        'estado',
        'usuario_creacion',
        'updated_by'
    ];

    public function bosque()
    {
        return $this->belongsTo(Bosque::class, 'bosque_id');
    }
    
    public function siembraRebrote()
    {
        return $this->belongsTo(SiembraRebrote::class, 'siembra_rebrote_id');
    }

    public function raleoTipo()
    {
        return $this->belongsTo(Parametro::class, 'raleo_tipo_id')
        ->where('categoria', 'raleoTipo');
    }
}