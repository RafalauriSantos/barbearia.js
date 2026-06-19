import { APP_NAME } from "@/lib/brand";

const sizes = {
	sm: "text-[18px]",
	md: "text-[23px]",
	lg: "text-[34px]",
	hero: "text-[40px] sm:text-[76px] lg:text-[92px]",
};

export function BrandName({ size = "md", className = "" }) {
	return (
		<span
			aria-label={APP_NAME}
			className={`inline-flex max-w-full items-baseline gap-[0.28em] whitespace-nowrap leading-none ${sizes[size]} ${className}`}>
			<span
				aria-hidden="true"
				className="font-brand font-semibold italic text-inherit">
				Marque’s
			</span>
			<span
				aria-hidden="true"
				className="font-logo text-[0.48em] font-bold text-inherit">
				Barbearia
			</span>
		</span>
	);
}
