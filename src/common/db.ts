import {
  BadRequestException,
  ConflictException,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';

const logger = new Logger('Database');

type PostgrestErrorLike = {
  code?: string;
  message: string;
  details?: string | null;
  hint?: string | null;
};

// Maps a PostgREST/Postgres error to an HTTP exception without leaking SQL
// details to clients. The full error is logged server-side.
export function toHttpError(error: PostgrestErrorLike, context: string): Error {
  switch (error.code) {
    case '23505':
      return new ConflictException('Resource already exists');
    case '23503':
      return new BadRequestException('Referenced resource does not exist');
    case '23514':
    case '22P02':
    case '22007':
      return new BadRequestException('Invalid value');
    case 'PGRST116':
      return new NotFoundException('Resource not found');
    default:
      logger.error(`${context}: ${error.code ?? ''} ${error.message}`);
      return new InternalServerErrorException();
  }
}

// supabase-js responses are a success/failure union; this picks the success
// branch's `data` type (which is still nullable for maybeSingle()).
type Result = { data: unknown; error: PostgrestErrorLike | null };
type SuccessData<R extends Result> = Extract<R, { error: null }>['data'];

// Returns `data` or throws a mapped HTTP error.
export function unwrap<R extends Result>(
  result: R,
  context: string,
): SuccessData<R> {
  if (result.error) throw toHttpError(result.error, context);
  return result.data as SuccessData<R>;
}

// Like unwrap, but also throws 404 when the row is missing.
export function unwrapOne<R extends Result>(
  result: R,
  context: string,
  notFoundMessage = 'Resource not found',
): NonNullable<SuccessData<R>> {
  const data = unwrap(result, context);
  if (data === null || data === undefined) {
    throw new NotFoundException(notFoundMessage);
  }
  return data as NonNullable<SuccessData<R>>;
}

// Throws the mapped error for a count/head query, if any.
export function assertOk(
  error: PostgrestErrorLike | null,
  context: string,
): void {
  if (error) throw toHttpError(error, context);
}
