import { BadRequestException, PayloadTooLargeException } from '@nestjs/common';
import { inspectUpload } from './files';

const IMAGES = ['image/jpeg', 'image/png', 'image/webp'];
const png = Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a, 0, 0]);
const jpeg = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0, 0]);
const pdf = Buffer.from('%PDF-1.7\n...');

const file = (buffer: Buffer, originalname = 'x') => ({
  buffer,
  size: buffer.length,
  originalname,
});

describe('inspectUpload', () => {
  it('detects PNG and JPEG from their bytes', () => {
    expect(inspectUpload(file(png), IMAGES, 1024)).toEqual({
      mime: 'image/png',
      ext: 'png',
    });
    expect(inspectUpload(file(jpeg), IMAGES, 1024)).toEqual({
      mime: 'image/jpeg',
      ext: 'jpg',
    });
  });

  it('ignores the file name: a PDF renamed to .png is rejected for images', () => {
    expect(() => inspectUpload(file(pdf, 'photo.png'), IMAGES, 1024)).toThrow(
      BadRequestException,
    );
  });

  it('rejects unknown content such as scripts', () => {
    expect(() =>
      inspectUpload(
        file(Buffer.from('<script>alert(1)</script>')),
        IMAGES,
        1024,
      ),
    ).toThrow(BadRequestException);
  });

  it('rejects missing files', () => {
    expect(() => inspectUpload(undefined, IMAGES, 1024)).toThrow(
      BadRequestException,
    );
  });

  it('rejects files over the size limit', () => {
    expect(() => inspectUpload(file(png), IMAGES, 4)).toThrow(
      PayloadTooLargeException,
    );
  });
});
