const operationalMethodsSql = `
	CREATE OR REPLACE FUNCTION public.criar_formas_pagamento_padrao()
	RETURNS trigger AS $$
	BEGIN
		INSERT INTO public.formas_pagamento (
			barbearia_id, codigo, nome, taxa_percentual, ativo, ordem
		) VALUES
			(NEW.id, 'pix', 'Pix', 0, true, 10),
			(NEW.id, 'dinheiro', 'Dinheiro', 0, true, 20),
			(NEW.id, 'cartao_debito', 'Cartao de debito', 0, true, 30),
			(NEW.id, 'cartao_credito', 'Cartao de credito', 0, true, 40),
			(NEW.id, 'credito_parcelado', 'Credito parcelado', 0, true, 50),
			(NEW.id, 'fiado', 'Fiado', 0, true, 60)
		ON CONFLICT (barbearia_id, codigo) DO NOTHING;
		RETURN NEW;
	END;
	$$ LANGUAGE plpgsql;
`;

const legacyMethodsSql = `
	CREATE OR REPLACE FUNCTION public.criar_formas_pagamento_padrao()
	RETURNS trigger AS $$
	BEGIN
		INSERT INTO public.formas_pagamento (
			barbearia_id, codigo, nome, taxa_percentual, ativo, ordem
		) VALUES
			(NEW.id, 'pix', 'Pix', 0, true, 10),
			(NEW.id, 'dinheiro', 'Dinheiro', 0, true, 20),
			(NEW.id, 'cartao_debito', 'Cartao de debito', 0, true, 30),
			(NEW.id, 'cartao_credito', 'Cartao de credito', 0, true, 40),
			(NEW.id, 'credito_parcelado', 'Credito parcelado', 0, true, 50),
			(NEW.id, 'fiado', 'Fiado', 0, true, 60),
			(NEW.id, 'outro', 'Outro', 0, true, 100)
		ON CONFLICT (barbearia_id, codigo) DO NOTHING;
		RETURN NEW;
	END;
	$$ LANGUAGE plpgsql;
`;

exports.up = async function (knex) {
	await knex.raw(`
		UPDATE public.formas_pagamento
		SET ativo = false
		WHERE codigo = 'outro';

		${operationalMethodsSql}
	`);
};

exports.down = async function (knex) {
	await knex.raw(`
		UPDATE public.formas_pagamento
		SET ativo = true
		WHERE codigo = 'outro';

		${legacyMethodsSql}
	`);
};
