<?php

namespace App\Models;
use Illuminate\Database\Eloquent\Factories\HasFactory;
use Illuminate\Database\Eloquent\Model;

class Transaccion extends Model
{
    // Si tu tabla se llama "transacciones" y tu PK "id", no necesitas nada más.
    use HasFactory;
    protected $table = 'transacciones';
    protected $fillable = ['nombre'];

    public function users()
    {
        // relación inversa many-to-many
        return $this->belongsToMany(User::class);
    }
}
