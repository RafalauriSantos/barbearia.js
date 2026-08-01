import supabase from "../lib/supabase";

export interface ApiBarberRow {
	id: string;
	nome: string;
	name: string;
	cargo: string;
	active: boolean;
	ativo: boolean;
	foto_url: string | null;
	photo_url: string | null;
	comissao_percent: number;
	email: string | null;
	barbearia_id: string;
	usuario_id: string | null;
	convite_pendente?: any;
	access_status: string;
}

async function attachPendingInvites(barbers: any[]) {
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

function toApi(row: any): ApiBarberRow | null {
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

export async function findAllByBarbearia(barbeariaId: string): Promise<ApiBarberRow[]> {
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
}

export async function findByIdInBarbearia(id: string, barbeariaId: string): Promise<ApiBarberRow | null> {
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
}

export async function create({ barbeariaId, nome, email, comissao_percent }: { barbeariaId: string; nome: string; email?: string | null; comissao_percent?: number }): Promise<ApiBarberRow | null> {
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
}

export async function update(id: string, barbeariaId: string, updates: Record<string, any>): Promise<ApiBarberRow | null> {
	const row: Record<string, any> = {};
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
}

export async function linkUser(id: string, barbeariaId: string, userId: string, email?: string): Promise<ApiBarberRow | null> {
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
}

export async function countAppointments(barberId: string): Promise<number> {
	const { count, error } = await supabase
		.from("agendamentos")
		.select("id", { count: "exact", head: true })
		.eq("barbeiro_id", barberId);
	if (error) throw error;
	return count || 0;
}

export async function hardDelete(id: string, barbeariaId: string): Promise<void> {
	const { error } = await supabase
		.from("barbeiros")
		.delete()
		.eq("id", id)
		.eq("barbearia_id", barbeariaId);
	if (error) throw error;
}

export async function deletePendingInvites(barberId: string, barbeariaId?: string): Promise<void> {
	let query = supabase
		.from("convites_barbeiros")
		.delete()
		.eq("barbeiro_id", barberId)
		.is("aceito_em", null);

	if (barbeariaId) {
		query = query.eq("barbearia_id", barbeariaId);
	}

	const { error } = await query;
	if (error) throw error;
}

if (typeof module !== "undefined" && module.exports) { module.exports = {
	findAllByBarbearia,
	findByIdInBarbearia,
	create,
	update,
	linkUser,
	countAppointments,
	hardDelete,
	deletePendingInvites,
}; }
export default {
	findAllByBarbearia,
	findByIdInBarbearia,
	create,
	update,
	linkUser,
	countAppointments,
	hardDelete,
	deletePendingInvites,
};
