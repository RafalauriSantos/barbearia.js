export class AppError extends Error {
	public status: number;
	public code: string;

	constructor(status = 500, code = "ERROR", message = "An error occurred") {
		super(message);
		this.status = status;
		this.code = code;
	}
}

module.exports = { AppError };
