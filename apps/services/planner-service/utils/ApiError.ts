class ApiError extends Error {
    statusCode: number;
    errors: any[];
    success: boolean;
    constructor(statusCode: number, message = "something went wrong", errors = [], stack = "") {
        super(message)
        this.statusCode = statusCode;
        this.message = message ;
        this.success = false;
        this.errors = errors
        if (stack){
            this.stack = stack 
        }else{
            Error.captureStackTrace(this , this.constructor)
        }
    }
}

export {ApiError}