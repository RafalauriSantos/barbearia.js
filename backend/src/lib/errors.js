class AppError extends Error {
	constructor(status = 500, code = "ERROR", message = "An error occurred") {
		super(message);
		this.status = status;
		this.code = code;
	}
}

module.exports = { AppError };
