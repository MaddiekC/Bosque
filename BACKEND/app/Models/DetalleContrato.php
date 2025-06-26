<?php
namespace App\Models;
use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;          

class DetalleContrato extends Model
{
    use HasFactory;
    protected $table = 'detalle_contrato';
    protected $primaryKey = 'id';   
    public $timestamps = true;
    protected $dates = ['created_at', 'updated_at'];
    protected $fillable = [
        'contrato_id',
        'circuferencia',
        'valor',
        'rango', 
        'estado', 
        'usuario_creacion'
    ];

    public function contrato()
    {
        return $this->belongsTo(Contrato::class, 'contrato_id');
    }


}