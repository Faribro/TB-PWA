/**
 * lib/ocr/imagePreprocessor.ts
 *
 * Production-grade adaptive image preprocessing for OCR.
 * Detects image characteristics and applies profile-specific enhancement.
 */

import sharp from 'sharp';

export type ImageProfile = 'faint' | 'dark' | 'blurry' | 'standard';

export interface PreprocessResult {
  buffer: Buffer;
  profile: ImageProfile;
  originalDimensions: { width: number; height: number };
  processedDimensions: { width: number; height: number };
  processingMs: number;
}

/**
 * Adaptive preprocessing pipeline that detects image characteristics
 * and applies the right enhancement profile for OCR.
 */
export async function preprocessRegisterImage(
  inputBuffer: Buffer,
  mimeType: string = 'image/jpeg'
): Promise<PreprocessResult> {
  const startMs = Date.now();

  // Skip preprocessing for PDFs entirely
  if (mimeType === 'application/pdf') {
    throw new Error('PDFs should not be preprocessed');
  }

  // Step 1: Analyze image metadata
  const metadata = await sharp(inputBuffer).metadata();
  const originalW = metadata.width ?? 1000;
  const originalH = metadata.height ?? 1400;

  // Step 2: Get image stats to detect profile
  const stats = await sharp(inputBuffer)
    .grayscale()
    .stats();

  const meanBrightness = stats.channels[0].mean; // 0-255
  const stdDeviation = stats.channels[0].stdev; // spread

  // Detect image profile from statistics
  let profile: ImageProfile;
  if (meanBrightness > 200 && stdDeviation < 30) {
    profile = 'faint'; // very bright/washed out
  } else if (meanBrightness < 80) {
    profile = 'dark'; // dark/underexposed
  } else if (stdDeviation < 20) {
    profile = 'blurry'; // low variance = blurry
  } else {
    profile = 'standard';
  }

  console.log(`[preprocessor] Profile: ${profile}, ` +
    `mean: ${meanBrightness.toFixed(1)}, ` +
    `std: ${stdDeviation.toFixed(1)}`);

  // Step 3: Calculate target dimensions
  // Upscale to ensure minimum 200 DPI equivalent
  // Target: at least 2400px on the longer axis
  const longerAxis = Math.max(originalW, originalH);
  const scaleFactor = longerAxis < 2400
    ? Math.min(2400 / longerAxis, 3.0) // max 3x upscale
    : 1.0; // already large enough

  const targetW = Math.round(originalW * scaleFactor);
  const targetH = Math.round(originalH * scaleFactor);

  // Step 4: Apply profile-specific pipeline
  let pipeline = sharp(inputBuffer)
    .resize(targetW, targetH, {
      kernel: sharp.kernel.lanczos3, // best quality upscale
      fit: 'fill'
    })
    .grayscale();

  if (profile === 'faint') {
    // Faint text: aggressive contrast + threshold
    pipeline = pipeline
      .normalize() // stretch histogram to full range
      .modulate({ brightness: 0.85 }) // darken slightly
      .linear(1.8, -(128 * 0.8)) // contrast stretch
      .threshold(160) // binarize at higher threshold
      .sharpen({ sigma: 1.5, m1: 1.5, m2: 0.5 });
  } else if (profile === 'dark') {
    // Dark image: brighten then normalize
    pipeline = pipeline
      .modulate({ brightness: 1.4 })
      .normalize()
      .linear(1.4, -(128 * 0.4))
      .threshold(128)
      .sharpen({ sigma: 1.0 });
  } else if (profile === 'blurry') {
    // Blurry: sharpen aggressively before threshold
    pipeline = pipeline
      .sharpen({ sigma: 2.5, m1: 3.0, m2: 0.5 })
      .normalize()
      .threshold(140);
  } else {
    // Standard: balanced pipeline
    pipeline = pipeline
      .normalize()
      .linear(1.5, -(128 * 0.5))
      .threshold(145)
      .sharpen({ sigma: 1.2, m1: 1.2, m2: 0.3 });
  }

  // Step 5: Output as PNG (lossless — never re-JPEG after processing)
  const processedBuffer = await pipeline
    .png({ compressionLevel: 6 })
    .toBuffer();

  return {
    buffer: processedBuffer,
    profile,
    originalDimensions: { width: originalW, height: originalH },
    processedDimensions: { width: targetW, height: targetH },
    processingMs: Date.now() - startMs,
  };
}
