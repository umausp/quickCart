/**
 * The `sign`/`verify` surface `AuthService`/`JwtAuthGuard` actually use — async because the
 * Workers deployment's implementation (`jose`, Web Crypto-native) is inherently async; the
 * Node deployment's binding (`@nestjs/jwt`'s sync `JwtService`) is wrapped in a trivial
 * async adapter in `auth.module.ts` to match. Bound via the `JWT_PORT` token
 * (auth.tokens.ts) in each deployment's own composition — neither `AuthService` nor
 * `JwtAuthGuard` needs to know which one it's talking to.
 */
export interface JwtPort {
  sign(payload: object, options?: { expiresIn?: string | number }): Promise<string>;
  verify<T>(token: string): Promise<T>;
}
