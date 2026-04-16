export function cn(...inputs) {
	// Junta classes em uma string unica.
	const classes = inputs.filter(Boolean);
	return classes.join(" ");
}
