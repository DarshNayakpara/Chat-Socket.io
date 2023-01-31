<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     *
     * @return void
     */
    public function up()
    {
        Schema::create('user_messages', function (Blueprint $table) {
            $table->id();
            $table->unsignedInteger('message_id');
            $table->unsignedInteger('sender_id');
            $table->unsignedInteger('receiver_id');
            $table->tinyInteger('type')->comment('1:group Message', '2:Personal Message');
            $table->tinyInteger('status')->comment('1:unread', '2:read');
            $table->tinyInteger('deliver_status')->comment('1:delivered');
            $table->timestamps();
        });
    }

    /**
     * Reverse the migrations.
     *
     * @return void
     */
    public function down()
    {
        Schema::dropIfExists('user_messages');
    }
};
