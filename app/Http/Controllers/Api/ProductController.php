<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Services\ImageCompressionService;
use App\Services\ActivityService;
use Illuminate\Http\Request;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Validation\Rule;
use Illuminate\Support\Facades\Auth;

/**
 * ProductController
 * Handles administrative product management including inventory reconciliation,
 * media storage, and financial data processing for Multi-Tenant SaaS.
 */
class ProductController extends Controller
{
    /**
     * Display a listing of products with optional filters.
     */
    public function index(Request $request)
    {
        $query = Product::with('category');

        // Search constraint: filter by partial name or exact SKU matches
        if ($request->search) {
            $query->where(function ($q) use ($request) {
                $q->where('name', 'like', "%{$request->search}%")
                    ->orWhere('sku', 'like', "%{$request->search}%");
            });
        }

        // Category constraint: filter items within a specific classification
        if ($request->category) {
            $query->where('category_id', $request->category);
        }

        // Inventory constraint: identify products requiring replenishment (Qty <= 10)
        if ($request->low_stock === 'true') {
            $query->where('stock_quantity', '<=', 10);
        }

        $query->orderBy('created_at', 'desc');

        // Return unpaginated results for export operations or paginated for UI display
        if ($request->has('all')) {
            return $query->get();
        }

        return $query->paginate(10);
    }

