class ApiError extends Error {
    statusCode: number;
    errors: any[];
    success: boolean;

    constructor(statusCode: number, message = 'Something went wrong', errors: any[] = [], stack = '') {
        super(message);
        this.statusCode = statusCode;
        this.message = message;
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
