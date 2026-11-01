import { ExecutionContext, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { JwtAuthGuard } from './jwt-auth.guard';

describe('JwtAuthGuard', () => {
  let guard: JwtAuthGuard;
  let reflector: jest.Mocked<Reflector>;

  const mockContext = (): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({}),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    guard = new JwtAuthGuard(reflector);
  });

  it('should allow access to public routes without checking token', () => {
    reflector.getAllAndOverride.mockReturnValue(true);
    const context = mockContext();

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should return user when user is valid', () => {
    const user = { id: 'user-1', email: 'user@example.com' };
    expect(guard.handleRequest(null, user, null)).toBe(user);
  });

  it('should throw UnauthorizedException when token is expired (TokenExpiredError)', () => {
    expect(() =>
      guard.handleRequest(null, null, { name: 'TokenExpiredError' }),
    ).toThrow(UnauthorizedException);
    expect(() =>
      guard.handleRequest(null, null, { name: 'TokenExpiredError' }),
    ).toThrow('Access token has expired');
  });

  it('should throw UnauthorizedException when token is malformed (JsonWebTokenError)', () => {
    expect(() =>
      guard.handleRequest(null, null, { name: 'JsonWebTokenError' }),
    ).toThrow(UnauthorizedException);
    expect(() =>
      guard.handleRequest(null, null, { name: 'JsonWebTokenError' }),
    ).toThrow('Invalid or malformed access token');
  });

  it('should throw UnauthorizedException when user is missing without info', () => {
    expect(() => guard.handleRequest(null, null, null)).toThrow(UnauthorizedException);
  });
});
