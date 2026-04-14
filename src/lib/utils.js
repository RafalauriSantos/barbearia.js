export function cn(...inputs) {
	const classes = inputs.filter(Boolean);
	return classes.join(" ");
}
