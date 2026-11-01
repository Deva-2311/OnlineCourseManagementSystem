import { ExecutionContext, ForbiddenException, UnauthorizedException } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { RolesGuard } from './roles.guard';
import { UserRole } from '../../users/enums/user-role.enum';

describe('RolesGuard', () => {
  let guard: RolesGuard;
  let reflector: jest.Mocked<Reflector>;

  const mockContext = (user: any): ExecutionContext => {
    return {
      getHandler: jest.fn(),
      getClass: jest.fn(),
      switchToHttp: jest.fn().mockReturnValue({
        getRequest: jest.fn().mockReturnValue({ user }),
      }),
    } as unknown as ExecutionContext;
  };

  beforeEach(() => {
    reflector = {
      getAllAndOverride: jest.fn(),
    } as unknown as jest.Mocked<Reflector>;
    guard = new RolesGuard(reflector);
  });

  it('should allow access if no roles are required on the route', () => {
    reflector.getAllAndOverride.mockReturnValue(undefined);
    const context = mockContext({ role: UserRole.STUDENT });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should reject with UnauthorizedException if user is not authenticated', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const context = mockContext(null);

    expect(() => guard.canActivate(context)).toThrow(UnauthorizedException);
  });

  it('should reject with ForbiddenException if user has missing or invalid role', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const context = mockContext({ id: 'user-id' }); // No role property

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should allow student access to student-only route', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.STUDENT]);
    const context = mockContext({ id: 'user-id', role: UserRole.STUDENT });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should deny student access to admin-only route with ForbiddenException', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const context = mockContext({ id: 'user-id', role: UserRole.STUDENT });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should deny instructor access to admin-only route with ForbiddenException', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const context = mockContext({ id: 'user-id', role: UserRole.INSTRUCTOR });

    expect(() => guard.canActivate(context)).toThrow(ForbiddenException);
  });

  it('should allow admin access to admin-only route', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN]);
    const context = mockContext({ id: 'user-id', role: UserRole.ADMIN });

    expect(guard.canActivate(context)).toBe(true);
  });

  it('should allow multi-role access when user matches one of the required roles', () => {
    reflector.getAllAndOverride.mockReturnValue([UserRole.ADMIN, UserRole.INSTRUCTOR]);
    const context = mockContext({ id: 'user-id', role: UserRole.INSTRUCTOR });

    expect(guard.canActivate(context)).toBe(true);
  });
});
