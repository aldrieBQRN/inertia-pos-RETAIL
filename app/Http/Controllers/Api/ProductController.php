<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Product;
use App\Services\ImageCompressionService;
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
            'cost_price' => 'nullable|numeric|min:0',
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

            $product->update($data);

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

            // Ensure the associated image file is removed from storage
            if ($product->image_path) {
                $oldPath = str_replace('/storage/', '', $product->image_path);
                Storage::disk('public')->delete($oldPath);
            }

            $product->delete();

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

        return response()->json([
            'message' => 'Stock updated successfully',
            'new_stock' => $product->stock_quantity
        ]);
    }
}
