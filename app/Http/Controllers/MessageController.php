<?php

namespace App\Http\Controllers;

use App\Models\User;
use App\Models\Message;
use Illuminate\Support\Facades\Auth;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\DB;

class MessageController extends Controller
{
    //
    public $userInfo;
    public $users;
     public function conversation($userid)
    {
        $this->users = User::where('id', '!=', auth()->user()->id)->get()->toArray();
        $this->userInfo =  User::where('id', $userid)->first();


        return view('conversation')->with(['userInfo'=>$this->userInfo,'users'=>$this->users]);
    }

}
