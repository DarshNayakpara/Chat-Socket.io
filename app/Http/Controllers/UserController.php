<?php

namespace App\Http\Controllers;

use Illuminate\Http\Request;
use App\Http\Requests;
use App\Http\Controllers\Controller;
//imprt user model
use App\Models\User;
class UserController extends Controller
{
    //
    public $users;

    public function index()
    {
        $this->users = User::where('id', '!=', auth()->user()->id)->get()->toArray();
        // dd($this->users);
        // dd($this->users);
        return view('dashboard')->with('users', $this->users);
    }
}
