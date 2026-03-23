import { NextRequest, NextResponse } from 'next/server';
import { BlobServiceClient, generateBlobSASQueryParameters, BlobSASPermissions, StorageSharedKeyCredential } from '@azure/storage-blob';

export async function POST(request: NextRequest) {
  try {
    const { containerName, blobName } = await request.json();

    if (!containerName || !blobName) {
      return NextResponse.json(
        { error: 'containerName and blobName are required' },
        { status: 400 }
      );
    }

    const accountName = process.env.AZURE_STORAGE_ACCOUNT_NAME;
    const accountKey = process.env.AZURE_STORAGE_ACCOUNT_KEY;

    if (!accountName || !accountKey) {
      return NextResponse.json(
        { error: 'Azure Storage credentials not configured' },
        { status: 500 }
      );
    }

    // Create shared key credential
    const sharedKeyCredential = new StorageSharedKeyCredential(accountName, accountKey);

    // Generate SAS token (valid for 1 hour)
    const sasToken = generateBlobSASQueryParameters(
      {
        containerName,
        blobName,
        permissions: BlobSASPermissions.parse('r'), // Read-only
        startsOn: new Date(),
        expiresOn: new Date(Date.now() + 3600 * 1000), // 1 hour
      },
      sharedKeyCredential
    ).toString();

    const sasUrl = `https://${accountName}.blob.core.windows.net/${containerName}/${blobName}?${sasToken}`;

    return NextResponse.json({
      sasUrl,
      sasToken,
      expiresAt: Date.now() + 3600 * 1000
    });

  } catch (error: any) {

    console.error('SAS token generation error:', error);
    return NextResponse.json(
      { error: 'Failed to generate SAS token', details: error.message },
      { status: 500 }
    );
  }
}
