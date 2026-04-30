<?php

namespace App\Services;

use Illuminate\Http\UploadedFile;
use Intervention\Image\ImageManager;
use Illuminate\Support\Facades\Storage;
use Illuminate\Support\Facades\Log;
use Illuminate\Support\Str;

/**
 * Image Compression Service
 *
 * Handles image compression and optimization for faster loading times.
 * Converts images to WebP format when possible and applies quality reduction.
 */
class ImageCompressionService
{
    private ImageManager $imageManager;

    public function __construct()
    {
        $this->imageManager = new ImageManager('gd');
    }

    /**
     * Generate a secure random filename
     */
    private function generateRandomFilename(string $extension = 'webp'): string
    {
        return bin2hex(random_bytes(16)) . '.' . $extension;
    }

    /**
     * Compress and store an image file
     *
     * @param UploadedFile $file The uploaded image file
     * @param string $path The storage path (e.g., 'avatars', 'products', 'receipts')
     * @param int $quality Compression quality (1-100), default 75
     * @param int $maxWidth Maximum width in pixels, null for no limit
     * @return string The stored file path
     */
    public function compressAndStore(
        UploadedFile $file,
        string $path = 'images',
        int $quality = 75,
        ?int $maxWidth = null
    ): string {
        try {
            // Read the file and compress
            $image = $this->imageManager->read($file->getStream());

            // Resize if maxWidth is specified
            if ($maxWidth) {
                $image = $image->scaleDown(width: $maxWidth);
            }

            // Convert to WebP and compress
            $webpImage = $image->toWebp(quality: $quality);

            // Generate a secure random filename with .webp extension
            $filename = $this->generateRandomFilename('webp');
            $fullPath = $path . '/' . $filename;

            // Store the compressed image - convert to string
            Storage::disk('public')->put($fullPath, (string)$webpImage);

            return $fullPath;
        } catch (\Exception $e) {
            // Fallback: store original with random filename if compression fails
            // Log the error but don't break the upload
            Log::warning('Image compression failed: ' . $e->getMessage());

            // Get the original extension
            $extension = $file->getClientOriginalExtension();
            $filename = $this->generateRandomFilename($extension);

            return Storage::disk('public')->putFileAs($path, $file, $filename);
        }
    }

    /**
     * Compress and store for product images
     * Products usually need larger images so we use 80 quality and 1200px max width
     *
     * @param UploadedFile $file The uploaded image file
     * @return string The stored file path
     */
    public function compressProductImage(UploadedFile $file): string
    {
        return $this->compressAndStore($file, 'products', quality: 80, maxWidth: 1200);
    }

    /**
     * Compress and store for avatar images
     * Avatars are small so we use 75 quality and 300px max width
     *
     * @param UploadedFile $file The uploaded image file
     * @return string The stored file path
     */
    public function compressAvatar(UploadedFile $file): string
    {
        return $this->compressAndStore($file, 'avatars', quality: 75, maxWidth: 300);
    }

    /**
     * Compress and store for receipt images
     * Receipts need to be readable so we use 85 quality and no width limit
     *
     * @param UploadedFile $file The uploaded image file
     * @return string The stored file path
     */
    public function compressReceipt(UploadedFile $file): string
    {
        return $this->compressAndStore($file, 'receipts', quality: 85);
    }

    /**
     * Compress and store for system logo
     * Logos are small and need to be crisp so we use 90 quality and 500px max width
     *
     * @param UploadedFile $file The uploaded image file
     * @return string The stored file path
     */
    public function compressLogo(UploadedFile $file): string
    {
        return $this->compressAndStore($file, 'system', quality: 90, maxWidth: 500);
    }
}
