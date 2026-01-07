import { S3Client, PutObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { config } from '../config/index.js';
import { logger } from './logger.js';

// ============================================
// AWS S3 Service
// ============================================

let s3Client: S3Client | null = null;

/**
 * Initialize S3 client
 */
export const getS3Client = (): S3Client | null => {
  if (!config.aws.accessKeyId || !config.aws.secretAccessKey || !config.aws.s3.bucket) {
    logger.warn('AWS S3 credentials not configured. File uploads will use local storage.');
    return null;
  }

  if (!s3Client) {
    s3Client = new S3Client({
      region: config.aws.region,
      credentials: {
        accessKeyId: config.aws.accessKeyId,
        secretAccessKey: config.aws.secretAccessKey,
      },
      ...(config.aws.s3.endpoint && {
        endpoint: config.aws.s3.endpoint,
        forcePathStyle: true, // For S3-compatible services
      }),
    });
  }

  return s3Client;
};

/**
 * Upload file to S3
 */
export const uploadToS3 = async (
  buffer: Buffer,
  key: string,
  contentType: string
): Promise<string> => {
  const client = getS3Client();
  if (!client) {
    throw new Error('S3 client not initialized. Please configure AWS credentials.');
  }

  const bucket = config.aws.s3.bucket;
  if (!bucket) {
    throw new Error('S3 bucket not configured');
  }

  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: buffer,
    ContentType: contentType,
    // Note: ACL is deprecated in newer S3 buckets, use bucket policy instead
    // ACL: 'public-read', // Uncomment if your bucket supports ACLs
  });

  await client.send(command);

  // Return public URL
  if (config.aws.s3.cdnUrl) {
    // Use CDN URL if configured (e.g., CloudFront)
    return `${config.aws.s3.cdnUrl}/${key}`;
  } else if (config.aws.s3.endpoint) {
    // For S3-compatible services
    return `${config.aws.s3.endpoint}/${bucket}/${key}`;
  } else {
    // Standard S3 URL
    return `https://${bucket}.s3.${config.aws.region}.amazonaws.com/${key}`;
  }
};

/**
 * Delete file from S3
 */
export const deleteFromS3 = async (key: string): Promise<void> => {
  const client = getS3Client();
  if (!client) {
    throw new Error('S3 client not initialized');
  }

  const bucket = config.aws.s3.bucket;
  if (!bucket) {
    throw new Error('S3 bucket not configured');
  }

  const command = new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  });

  await client.send(command);
};

