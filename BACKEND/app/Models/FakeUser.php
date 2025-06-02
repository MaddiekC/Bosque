<?php
namespace App\Models;

use Illuminate\Contracts\Auth\Authenticatable;
use Illuminate\Auth\Authenticatable as AuthenticatableTrait;
use Tymon\JWTAuth\Contracts\JWTSubject;

class FakeUser implements Authenticatable, JWTSubject
{
    use AuthenticatableTrait;

    protected $attributes;

    public function __construct(array $attributes)
    {
        $this->attributes = $attributes;
        foreach ($attributes as $key => $value) {
            $this->$key = $value;
        }
    }

    public function getAuthIdentifierName()
    {
        return 'id';
    }

    public function getAuthIdentifier()
    {
        return $this->attributes['id'];
    }

    public function getAuthPassword()
    {
        return $this->attributes['password'] ?? '';
    }

    public function getJWTIdentifier()
    {
        return $this->getAuthIdentifier(); // típicamente el ID
    }

    public function getJWTCustomClaims()
    {
        return [
            'username' => $this->attributes['username'] ?? null,

                   ]; // aquí puedes añadir claims personalizados si deseas
    }
}
