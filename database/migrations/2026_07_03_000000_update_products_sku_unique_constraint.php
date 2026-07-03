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
        Schema::table('products', function (Blueprint $table) {
            // 1. Drop the old global unique constraint
            $table->dropUnique('products_sku_unique');

            // 2. Add the new composite unique constraint (SKU is unique PER Store)
            $table->unique(['store_id', 'sku']);
        });
    }

    /**
     * Reverse the migrations.
     */
    public function down(): void
    {
        Schema::table('products', function (Blueprint $table) {
            // 1. Drop the composite constraint
            $table->dropUnique(['store_id', 'sku']);

            // 2. Restore the original global unique constraint
            $table->unique('sku', 'products_sku_unique');
        });
    }
};
