<?php

use Illuminate\Database\Migrations\Migration;
use Illuminate\Database\Schema\Blueprint;
use Illuminate\Support\Facades\Schema;

return new class extends Migration
{
    /**
     * Run the migrations.
     */
    public function up(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // 1. Drop the old global unique constraint
            $table->dropUnique('users_account_number_unique');

            // 2. Add the new composite unique constraint (account_number is unique PER Store)
            $table->unique(['store_id', 'account_number']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('users', function (Blueprint $table) {
            // 1. Drop the composite constraint
            $table->dropUnique(['store_id', 'account_number']);

            // 2. Restore the original global unique constraint
            $table->unique('account_number', 'users_account_number_unique');
        });
    }
};
