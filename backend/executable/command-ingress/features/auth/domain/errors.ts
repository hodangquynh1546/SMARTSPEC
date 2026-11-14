/** An expected failure with an HTTP status and a stable code the frontend can show in the right place. */
export class AuthError extends Error {
  constructor(public status: number, public code: string, message: string) {
    super(message);
    Object.setPrototypeOf(this, AuthError.prototype); // low TS target: instanceof needs this
  }
}
