import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';

const SIGNATURES: {
  mime: string;
  ext: string;
  test: (b: Buffer) => boolean;
}[] = [
  {
    mime: 'image/jpeg',
    ext: 'jpg',
    test: (b) => b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff,
  },
  {
    mime: 'image/png',
    ext: 'png',
    test: (b) =>
      b
        .subarray(0, 8)
        .equals(Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a])),
  },
  {
    mime: 'image/webp',
    ext: 'webp',
    test: (b) =>
      b.subarray(0, 4).toString('ascii') === 'RIFF' &&
      b.subarray(8, 12).toString('ascii') === 'WEBP',
  },
  {
    mime: 'application/pdf',
    ext: 'pdf',
    test: (b) => b.subarray(0, 5).toString('ascii') === '%PDF-',
  },
];

export type UploadedFileLike = {
  buffer: Buffer;
  size: number;
  originalname: string;
};

// Detects the real file type from its magic bytes (the client-sent mimetype is
// not trusted) and enforces the allow-list and size limit.
export function inspectUpload(
  file: UploadedFileLike | undefined,
  allowedMimes: string[],
  maxBytes: number,
) {
  if (!file?.buffer?.length)
    throw new BadRequestException('A file is required');
  if (file.size > maxBytes) {
    throw new PayloadTooLargeException(
      `File must be at most ${Math.round(maxBytes / 1024 / 1024)} MB`,
    );
  }
  const match = SIGNATURES.find((s) => s.test(file.buffer));
  if (!match || !allowedMimes.includes(match.mime)) {
    throw new BadRequestException(
      `Unsupported file type. Allowed: ${allowedMimes.map((m) => m.split('/')[1]).join(', ')}`,
    );
  }
  return { mime: match.mime, ext: match.ext };
}
