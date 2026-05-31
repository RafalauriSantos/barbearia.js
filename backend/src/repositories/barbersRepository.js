const supabase = require("../lib/supabase");

async function attachPendingInvites(barbers) {
	if (!barbers.length) return barbers;

	const ids = barbers.map((barber) => barber.id);
	const { data, error } = await supabase
		.from("convites_barbeiros")
		.select("id,barbeiro_id,email,expira_em,aceito_em,revogado_em,criado_em")
		.in("barbeiro_id", ids)
		.is("aceito_em", null)
		.is("revogado_em", null)
		.gte("expira_em", new Date().toISOString())
		.order("criado_em", { ascending: false });

	if (error) throw error;

	const inviteByBarber = new Map();
	for (const invite of data || []) {
		if (!inviteByBarber.has(invite.barbeiro_id)) {
			inviteByBarber.set(invite.barbeiro_id, invite);
		}
	}

	return barbers.map((barber) => {
		const invite = inviteByBarber.get(barber.id);
		return {
			...barber,
			convite_pendente: invite ?
				{
					id: invite.id,
					email: invite.email,
					expira_em: invite.expira_em,
				}
			:	null,
			access_status:
				barber.usuario_id ? "ativo"
				: invite ? "convite_pendente"
				: "sem_acesso",
		};
	});
}

function toApi(row) {
	if (!row) return null;
	return {
		id: row.id,
		nome: row.nome,
		name: row.nome,
		cargo: row.cargo,
		active: row.ativo,
		ativo: row.ativo,
		foto_url: row.foto_url || null,
		photo_url: row.foto_url || null,
		comissao_percent: Number(row.comissao_percent || 0),
		email: row.email || null,
		barbearia_id: row.barbearia_id,
		usuario_id: row.usuario_id || null,
		convite_pendente: row.convite_pendente || null,
		access_status: row.access_status || (row.usuario_id ? "ativo" : "sem_acesso"),
	};
}

exports.findAllByBarbearia = async function (barbeariaId) {
	const { data, error } = await supabase
		.from("barbeiros")
		.select(
			"id,nome,foto_url,cargo,ativo,comissao_percent,email,barbearia_id,usuario_id",
		)
		.eq("barbearia_id", barbeariaId)
		.eq("ativo", true)
		.order("nome", { ascending: true });
	if (error) throw error;
	return attachPendingInvites((data || []).map(toApi));
};

exports.findByIdInBarbearia = async function (id, barbeariaId) {
	const { data, error } = await supabase
		.from("barbeiros")
		.select(
			"id,nome,foto_url,cargo,ativo,comissao_percent,email,barbearia_id,usuario_id",
		)
		.eq("id", id)
		.eq("barbearia_id", barbeariaId)
		.eq("ativo", true)
		.maybeSingle();
	if (error && error.code !== "PGRST116") throw error;
	return toApi(data);
};

exports.create = async function ({ barbeariaId, nome, email, comissao_percent }) {
	const { data, error } = await supabase
		.from("barbeiros")
		.insert({
			barbearia_id: barbeariaId,
			nome,
			email: email || null,
			comissao_percent: comissao_percent ?? 50,
			ativo: true,
		})
		.select(
			"id,nome,foto_url,cargo,ativo,comissao_percent,email,barbearia_id,usuario_id",
		)
		.single();
	if (error) throw error;
	return toApi(data);
};

exports.update = async function (id, barbeariaId, updates) {
	const row = {};
	if (updates.nome !== undefined) row.nome = updates.nome;
	if (updates.email !== undefined) row.email = updates.email || null;
	if (updates.comissao_percent !== undefined) {
		row.comissao_percent = updates.comissao_percent;
	}
	if (updates.ativo !== undefined) row.ativo = updates.ativo;

	const { data, error } = await supabase
		.from("barbeiros")
		.update(row)
		.eq("id", id)
		.eq("barbearia_id", barbeariaId)
		.select(
			"id,nome,foto_url,cargo,ativo,comissao_percent,email,barbearia_id,usuario_id",
		)
		.single();
	if (error) throw error;
	return toApi(data);
};

exports.linkUser = async function (id, barbeariaId, userId, email) {
	const { data, error } = await supabase
		.from("barbeiros")
		.update({
			usuario_id: userId,
			...(email ? { email } : {}),
		})
		.eq("id", id)
		.eq("barbearia_id", barbeariaId)
		.is("usuario_id", null)
		.select(
			"id,nome,foto_url,cargo,ativo,comissao_percent,email,barbearia_id,usuario_id",
		)
		.maybeSingle();
	if (error && error.code !== "PGRST116") throw error;
	return toApi(data);
};
