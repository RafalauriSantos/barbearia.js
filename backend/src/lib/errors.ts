export class AppError extends Error {
	public status: number;
	public code: string;
	public details?: any;

	constructor(status = 500, code = "ERROR", message = "An error occurred", details?: any) {
		super(message);
		this.status = status;
		this.code = code;
		this.details = details;
	}
}

module.exports = { AppError };
