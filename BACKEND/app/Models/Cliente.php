<?php

namespace App\Models;

use Illuminate\Database\Eloquent\Model;
use Illuminate\Database\Eloquent\Factories\HasFactory;

class Cliente extends Model
{
    use HasFactory;
    protected $connection = 'sqlsrv_remote';
    protected $table = 'CXC.v_clientes_persona';
    protected $primaryKey = 'idcliente';

    public $incrementing = false;
    public $timestamps = true;
    protected $dates = ['created_at'];
    protected $casts = [
        'idcliente' => 'string',
    ];
}
