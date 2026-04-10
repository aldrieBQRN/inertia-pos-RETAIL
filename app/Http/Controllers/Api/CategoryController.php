<?php

namespace App\Http\Controllers\Api;

use App\Http\Controllers\Controller;
use App\Models\Category;
use Illuminate\Http\Request;
use Illuminate\Validation\Rule;

/**
 * Class CategoryController
 * Handles API operations for managing product categories in the POS system.
 */
class CategoryController extends Controller
{
    public function index()
    {
        return Category::orderBy('name')->get();
    }

    public function store(Request $request)
    {
        // Validate with CUSTOM friendly error messages
        $request->validate([
            'name' => [
                'required',
                'string',
                'max:50',
                Rule::unique('categories', 'name')->where(function ($query) use ($request) {
                    return $query->where('store_id', $request->user()->store_id);
                })
            ],
            'color' => 'nullable|string|max:10'
        ], [
            // This translates the scary SQL error into a friendly alert!
            'name.unique' => 'You already have a category named "' . $request->name . '". Please choose a different name.',
            'name.required' => 'Please provide a name for your new category.',
        ]);

        $category = Category::create([
            'name' => $request->name,
            'color' => $request->color ?? '#3B82F6',
        ]);

        return response()->json($category, 201);
    }

    public function update(Request $request, $id)
    {
        $category = Category::findOrFail($id);

        // Validate with CUSTOM friendly error messages
        $request->validate([
            'name' => [
                'required',
                'string',
                'max:50',
                Rule::unique('categories', 'name')->where(function ($query) use ($request) {
                    return $query->where('store_id', $request->user()->store_id);
                })->ignore($id)
            ],
            'color' => 'nullable|string|max:10'
        ], [
            // Friendly alert for updates too
            'name.unique' => 'Another category is already using the name "' . $request->name . '".',
            'name.required' => 'The category name cannot be empty.',
        ]);

        $category->update([
            'name' => $request->name,
            'color' => $request->color ?? $category->color,
        ]);

        return response()->json($category);
    }

    public function destroy($id)
    {
        $category = Category::findOrFail($id);

        if ($category->products()->count() > 0) {
            return response()->json([
                'message' => 'Cannot delete: This category currently contains products. Please reassign those products first.'
            ], 400);
        }

        $category->delete();

        return response()->json(['message' => 'Category deleted']);
    }
}
