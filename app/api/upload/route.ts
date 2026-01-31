/**
 * File Upload API Route
 *
 * Handles document uploads to Cloudflare R2 storage.
 * - Requires authentication
 * - Verifies user owns the company
 * - Validates file type, size, and magic bytes
 * - Sanitizes filenames and company IDs to prevent path traversal
 * - Uploads to R2 and returns presigned URL for ML service access
 *
 * POST /api/upload
 */

import { NextRequest, NextResponse } from 'next/server';
import { S3Client, PutObjectCommand, GetObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import { ConvexHttpClient } from 'convex/browser';
import { api } from '@/convex/_generated/api';
import { Id } from '@/convex/_generated/dataModel';
import crypto from 'crypto';
import { getSession } from '@/lib/auth-server';
import { validateCSRF } from '@/lib/csrf';
import { checkRateLimit, RateLimits, createRateLimitHeaders, getRateLimitIdentifier } from '@/lib/rate-limit';

// Environment variables - validated at runtime in the handler
const BUCKET_NAME = process.env.R2_BUCKET_NAME || 'reconciled-documents';
const CONVEX_URL = process.env.NEXT_PUBLIC_CONVEX_URL;

/**
 * Get validated R2 configuration at runtime
 * Throws if credentials are missing
 */
function getR2Config() {
  const R2_ACCOUNT_ID = process.env.R2_ACCOUNT_ID;
  const R2_ACCESS_KEY_ID = process.env.R2_ACCESS_KEY_ID;
  const R2_SECRET_ACCESS_KEY = process.env.R2_SECRET_ACCESS_KEY;

  if (!R2_ACCOUNT_ID || !R2_ACCESS_KEY_ID || !R2_SECRET_ACCESS_KEY) {
    throw new Error(
      'R2 credentials not configured. Set R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, and R2_SECRET_ACCESS_KEY environment variables.'
    );
  }

  return {
    accountId: R2_ACCOUNT_ID,
    client: new S3Client({
      region: 'auto',
      endpoint: `https://${R2_ACCOUNT_ID}.r2.cloudflarestorage.com`,
      credentials: {
        accessKeyId: R2_ACCESS_KEY_ID,
        secretAccessKey: R2_SECRET_ACCESS_KEY,
      },
    }),
  };
}

/**
 * Get Convex client for server-side queries
 */
function getConvexClient() {
  if (!CONVEX_URL) {
    throw new Error('NEXT_PUBLIC_CONVEX_URL is not configured');
  }
  return new ConvexHttpClient(CONVEX_URL);
}

// Allowed file types
const ALLOWED_TYPES = [
  'application/pdf',
  'image/jpeg',
  'image/png',
  'image/webp',
  'text/csv',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
];

// Max file size (50MB)
const MAX_FILE_SIZE = 50 * 1024 * 1024;

// File extension to MIME type mapping
const EXTENSION_TO_MIME: Record<string, string> = {
  pdf: 'application/pdf',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg',
  png: 'image/png',
  webp: 'image/webp',
  csv: 'text/csv',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
};

/**
 * Magic number (file signature) validation
 * Prevents attackers from uploading malicious files with spoofed extensions
 */
const MAGIC_NUMBERS: Record<string, number[]> = {
  pdf: [0x25, 0x50, 0x44, 0x46], // %PDF
  jpg: [0xff, 0xd8, 0xff],
  jpeg: [0xff, 0xd8, 0xff],
  png: [0x89, 0x50, 0x4e, 0x47], // .PNG
  webp: [0x52, 0x49, 0x46, 0x46], // RIFF (WebP container)
  // CSV, XLS, XLSX are text-based or complex formats - validated by parser
};

/**
 * Validate file magic bytes match expected type
 */
function validateFileMagic(buffer: Buffer, extension: string): boolean {
  const magic = MAGIC_NUMBERS[extension.toLowerCase()];
  if (!magic) {
    // Text-based formats (CSV) or complex formats (XLS/XLSX) - skip magic check
    return ['csv', 'xls', 'xlsx'].includes(extension.toLowerCase());
  }
  return magic.every((byte, i) => buffer[i] === byte);
}

/**
 * Sanitize filename to prevent path traversal attacks
 * Removes dangerous characters and limits length
 */
function sanitizeFilename(name: string): string {
  // Remove path separators and null bytes
  const sanitized = name
    .replace(/[/\\:*?"<>|\x00]/g, '_')
    .replace(/\.\./g, '_')
    .trim();
  // Limit length
  return sanitized.slice(0, 100);
}

/**
 * Validate company ID format (Convex IDs are alphanumeric)
 * Prevents injection attacks via companyId parameter
 */
function validateCompanyId(id: string): boolean {
  // Convex IDs are alphanumeric strings, typically 24-32 characters
  return /^[a-zA-Z0-9_-]{10,64}$/.test(id);
}

export async function POST(request: NextRequest) {
  try {
    // SECURITY: CSRF validation
    const csrf = validateCSRF(request);
    if (!csrf.valid) {
      return NextResponse.json(
        { error: csrf.error },
        { status: 403 }
      );
    }

    // SECURITY: Verify user is authenticated
    const session = await getSession();
    if (!session) {
      return NextResponse.json(
        { error: 'Unauthorized: Please sign in' },
        { status: 401 }
      );
    }

    // SECURITY: Rate limiting (10 uploads per minute)
    const rateLimitResult = checkRateLimit(
      getRateLimitIdentifier(session),
      'upload',
      RateLimits.upload
    );
    if (!rateLimitResult.success) {
      return NextResponse.json(
        { error: 'Too many upload requests. Please try again later.' },
        { status: 429, headers: createRateLimitHeaders(rateLimitResult) }
      );
    }

    // Parse multipart form data
    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const companyId = formData.get('companyId') as string | null;
    const documentType = formData.get('documentType') as string | null;

    // Validate required fields
    if (!file) {
      return NextResponse.json(
        { error: 'No file provided' },
        { status: 400 }
      );
    }

    if (!companyId) {
      return NextResponse.json(
        { error: 'Company ID is required' },
        { status: 400 }
      );
    }

    // SECURITY: Validate company ID format to prevent injection
    if (!validateCompanyId(companyId)) {
      return NextResponse.json(
        { error: 'Invalid company ID format' },
        { status: 400 }
      );
    }

    // SECURITY: Verify user owns this company
    const convex = getConvexClient();
    const company = await convex.query(api.companies.get, {
      id: companyId as Id<'companies'>,
    });

    if (!company) {
      return NextResponse.json(
        { error: 'Company not found' },
        { status: 404 }
      );
    }

    // Check ownership by querying user by WorkOS ID
    const user = await convex.query(api.users.getByWorkosId, {
      workosId: session.workosId,
    });

    if (!user || company.ownerId !== user._id) {
      return NextResponse.json(
        { error: 'Access denied: You do not own this company' },
        { status: 403 }
      );
    }

    // Validate file type
    const fileType = file.type || guessTypeFromName(file.name);
    if (!ALLOWED_TYPES.includes(fileType)) {
      // SECURITY: Don't leak specific file type to prevent enumeration attacks
      // Log the actual type server-side for debugging
      console.warn(`Upload rejected: File type not allowed: ${fileType}`);
      return NextResponse.json(
        { error: 'File type not allowed' },
        { status: 400 }
      );
    }

    // Validate file size
    if (file.size > MAX_FILE_SIZE) {
      return NextResponse.json(
        { error: `File too large. Maximum size is ${MAX_FILE_SIZE / 1024 / 1024}MB` },
        { status: 400 }
      );
    }

    // Get extension and sanitize filename
    const extension = getExtension(file.name);
    const sanitizedFilename = sanitizeFilename(file.name);

    // Convert file to buffer
    const buffer = Buffer.from(await file.arrayBuffer());

    // SECURITY: Validate file magic bytes match claimed extension
    if (!validateFileMagic(buffer, extension)) {
      return NextResponse.json(
        { error: 'File content does not match file extension' },
        { status: 400 }
      );
    }

    // Generate unique storage ID with sanitized company ID
    const storageId = generateStorageId(companyId, extension);

    // Get R2 configuration (validates credentials at runtime)
    const r2Config = getR2Config();

    // Upload to R2
    await r2Config.client.send(
      new PutObjectCommand({
        Bucket: BUCKET_NAME,
        Key: storageId,
        Body: buffer,
        ContentType: fileType,
        Metadata: {
          originalName: sanitizedFilename,
          companyId: companyId,
          documentType: documentType || 'other',
          uploadedAt: new Date().toISOString(),
        },
      })
    );

    // Generate presigned URL for ML service access (1 hour expiry)
    const getCommand = new GetObjectCommand({
      Bucket: BUCKET_NAME,
      Key: storageId,
    });
    const presignedUrl = await getSignedUrl(r2Config.client, getCommand, {
      expiresIn: 3600, // 1 hour
    });

    return NextResponse.json({
      success: true,
      storageId,
      storageUrl: presignedUrl,
      fileName: sanitizedFilename,
      fileType: extension,
      fileSize: file.size,
      contentType: fileType,
    });
  } catch (error) {
    console.error('Upload error:', error);

    // Check for specific error types
    if (error instanceof Error) {
      if (error.message.includes('credentials')) {
        return NextResponse.json(
          { error: 'Storage configuration error' },
          { status: 500 }
        );
      }
      if (error.message === 'Unauthorized') {
        return NextResponse.json(
          { error: 'Unauthorized: Please sign in' },
          { status: 401 }
        );
      }
    }

    return NextResponse.json(
      { error: 'Failed to upload file' },
      { status: 500 }
    );
  }
}

/**
 * Generate a unique storage ID for the file
 */
function generateStorageId(companyId: string, extension: string): string {
  const timestamp = Date.now();
  const randomBytes = crypto.randomBytes(8).toString('hex');
  return `${companyId}/${timestamp}-${randomBytes}.${extension}`;
}

/**
 * Get file extension from filename
 */
function getExtension(filename: string): string {
  const parts = filename.split('.');
  return parts.length > 1 ? parts.pop()!.toLowerCase() : '';
}

/**
 * Guess MIME type from filename when not provided
 */
function guessTypeFromName(filename: string): string {
  const ext = getExtension(filename);
  return EXTENSION_TO_MIME[ext] || 'application/octet-stream';
}

// Note: In App Router, bodyParser is automatically disabled for formData
// No additional configuration needed
