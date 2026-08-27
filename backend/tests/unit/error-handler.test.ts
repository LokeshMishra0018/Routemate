import { describe, it, expect } from 'vitest';
import {
  AppError,
  ValidationError,
  UnauthorizedError,
  ForbiddenError,
  NotFoundError,
  ConflictError,
  RateLimitError,
} from '../../src/utils/errors.js';
import { createSuccessResponse, createErrorResponse, createPaginatedResponse } from '../../src/utils/response.js';

describe('Error Classes & Response Formatting', () => {
  it('should instantiate base AppError with default status 500', () => {
    const err = new AppError('Server error');
    expect(err.statusCode).toBe(500);
    expect(err.code).toBe('INTERNAL_SERVER_ERROR');
    expect(err.message).toBe('Server error');
  });

  it('should instantiate ValidationError with 400 status', () => {
    const err = new ValidationError('Bad input', { field: 'email' });
    expect(err.statusCode).toBe(400);
    expect(err.code).toBe('VALIDATION_ERROR');
    expect(err.details).toEqual({ field: 'email' });
  });

  it('should instantiate UnauthorizedError with 401 status', () => {
    const err = new UnauthorizedError();
    expect(err.statusCode).toBe(401);
    expect(err.code).toBe('UNAUTHORIZED');
  });

  it('should instantiate ForbiddenError with 403 status', () => {
    const err = new ForbiddenError();
    expect(err.statusCode).toBe(403);
    expect(err.code).toBe('FORBIDDEN');
  });

  it('should instantiate NotFoundError with 404 status', () => {
    const err = new NotFoundError('Trip not found');
    expect(err.statusCode).toBe(404);
    expect(err.code).toBe('NOT_FOUND');
    expect(err.message).toBe('Trip not found');
  });

  it('should instantiate ConflictError with 409 status', () => {
    const err = new ConflictError('Email already registered');
    expect(err.statusCode).toBe(409);
    expect(err.code).toBe('CONFLICT');
  });

  it('should instantiate RateLimitError with 429 status', () => {
    const err = new RateLimitError();
    expect(err.statusCode).toBe(429);
    expect(err.code).toBe('RATE_LIMIT_EXCEEDED');
  });

  it('should format standard API success and error responses properly', () => {
    const successRes = createSuccessResponse({ id: '123' });
    expect(successRes).toEqual({
      success: true,
      data: { id: '123' },
    });

    const errorRes = createErrorResponse('NOT_FOUND', 'Item not found', { id: '123' });
    expect(errorRes).toEqual({
      success: false,
      error: {
        code: 'NOT_FOUND',
        message: 'Item not found',
        details: { id: '123' },
      },
    });

    const paginatedRes = createPaginatedResponse(['item1', 'item2'], {
      page: 1,
      pageSize: 20,
      hasNextPage: false,
    });
    expect(paginatedRes.success).toBe(true);
    expect(paginatedRes.data).toHaveLength(2);
    expect(paginatedRes.pagination.page).toBe(1);
  });
});
