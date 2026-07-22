class ApiError extends Error {
    statusCode: number;
    errors: any[];
    success: boolean;

    constructor(statusCode: number, message = 'Something went wrong', errors: any[] = [], stack = '') {
        super(message);
        this.statusCode = statusCode;
        // Error.message is non-enumerable, so res.json() would drop it without this.
        Object.defineProperty(this, 'message', {
            value: message,
            enumerable: true,
            writable: true,
            configurable: true,
        });
        this.success = false;
        this.errors = errors;
        if (stack) {
            this.stack = stack;
        } else {
            Error.captureStackTrace(this, this.constructor);
        }
    }
}

export { ApiError };
