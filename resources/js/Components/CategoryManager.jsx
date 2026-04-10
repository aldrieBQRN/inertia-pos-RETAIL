import React, { useState, useEffect } from 'react';
import axios from 'axios';
import Swal from 'sweetalert2';

/**
 * CategoryManager Component
 * * Provides an administrative interface for creating, updating,
 * and deleting product categories with color coding.
 * * Uses SweetAlert2 for interactive confirmations and feedback.
 * * Role-based: Admins can manage, Staff can only view.
 */
export default function CategoryManager({ onClose, onUpdate, isAdmin }) {
    const [categories, setCategories] = useState([]);
    const [newCategory, setNewCategory] = useState('');
    const [newColor, setNewColor] = useState('#3B82F6'); // Default Blue
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        fetchCategories();
    }, []);

    /**
     * Retrieves the latest list of categories from the backend API.
     */
    const fetchCategories = async () => {
        try {
            const res = await axios.get('/api/categories');
            setCategories(res.data);
        } catch (error) {
            console.error('Failed to fetch categories:', error);
        }
    };

    /**
     * Handles the creation of a new product category with color.
     */
    const handleAdd = async (e) => {
        e.preventDefault();
        if (!isAdmin) return; // Security check
        if (!newCategory.trim()) return;

        try {
            setLoading(true);
            await axios.post('/api/categories', {
                name: newCategory,
                color: newColor
            });

            // Reset fields
            setNewCategory('');
            setNewColor('#3B82F6');

            fetchCategories();
            if (onUpdate) onUpdate(); // Triggers a refresh of the parent component's product data

            Swal.fire({
                icon: 'success',
                title: 'Category Added!',
                text: 'New category created successfully.',
                showConfirmButton: false,
                timer: 1500
            });
        } catch (error) {
            // Check for Laravel validation error (422)
            let errorMessage = 'Failed to add category';
            if (error.response?.status === 422 && error.response?.data?.errors?.name) {
                errorMessage = error.response.data.errors.name[0];
            } else if (error.response?.data?.message) {
                errorMessage = error.response.data.message;
            }

            Swal.fire({
                icon: error.response?.status === 422 ? 'warning' : 'error',
                title: error.response?.status === 422 ? 'Oops!' : 'Error',
                text: errorMessage,
                confirmButtonColor: '#3B82F6'
            });
        } finally {
            setLoading(false);
        }
    };

    /**
     * Removes a category from the system after user confirmation.
     */
    const handleDelete = async (id) => {
        if (!isAdmin) return; // Security check

        try {
            const result = await Swal.fire({
                title: 'Are you sure?',
                text: "Deleting this category may affect products assigned to it!",
                icon: 'warning',
                showCancelButton: true,
                confirmButtonColor: '#d33',
                cancelButtonColor: '#3085d6',
                confirmButtonText: 'Yes, delete it!'
            });

            if (result.isConfirmed) {
                await axios.delete(`/api/categories/${id}`);
                fetchCategories();
                if (onUpdate) onUpdate();

                Swal.fire({
                    icon: 'success',
                    title: 'Deleted!',
                    text: 'Category has been removed.',
                    showConfirmButton: false,
                    timer: 1500
                });
            }
        } catch (error) {
            Swal.fire({
                icon: 'error',
                title: 'Cannot Delete',
                text: error.response?.data?.message || 'This category might be in use.'
            });
        }
    };

    /**
     * Initiates a rename and color update operation for an existing category via a custom HTML SweetAlert.
     */
    const handleEdit = async (category) => {
        if (!isAdmin) return; // Security check

        const { value: formValues } = await Swal.fire({
            title: 'Edit Category',
            html: `
                <div class="flex flex-col gap-4 text-left px-2 mt-4">
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-1">Category Name</label>
                        <input id="swal-input-name" class="swal2-input !m-0 !w-full" value="${category.name}" placeholder="Enter category name...">
                    </div>
                    <div>
                        <label class="block text-sm font-bold text-gray-700 mb-1">Badge Color</label>
                        <div class="flex items-center gap-3">
                            <input id="swal-input-color" type="color" class="w-12 h-12 rounded cursor-pointer border-0 p-0" value="${category.color || '#3B82F6'}">
                            <span class="text-sm text-gray-500">Choose a color identifier</span>
                        </div>
                    </div>
                </div>
            `,
            focusConfirm: false,
            showCancelButton: true,
            confirmButtonText: 'Update Category',
            preConfirm: () => {
                const name = document.getElementById('swal-input-name').value;
                const color = document.getElementById('swal-input-color').value;
                if (!name.trim()) {
                    Swal.showValidationMessage('Category name is required');
                    return false;
                }
                return { name, color };
            }
        });

        if (formValues) {
            try {
                await axios.put(`/api/categories/${category.id}`, {
                    name: formValues.name,
                    color: formValues.color
                });

                fetchCategories();
                if (onUpdate) onUpdate();

                Swal.fire({
                    icon: 'success',
                    title: 'Updated!',
                    text: 'Category has been successfully updated.',
                    showConfirmButton: false,
                    timer: 1500
                });
            } catch (error) {
                // Check for Laravel validation error (422)
                let errorMessage = 'Failed to update category.';
                if (error.response?.status === 422 && error.response?.data?.errors?.name) {
                    errorMessage = error.response.data.errors.name[0];
                } else if (error.response?.data?.message) {
                    errorMessage = error.response.data.message;
                }

                Swal.fire({
                    icon: error.response?.status === 422 ? 'warning' : 'error',
                    title: error.response?.status === 422 ? 'Oops!' : 'Error',
                    text: errorMessage,
                    confirmButtonColor: '#3B82F6'
                });
            }
        }
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 backdrop-blur-sm animate-fade-in p-4">
            <div className="bg-white w-full max-w-md rounded-lg shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">

                {/* Modal Header */}
                <div className="bg-gray-50 px-4 py-3 sm:px-6 sm:py-4 border-b flex justify-between items-center shrink-0">
                    <h3 className="text-lg font-bold text-gray-800">
                        {isAdmin ? 'Manage Categories' : 'Category List'}
                    </h3>
                    <button onClick={onClose} className="text-gray-400 hover:text-red-500 text-2xl font-bold transition-colors">
                        &times;
                    </button>
                </div>

                <div className="p-4 sm:p-6 flex-1 overflow-y-auto">
                    {/* Inline Add Category Form - ONLY VISIBLE TO ADMINS */}
                    {isAdmin && (
                        <form onSubmit={handleAdd} className="flex gap-2 mb-6 bg-gray-50 p-3 rounded-md border border-gray-100">
                            <input
                                type="color"
                                title="Pick a category color"
                                className="w-10 h-10 rounded-md cursor-pointer border-0 shrink-0 bg-transparent p-0"
                                value={newColor}
                                onChange={(e) => setNewColor(e.target.value)}
                            />
                            <input
                                type="text"
                                className="flex-1 border-gray-300 rounded-md focus:ring-blue-500 focus:border-blue-500 text-sm py-2"
                                placeholder="New Category Name..."
                                value={newCategory}
                                onChange={(e) => setNewCategory(e.target.value)}
                            />
                            <button
                                type="submit"
                                disabled={loading}
                                className="bg-blue-600 text-white px-4 py-2 rounded-md font-bold hover:bg-blue-700 disabled:opacity-50 text-sm whitespace-nowrap shadow-sm transition-colors"
                            >
                                Add
                            </button>
                        </form>
                    )}

                    {/* Scrollable List of Existing Categories */}
                    <div className="space-y-2">
                        {categories.map(cat => (
                            <div key={cat.id} className="flex justify-between items-center p-3 bg-white rounded-md border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-all">

                                {/* COLOR BADGE AND NAME */}
                                <div className="flex items-center gap-3 overflow-hidden">
                                    <div
                                        className="w-4 h-4 rounded-full shrink-0 border border-black/10 shadow-sm"
                                        style={{ backgroundColor: cat.color || '#3B82F6' }}
                                    ></div>
                                    <span className="font-bold text-gray-700 truncate text-sm" title={cat.name}>
                                        {cat.name}
                                    </span>
                                </div>

                                {/* EDIT AND DELETE BUTTONS - ONLY VISIBLE TO ADMINS */}
                                {isAdmin && (
                                    <div className="flex gap-1 shrink-0">
                                        <button
                                            onClick={() => handleEdit(cat)}
                                            className="text-gray-400 hover:text-blue-600 hover:bg-blue-50 p-2 rounded-md transition-colors"
                                            title="Edit Category"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M16.862 4.487l1.687-1.688a1.875 1.875 0 112.652 2.652L6.832 19.82a4.5 4.5 0 01-1.897 1.13l-2.685.8.8-2.685a4.5 4.5 0 011.13-1.897L16.863 4.487zm0 0L19.5 7.125" />
                                            </svg>
                                        </button>
                                        <button
                                            onClick={() => handleDelete(cat.id)}
                                            className="text-gray-400 hover:text-red-600 hover:bg-red-50 p-2 rounded-md transition-colors"
                                            title="Delete Category"
                                        >
                                            <svg xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24" strokeWidth={2} stroke="currentColor" className="w-4 h-4">
                                                <path strokeLinecap="round" strokeLinejoin="round" d="M14.74 9l-.346 9m-4.788 0L9.26 9m9.968-3.21c.342.052.682.107 1.022.166m-1.022-.165L18.16 19.673a2.25 2.25 0 01-2.244 2.077H8.084a2.25 2.25 0 01-2.244-2.077L4.772 5.79m14.456 0a48.108 48.108 0 00-3.478-.397m-12 .562c.34-.059.68-.114 1.022-.165m0 0a48.11 48.11 0 013.478-.397m7.5 0v-.916c0-1.18-.91-2.164-2.09-2.201a51.964 51.964 0 00-3.32 0c-1.18.037-2.09 1.022-2.09 2.201v.916m7.5 0a48.667 48.667 0 00-7.5 0" />
                                            </svg>
                                        </button>
                                    </div>
                                )}
                            </div>
                        ))}
                        {categories.length === 0 && (
                            <div className="text-center py-8 text-gray-500 text-sm flex flex-col items-center">
                                <svg className="w-12 h-12 text-gray-200 mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9.568 3H5.25A2.25 2.25 0 003 5.25v4.318c0 .597.237 1.17.659 1.591l9.581 9.581c.699.699 1.78.872 2.607.33a18.095 18.095 0 005.223-5.223c.542-.827.369-1.908-.33-2.607L11.16 3.66A2.25 2.25 0 009.568 3z" />
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M6 6h.008v.008H6V6z" />
                                </svg>
                                No categories found.
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    );
}