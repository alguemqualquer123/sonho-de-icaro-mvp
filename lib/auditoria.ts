import { banco, agora } from "./db";
import type { Usuario } from "./auth";

export type EventoTrilha = {
  usuario?: Usuario | null;
  entidade: string;
  entidadeId?: string | number | bigint;
  acao: string;
  antes?: unknown;
  depois?: unknown;
  motivo?: string;
  ip?: string;
};

// A trilha é apêndice-only: nada aqui atualiza ou apaga registros anteriores.
export function registrarTrilha(evento: EventoTrilha) {
  banco()
    .prepare(
      `INSERT INTO trilha_auditoria
        (usuario_id, usuario_nome, entidade, entidade_id, acao, antes, depois, motivo, ip, criado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
    )
    .run(
      evento.usuario?.id ?? null,
      evento.usuario?.nome ?? "sistema",
      evento.entidade,
      String(evento.entidadeId ?? ""),
      evento.acao,
      evento.antes === undefined ? null : JSON.stringify(evento.antes),
      evento.depois === undefined ? null : JSON.stringify(evento.depois),
      evento.motivo ?? "",
      evento.ip ?? "",
      agora(),
    );
}

export type LinhaTrilha = {
  id: number;
  usuario_nome: string;
  entidade: string;
  entidade_id: string;
  acao: string;
  motivo: string;
  ip: string;
  criado_em: string;
  antes: string | null;
  depois: string | null;
};

export function listarTrilha(limite = 200, entidade = "", usuarioId = 0): LinhaTrilha[] {
  const filtros: string[] = [];
  const params: (string | number)[] = [];
  if (entidade) {
    filtros.push("entidade = ?");
    params.push(entidade);
  }
  if (usuarioId) {
    filtros.push("usuario_id = ?");
    params.push(usuarioId);
  }
  params.push(Math.min(Math.max(limite, 1), 1000));
  return banco()
    .prepare(
      `SELECT id, usuario_nome, entidade, entidade_id, acao, motivo, ip, criado_em, antes, depois
         FROM trilha_auditoria
         ${filtros.length ? `WHERE ${filtros.join(" AND ")}` : ""}
        ORDER BY id DESC LIMIT ?`,
    )
    .all(...params) as LinhaTrilha[];
}
