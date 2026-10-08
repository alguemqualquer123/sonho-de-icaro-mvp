"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.registrarTrilha = registrarTrilha;
exports.listarTrilha = listarTrilha;
const db_1 = require("./db");
// A trilha é apêndice-only: nada aqui atualiza ou apaga registros anteriores.
function registrarTrilha(evento) {
    (0, db_1.banco)()
        .prepare(`INSERT INTO trilha_auditoria
        (usuario_id, usuario_nome, entidade, entidade_id, acao, antes, depois, motivo, ip, criado_em)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`)
        .run(evento.usuario?.id ?? null, evento.usuario?.nome ?? "sistema", evento.entidade, String(evento.entidadeId ?? ""), evento.acao, evento.antes === undefined ? null : JSON.stringify(evento.antes), evento.depois === undefined ? null : JSON.stringify(evento.depois), evento.motivo ?? "", evento.ip ?? "", (0, db_1.agora)());
}
function listarTrilha(limite = 200, entidade = "", usuarioId = 0) {
    const filtros = [];
    const params = [];
    if (entidade) {
        filtros.push("entidade = ?");
        params.push(entidade);
    }
    if (usuarioId) {
        filtros.push("usuario_id = ?");
        params.push(usuarioId);
    }
    params.push(Math.min(Math.max(limite, 1), 1000));
    return (0, db_1.banco)()
        .prepare(`SELECT id, usuario_nome, entidade, entidade_id, acao, motivo, ip, criado_em, antes, depois
         FROM trilha_auditoria
         ${filtros.length ? `WHERE ${filtros.join(" AND ")}` : ""}
        ORDER BY id DESC LIMIT ?`)
        .all(...params);
}
