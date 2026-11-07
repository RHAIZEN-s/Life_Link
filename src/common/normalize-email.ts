import { Transform } from 'class-transformer';

// Trims and lowercases an email so lookups are case-insensitive.
export const NormalizeEmail = () =>
  Transform(({ value }: { value: unknown }) =>
    typeof value === 'string' ? value.trim().toLowerCase() : value,
  );