    /**
     * Store a newly created product.
     */
    public function store(Request $request)
    {
        $request->validate([
            'name' => 'required|string|max:255',
            'category_id' => 'required|exists:categories,id',
            'price' => 'required|numeric|min:0',
            'cost_price' => 'required|numeric|min:0',
            'wholesale_price' => 'required|numeric|min:0',
            'stock_quantity' => 'required|integer|min:0',
            'sku' => [
                'required',
                'string',
                // Scoped unique validation: Only check inside THIS store_id
                Rule::unique('products', 'sku')->where(function ($query) {
                    return $query->where('store_id', Auth::user()->store_id);
                })
            ],
            'image' => 'nullable|image|max:2048',
        ]);

        try {
            $data = $request->all();

            // Convert decimal currency values to integers (cents)
            $data['price'] = $request->price * 100;
            if ($request->cost_price) {
                $data['cost_price'] = $request->cost_price * 100;
            }
            if ($request->wholesale_price) {
                $data['wholesale_price'] = $request->wholesale_price * 100;
            }

            // Process and store the product image file
            if ($request->hasFile('image')) {
                try {
                    $imageCompression = new ImageCompressionService();
                    $path = $imageCompression->compressProductImage($request->file('image'));
                    // FIXED: Added the /storage/ prefix to match the frontend and update method expectations
                    $data['image_path'] = '/storage/' . $path;
                } catch (\Exception $e) {
                    Log::error('Image compression failed: ' . $e->getMessage());
                    // Store original image as fallback
                    $data['image_path'] = '/storage/' . $request->file('image')->store('products', 'public');
                }
            }

            $product = Product::create($data);

            // Log the product creation (optional - controlled by audit config)
            ActivityService::logCreate('Product', $product->id, "Created product: {$product->name} (SKU: {$product->sku})", [
                'name' => $product->name,
                'sku' => $product->sku,
                'price' => $product->price / 100,
                'stock' => $product->stock_quantity,
            ]);

            return response()->json($product->fresh(), 201);
        } catch (\Exception $e) {
            Log::error('Product creation failed: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to create product: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Update an existing product.
     */
    public function update(Request $request, $id)
    {
        $product = Product::findOrFail($id);

        $request->validate([
            'name' => 'sometimes|string|max:255',
            'category_id' => 'sometimes|exists:categories,id',
            'price' => 'sometimes|numeric|min:0',
            'cost_price' => 'nullable|numeric|min:0',
            'wholesale_price' => 'nullable|numeric|min:0',
            'stock_quantity' => 'sometimes|integer|min:0',
            'image' => 'nullable|image|max:2048',
            'sku' => [
                'sometimes',
                'string',
                // FIXED: Scoped unique validation that ignores the CURRENT product's ID
                Rule::unique('products', 'sku')->where(function ($query) {
                    return $query->where('store_id', Auth::user()->store_id);
                })->ignore($id)
            ],
        ]);

        try {
            $data = $request->except(['image']);

            // Re-calculate currency values if updated
            if ($request->has('price')) {
                $data['price'] = $request->price * 100;
            }
            if ($request->has('cost_price')) {
                $data['cost_price'] = $request->cost_price * 100;
            }
            if ($request->has('wholesale_price')) {
                $data['wholesale_price'] = $request->wholesale_price !== null ? ($request->wholesale_price * 100) : null;
            }

            // Handle image replacement
            if ($request->hasFile('image')) {
                if ($product->image_path) {
                    $oldPath = str_replace('/storage/', '', $product->image_path);
                    Storage::disk('public')->delete($oldPath);
                }

                try {
                    $imageCompression = new ImageCompressionService();
                    $path = $imageCompression->compressProductImage($request->file('image'));
                    $data['image_path'] = '/storage/' . $path;
                } catch (\Exception $e) {
                    Log::error('Image compression failed: ' . $e->getMessage());
                    // Store original image as fallback
                    $data['image_path'] = '/storage/' . $request->file('image')->store('products', 'public');
                }
            }

            $oldValues = [
                'name' => $product->name,
                'sku' => $product->sku,
                'price' => $product->price / 100,
                'stock' => $product->stock_quantity,
            ];

            $product->update($data);

            // Log the product update (optional - controlled by audit config)
            ActivityService::logUpdate('Product', $product->id, "Updated product: {$product->name} (SKU: {$product->sku})", $oldValues, [
                'name' => $product->name,
                'sku' => $product->sku,
                'price' => $product->price / 100,
                'stock' => $product->stock_quantity,
            ]);

            return response()->json($product->fresh());
        } catch (\Exception $e) {
            Log::error('Product update failed: ' . $e->getMessage());
            return response()->json(['error' => 'Failed to update product: ' . $e->getMessage()], 500);
        }
    }

    /**
     * Remove a product from the database.
     */
    public function destroy($id)
    {
        try {
            // Because of the Global Scope, findOrFail will automatically return a 404
            // if a user tries to delete a product belonging to another store.
            $product = Product::findOrFail($id);

            // Store product info for logging before deletion
            $productInfo = [
                'name' => $product->name,
                'sku' => $product->sku,
                'price' => $product->price / 100,
                'stock' => $product->stock_quantity,
            ];

            // Ensure the associated image file is removed from storage
            if ($product->image_path) {
                $oldPath = str_replace('/storage/', '', $product->image_path);
                Storage::disk('public')->delete($oldPath);
            }

            $product->delete();

            // Log the product deletion (critical)
            ActivityService::logDelete('Product', $id, "Deleted product: {$product->name} (SKU: {$product->sku})", $productInfo);

            return response()->json(['message' => 'Product deleted successfully'], 200);
        } catch (\Illuminate\Database\QueryException $e) {
            // Integrity check: Prevent deletion if the product is referenced in transaction logs
            if ($e->getCode() == "23000") {
                return response()->json([
                    'error' => 'This product is linked to existing transaction records and cannot be deleted.'
                ], 409);
            }

            return response()->json(['error' => 'A database error occurred.'], 500);
        } catch (\Exception $e) {
            return response()->json(['error' => 'A server error occurred.'], 500);
        }
    }

    /**
     * Rapidly adjust inventory levels for a specific item.
     */
    public function adjustStock(Request $request, $id)
    {
        $request->validate([
            'quantity' => 'required|integer|min:1'
        ]);

        $product = Product::findOrFail($id);

        // Atomic increment of the stock level
        $product->increment('stock_quantity', $request->quantity);

        // Log the stock adjustment (optional - controlled by audit config)
        ActivityService::logStockAdjust($id, $request->quantity, "Stock adjusted for: {$product->name}");

        return response()->json([
            'message' => 'Stock updated successfully',
            'new_stock' => $product->stock_quantity
        ]);
    }

    /**
     * Import a list of products from JSON.
     */
    public function bulkImport(Request $request)
    {
        $request->validate([
            'products' => 'required|array|min:1',
            'products.*.name' => 'required|string|max:255',
            'products.*.sku' => 'required|string',
            'products.*.price' => 'required|numeric|min:0',
            'products.*.cost_price' => 'nullable|numeric|min:0',
            'products.*.wholesale_price' => 'nullable|numeric|min:0',
            'products.*.stock_quantity' => 'required|integer|min:0',
            'products.*.category_name' => 'nullable|string|max:255',
        ]);

        \Illuminate\Support\Facades\DB::beginTransaction();

        try {
            $storeId = Auth::user()->store_id;
            $importedCount = 0;
            $skippedCount = 0;
            $skippedSkus = [];
            $errors = [];
            $rowNumber = 1; // Header is at row 1 in Excel template, data starts at row 2

            foreach ($request->products as $item) {
                $displayRow = $item['rowNum'] ?? ($importedCount + 2);
                
                // Track missing/invalid fields for this specific row
                $rowErrors = [];
                
                if (empty($item['sku'])) {
                    $rowErrors[] = "Barcode/SKU is empty";
                }
                if (empty($item['name'])) {
                    $rowErrors[] = "Product Name is empty";
                }
                if (empty($item['category_name'])) {
                    $rowErrors[] = "Category Name is empty";
                }
                if (!isset($item['price']) || $item['price'] === '' || !is_numeric($item['price'])) {
                    $rowErrors[] = "Retail Price must be a valid number";
                }
                if (!isset($item['wholesale_price']) || $item['wholesale_price'] === '' || !is_numeric($item['wholesale_price'])) {
                    $rowErrors[] = "Wholesale Price must be a valid number";
                }
                if (!isset($item['cost_price']) || $item['cost_price'] === '' || !is_numeric($item['cost_price'])) {
                    $rowErrors[] = "Cost Price must be a valid number";
                }
                if (!isset($item['stock_quantity']) || $item['stock_quantity'] === '' || !is_numeric($item['stock_quantity'])) {
                    $rowErrors[] = "Stock Quantity must be a valid number";
                }

                if (!empty($rowErrors)) {
                    $errors[] = "Row {$displayRow}: " . implode(', ', $rowErrors);
                    continue;
                }

                $sku = trim($item['sku']);

                // Find existing product by SKU under this store
                $productExists = Product::where('sku', $sku)->where('store_id', $storeId)->exists();

                if ($productExists) {
                    $skippedCount++;
                    $skippedSkus[] = $sku;
                    continue;
                }

                // Find or create category
                $categoryId = null;
                $categoryName = trim($item['category_name']);
                $category = \App\Models\Category::where('name', $categoryName)->first();
                if (!$category) {
                    $category = \App\Models\Category::create([
                        'name' => $categoryName,
                        'color' => '#' . substr(md5($categoryName), 0, 6)
                    ]);
                }
                $categoryId = $category->id;

                $productData = [
                    'name' => trim($item['name']),
                    'category_id' => $categoryId,
                    'price' => (int) round($item['price'] * 100),
                    'cost_price' => (int) round($item['cost_price'] * 100),
                    'wholesale_price' => (int) round($item['wholesale_price'] * 100),
                    'stock_quantity' => (int) $item['stock_quantity'],
                    'sku' => $sku,
                    'is_active' => true,
                    'store_id' => $storeId, // Ensure store_id is set
                ];

                Product::create($productData);
                $importedCount++;
            }

            if (!empty($errors)) {
                \Illuminate\Support\Facades\DB::rollBack();
                return response()->json([
                    'success' => false,
                    'message' => 'Import validation failed. Please correct the Excel file and try again.',
                    'errors' => $errors
                ], 422);
            }

            \Illuminate\Support\Facades\DB::commit();

            return response()->json([
                'success' => true,
                'message' => "Successfully imported {$importedCount} products.",
                'imported_count' => $importedCount,
                'skipped_count' => $skippedCount,
                'skipped_skus' => $skippedSkus,
            ]);
        } catch (\Exception $e) {
            \Illuminate\Support\Facades\DB::rollBack();
            Log::error('Bulk import failed: ' . $e->getMessage());
            return response()->json([
                'success' => false,
                'message' => 'Failed to import products: ' . $e->getMessage()
            ], 500);
        }
    }

    /**
     * Get the next sequential auto-incrementing SKU prefixed with 'ITEM-'.
     */
    public function getNextSku()
    {
        $storeId = Auth::user()->store_id;

        // Fetch all product SKUs starting with ITEM- for this store
        $skus = Product::where('store_id', $storeId)
            ->where('sku', 'like', 'ITEM-%')
            ->pluck('sku');

        $maxNumber = 0;
        foreach ($skus as $sku) {
            if (preg_match('/^ITEM-(\d+)$/', $sku, $matches)) {
                $num = (int)$matches[1];
                if ($num > $maxNumber) {
                    $maxNumber = $num;
                }
            }
        }

        $nextNumber = $maxNumber + 1;
        $nextSku = 'ITEM-' . str_pad($nextNumber, 5, '0', STR_PAD_LEFT);

        return response()->json([
            'success' => true,
            'next_sku' => $nextSku
        ]);
    }
}
