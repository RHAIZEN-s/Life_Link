import { applyDecorators } from '@nestjs/common';
import { Transform } from 'class-transformer';
import { IsLatitude, IsLongitude, IsOptional, Matches } from 'class-validator';
import { PHONE_REGEX } from './constants';

// Trims strings; turns empty strings into null so optional fields can be cleared.
export const TrimToNull = () =>
  Transform(({ value }: { value: unknown }) => {
    if (typeof value !== 'string') return value;
    const trimmed = value.trim();
    return trimmed === '' ? null : trimmed;
  });

export const Trim = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim() : value,
  );

// Accepts "9876543210", "+91 9876543210", "+91-98765 43210"; stores "+919876543210".
export const IsIndianPhone = () =>
  applyDecorators(
    Transform(({ value }: { value: unknown }) => {
      if (typeof value !== 'string') return value;
      const compact = value.replace(/[\s-]/g, '');
      if (/^[6-9]\d{9}$/.test(compact)) return `+91${compact}`;
      return compact;
    }),
    Matches(PHONE_REGEX, {
      message: 'phone must be a valid Indian mobile number',
    }),
  );

export const OptionalLatitude = () =>
  applyDecorators(IsOptional(), IsLatitude());
export const OptionalLongitude = () =>
  applyDecorators(IsOptional(), IsLongitude());
