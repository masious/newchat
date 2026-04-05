export class DomainError extends Error {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ForbiddenError extends DomainError {}
export class NotFoundError extends DomainError {}
export class BadRequestError extends DomainError {}
export class UnauthorizedError extends DomainError {}
