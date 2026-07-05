import { NextRequest, NextResponse } from 'next/server';
import { formatFileSize } from '@/lib/gs/file-upload';

export async function GET(_req: NextRequest) {
  const stats = {
    totalFiles: 145,
    totalSize: 1_258_291_200,
    byBucket: {
      'gs-documentos': { files: 89, size: 734_003_200 },
      'gs-certificados': { files: 42, size: 419_430_400 },
      'gs-notas-fiscais': { files: 14, size: 104_857_600 },
    },
    byType: {
      RG: 34,
      CNH: 28,
      COMPROVANTE: 15,
      CERTIFICADO: 42,
      NF: 14,
      OUTROS: 12,
    },
  };

  return NextResponse.json({
    ...stats,
    totalSizeFormatted: formatFileSize(stats.totalSize),
    byBucket: Object.fromEntries(
      Object.entries(stats.byBucket).map(([key, val]) => [
        key,
        { ...val, sizeFormatted: formatFileSize(val.size) },
      ])
    ),
  });
}
