"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.STATUS = exports.LIMITE_ANEXO_BYTES = void 0;
exports.fechamentoDaCompetencia = fechamentoDaCompetencia;
exports.garantirMesAberto = garantirMesAberto;
exports.listarCompras = listarCompras;
exports.obterCompra = obterCompra;
exports.podeVerCompra = podeVerCompra;
exports.verCompra = verCompra;
exports.listarAlocacoes = listarAlocacoes;
exports.criarCompra = criarCompra;
exports.editarCompra = editarCompra;
exports.revisarCompra = revisarCompra;
exports.cancelarCompra = cancelarCompra;
exports.registrarCompensacao = registrarCompensacao;
exports.salvarAlocacao = salvarAlocacao;
exports.excluirAlocacao = excluirAlocacao;
exports.resumoRateio = resumoRateio;
exports.salvarAnexo = salvarAnexo;
exports.obterAnexo = obterAnexo;
exports.marcarLegibilidadeAnexo = marcarLegibilidadeAnexo;
exports.removerAnexo = removerAnexo;
const node_fs_1 = __importDefault(require("node:fs"));
const node_path_1 = __importDefault(require("node:path"));
const node_crypto_1 = __importDefault(require("node:crypto"));
const db_1 = require("./db");
const numerario_1 = require("./numerario");
const rbac_1 = require("./rbac");
const auditoria_1 = require("./auditoria");
const regras_1 = require("./regras");
exports.LIMITE_ANEXO_BYTES = 10000000;
exports.STATUS = ["rascunho", "enviada", "aprovada", "contestada", "cancelada"];
const SELECT_LISTA = `
  SELECT c.*, u.nome AS responsavel_nome, r.rateado_centavos, r.saldo_centavos, r.total_anexos
    FROM compras c
    JOIN usuarios u ON u.id = c.responsavel_id
    JOIN vw_resumo_compra r ON r.id = c.id`;
function fechamentoDaCompetencia(competencia) {
    return (0, db_1.banco)()
        .prepare("SELECT * FROM fechamentos WHERE competencia = ?")
        .get(competencia);
}
// Mês fechado trava escrita para qualquer perfil; a única saída é a reabertura
// justificada (RF-25 do projeto original).
function garantirMesAberto(competencia, acao) {
    const fechamento = fechamentoDaCompetencia(competencia);
    if (fechamento && !fechamento.reaberto_em) {
        (0, regras_1.invalido)(`a competência ${competencia} está fechada; reabra com justificativa antes de ${acao}`);
    }
}
function garantirNaoAprovada(compra, acao, usuario) {
    if (compra.status === "aprovada" && !(0, rbac_1.pode)(usuario.papel, rbac_1.PERMISSOES.revisaoGerir)) {
        (0, regras_1.invalido)(`compra aprovada não aceita ${acao}; use estorno/cancelamento ou reabra a revisão`);
    }
    if (compra.status === "cancelada") {
        (0, regras_1.invalido)(`compra cancelada não aceita ${acao}`);
    }
}
function podeEditar(usuario, compra) {
    if ((0, rbac_1.pode)(usuario.papel, rbac_1.PERMISSOES.comprasEditar))
        return true;
    return compra.responsavel_id === usuario.id && (0, rbac_1.pode)(usuario.papel, rbac_1.PERMISSOES.comprasEditarProprias);
}
function listarCompras(usuario, filtros = {}) {
    const where = [];
    const params = [];
    if (!(0, rbac_1.pode)(usuario.papel, rbac_1.PERMISSOES.comprasVerTodas)) {
        where.push("c.responsavel_id = ?");
        params.push(usuario.id);
    }
    if (filtros.competencia) {
        where.push("c.competencia = ?");
        params.push(filtros.competencia);
    }
    if (filtros.status && exports.STATUS.includes(filtros.status)) {
        where.push("c.status = ?");
        params.push(filtros.status);
    }
    if (filtros.fornecedor) {
        where.push("c.fornecedor = ?");
        params.push(filtros.fornecedor);
    }
    if (filtros.busca) {
        where.push("(c.fornecedor LIKE ? OR c.descricao LIKE ? OR c.numero LIKE ?)");
        const like = `%${filtros.busca}%`;
        params.push(like, like, like);
    }
    if (filtros.setorId) {
        // Um setor pode aparecer de dois jeitos: no destino da compra (c.setor_id)
        // ou dentro do rateio (alocação). Aceitamos os dois para o filtro ser útil
        // mesmo com compras lançadas antes do rateio ser obrigatório.
        where.push("(c.setor_id = ? OR EXISTS (SELECT 1 FROM alocacoes a WHERE a.compra_id = c.id AND a.setor_id = ?))");
        params.push(filtros.setorId, filtros.setorId);
    }
    params.push(Math.min(Math.max(filtros.limite ?? 100, 1), 500));
    return (0, db_1.banco)()
        .prepare(`${SELECT_LISTA}
        ${where.length ? `WHERE ${where.join(" AND ")}` : ""}
        ORDER BY c.data DESC, c.id DESC LIMIT ?`)
        .all(...params);
}
function obterCompra(id) {
    const compra = (0, db_1.banco)().prepare(`${SELECT_LISTA} WHERE c.id = ?`).get(id);
    if (!compra)
        (0, regras_1.naoEncontrado)("compra");
    return compra;
}
// Quem enxerga a compra: quem vê todas (perfis de gestão/auditoria) ou o próprio
// responsável. Ratear não dá leitura: `alocacoes.editar` também pertence ao
// comprador, que só enxerga as próprias compras (igual a `listarCompras`).
function podeVerCompra(usuario, compra) {
    return (0, rbac_1.pode)(usuario.papel, rbac_1.PERMISSOES.comprasVerTodas) || compra.responsavel_id === usuario.id;
}
function verCompra(id, usuario) {
    const compra = obterCompra(id);
    if (!podeVerCompra(usuario, compra))
        (0, regras_1.forbidden)(`você não tem acesso à compra ${compra.numero}`);
    const alocacoes = listarAlocacoes(id);
    if (!(0, rbac_1.pode)(usuario.papel, rbac_1.PERMISSOES.comprasVerTodas)) {
        const coord = (0, rbac_1.coordenacaoDoPapel)(usuario.papel);
        if (coord && compra.responsavel_id !== usuario.id) {
            const daCoord = alocacoes.some((a) => a.coordenacao_codigo === coord);
            if (!daCoord)
                (0, regras_1.forbidden)(`a compra ${compra.numero} está fora da sua coordenação`);
        }
    }
    const anexos = (0, db_1.banco)()
        .prepare("SELECT id, compra_id, nome_arquivo, mime, tamanho_bytes, legivel, criado_em FROM anexos WHERE compra_id = ? ORDER BY id")
        .all(id);
    const eventos = (0, db_1.banco)()
        .prepare(`SELECT e.*, u.nome AS criado_por_nome FROM eventos_financeiros e
        JOIN usuarios u ON u.id = e.criado_por WHERE e.compra_id = ? ORDER BY e.id`)
        .all(id);
    return { compra, alocacoes, anexos, eventos };
}
function listarAlocacoes(compraId) {
    return (0, db_1.banco)()
        .prepare(`SELECT a.*, cat.nome AS categoria_nome, s.nome AS setor_nome,
              t.nome AS turma_nome, co.codigo AS coordenacao_codigo
         FROM alocacoes a
         JOIN categorias cat ON cat.id = a.categoria_id
         JOIN setores s ON s.id = a.setor_id
         LEFT JOIN turmas t ON t.id = a.turma_id
         LEFT JOIN coordenacoes co ON co.id = t.coordenacao_id
        WHERE a.compra_id = ? ORDER BY a.id`)
        .all(compraId);
}
function proximoNumero(competencia) {
    const mensal = competencia.replace("-", "");
    const linha = (0, db_1.banco)()
        .prepare("SELECT COUNT(*) AS n FROM compras WHERE competencia = ?")
        .get(competencia);
    return `C-${mensal}-${String(linha.n + 1).padStart(3, "0")}`;
}
// Regra financeira central: a soma do rateio nunca pode ultrapassar o total da
// compra. O que falta classificar fica visível como saldo, nunca vira gasto novo.
function validarRateio(compraId, totalCompra, ignorarAlocacaoId = 0) {
    const linha = (0, db_1.banco)()
        .prepare(`SELECT COALESCE(SUM(valor_centavos), 0) AS rateado FROM alocacoes
        WHERE compra_id = ? AND id <> ?`)
        .get(compraId, ignorarAlocacaoId);
    return { rateado: linha.rateado, saldo: totalCompra - linha.rateado };
}
function criarCompra(input, usuario) {
    if (!(0, rbac_1.pode)(usuario.papel, rbac_1.PERMISSOES.comprasCriar))
        (0, regras_1.forbidden)(`${usuario.papel} não pode registrar compras`);
    if (input.valor_centavos <= 0)
        (0, regras_1.invalido)("o valor da compra deve ser maior que zero");
    if (input.parcelas_total < 1 || input.parcelas_total > 99)
        (0, regras_1.invalido)("parcelas deve estar entre 1 e 99");
    if (input.valor_centavos % input.parcelas_total !== 0 && input.parcelas_total > 1) {
        // Parcelas com centavos quebrados são permitidas, mas o valor lançado é o
        // da parcela do mês; nada é multiplicado no total.
        (0, regras_1.invalido)(`o valor ${(0, numerario_1.formatarCentavos)(input.valor_centavos)} não divide de forma exata em ${input.parcelas_total} parcelas`);
    }
    const competencia = (0, db_1.competenciaDaData)(input.data);
    garantirMesAberto(competencia, "registrar compras");
    const id = (0, db_1.banco)()
        .transaction(() => {
        const r = (0, db_1.banco)()
            .prepare(`INSERT INTO compras(numero, data, competencia, fornecedor, descricao, valor_centavos,
             parcelas_total, status, responsavel_id, setor_id, observacao, criado_em, atualizado_em)
           VALUES (?, ?, ?, ?, ?, ?, ?, 'rascunho', ?, ?, ?, ?, ?)`)
            .run(proximoNumero(competencia), input.data, competencia, input.fornecedor, input.descricao, input.valor_centavos, input.parcelas_total, usuario.id, input.setor_id ?? null, input.observacao, (0, db_1.agora)(), (0, db_1.agora)());
        (0, auditoria_1.registrarTrilha)({
            usuario,
            entidade: "compra",
            entidadeId: r.lastInsertRowid,
            acao: "criar",
            depois: { valor_centavos: input.valor_centavos, fornecedor: input.fornecedor, competencia },
        });
        return Number(r.lastInsertRowid);
    })();
    return id;
}
function editarCompra(id, input, usuario, motivo = "") {
    const compra = obterCompra(id);
    if (!podeEditar(usuario, compra))
        (0, regras_1.forbidden)(`${usuario.papel} não pode editar a compra ${compra.numero}`);
    garantirNaoAprovada(compra, "edição", usuario);
    const competencia = (0, db_1.competenciaDaData)(input.data ?? compra.data);
    garantirMesAberto(competencia, "editar compras");
    if (motivo === "" && compra.status !== "rascunho")
        (0, regras_1.invalido)("toda correção fora do rascunho exige motivo");
    const novoValor = input.valor_centavos ?? compra.valor_centavos;
    if (novoValor <= 0)
        (0, regras_1.invalido)("o valor da compra deve ser maior que zero");
    if (novoValor !== compra.valor_centavos) {
        const { rateado } = validarRateio(id, novoValor);
        if (rateado > novoValor) {
            (0, regras_1.invalido)(`o rateio atual (${(0, numerario_1.formatarCentavos)(rateado)}) excede o novo valor (${(0, numerario_1.formatarCentavos)(novoValor)}); ajuste as alocações antes`);
        }
    }
    (0, db_1.banco)()
        .transaction(() => {
        (0, db_1.banco)()
            .prepare(`UPDATE compras SET data = ?, competencia = ?, fornecedor = ?, descricao = ?, valor_centavos = ?,
             parcelas_total = ?, setor_id = ?, observacao = ?, atualizado_em = ? WHERE id = ?`)
            .run(input.data ?? compra.data, competencia, input.fornecedor ?? compra.fornecedor, input.descricao ?? compra.descricao, novoValor, input.parcelas_total ?? compra.parcelas_total, input.setor_id === undefined ? compra.setor_id : input.setor_id, input.observacao ?? compra.observacao, (0, db_1.agora)(), id);
        (0, auditoria_1.registrarTrilha)({
            usuario,
            entidade: "compra",
            entidadeId: id,
            acao: "editar",
            antes: { valor_centavos: compra.valor_centavos, fornecedor: compra.fornecedor, data: compra.data },
            depois: { valor_centavos: novoValor, fornecedor: input.fornecedor ?? compra.fornecedor, data: input.data ?? compra.data },
            motivo,
        });
    })();
}
function revisarCompra(id, usuario, { acao, motivo = "" }) {
    const compra = obterCompra(id);
    garantirMesAberto(compra.competencia, `revisar compras (${acao})`);
    const atual = { valor_centavos: compra.valor_centavos, status: compra.status };
    if (acao === "enviar-conferencia") {
        if (!podeEditar(usuario, compra))
            (0, regras_1.forbidden)("só o responsável ou quem tem compras.editar pode enviar para conferência");
        if (compra.status === "aprovada" || compra.status === "enviada")
            (0, regras_1.invalido)(`a compra já está ${compra.status}`);
        const { saldo } = validarRateio(id, compra.valor_centavos);
        if (saldo !== 0) {
            (0, regras_1.invalido)(saldo > 0
                ? `faltam ${(0, numerario_1.formatarCentavos)(saldo)} de rateio para enviar para conferência`
                : `o rateio excede o total em ${(0, numerario_1.formatarCentavos)(-saldo)}`);
        }
        (0, db_1.banco)()
            .transaction(() => {
            (0, db_1.banco)()
                .prepare("UPDATE compras SET status = 'enviada', enviado_por = ?, enviado_em = ?, atualizado_em = ? WHERE id = ?")
                .run(usuario.id, (0, db_1.agora)(), (0, db_1.agora)(), id);
            (0, auditoria_1.registrarTrilha)({ usuario, entidade: "compra", entidadeId: id, acao, antes: atual, depois: { status: "enviada" } });
        })();
        return;
    }
    if (!(0, rbac_1.pode)(usuario.papel, rbac_1.PERMISSOES.revisaoGerir))
        (0, regras_1.forbidden)(`${usuario.papel} não aprova nem contesta compras`);
    if (compra.status !== "enviada")
        (0, regras_1.invalido)("só compras enviadas para conferência podem ser aprovadas ou contestadas");
    if (acao === "aprovar") {
        (0, db_1.banco)()
            .transaction(() => {
            (0, db_1.banco)()
                .prepare("UPDATE compras SET status = 'aprovada', aprovado_por = ?, aprovado_em = ?, atualizado_em = ? WHERE id = ?")
                .run(usuario.id, (0, db_1.agora)(), (0, db_1.agora)(), id);
            (0, auditoria_1.registrarTrilha)({ usuario, entidade: "compra", entidadeId: id, acao, antes: atual, depois: { status: "aprovada" } });
        })();
        return;
    }
    const motivoLimpo = motivo.trim();
    if (motivoLimpo.length < 5)
        (0, regras_1.invalido)("a contestação exige motivo com ao menos 5 caracteres");
    (0, db_1.banco)()
        .transaction(() => {
        (0, db_1.banco)()
            .prepare(`UPDATE compras SET status = 'contestada', contestado_por = ?, contestado_em = ?,
             motivo_contestacao = ?, atualizado_em = ? WHERE id = ?`)
            .run(usuario.id, (0, db_1.agora)(), motivoLimpo, (0, db_1.agora)(), id);
        (0, auditoria_1.registrarTrilha)({
            usuario,
            entidade: "compra",
            entidadeId: id,
            acao,
            antes: atual,
            depois: { status: "contestada" },
            motivo: motivoLimpo,
        });
    })();
}
function cancelarCompra(id, motivo, usuario) {
    const compra = obterCompra(id);
    if (!(0, rbac_1.pode)(usuario.papel, rbac_1.PERMISSOES.comprasCancelar))
        (0, regras_1.forbidden)(`${usuario.papel} não pode cancelar compras`);
    if (compra.status === "cancelada")
        (0, regras_1.invalido)("a compra já está cancelada");
    const motivoLimpo = motivo.trim();
    if (motivoLimpo.length < 5)
        (0, regras_1.invalido)("o cancelamento exige motivo com ao menos 5 caracteres");
    garantirMesAberto(compra.competencia, "cancelar compras");
    (0, db_1.banco)()
        .transaction(() => {
        (0, db_1.banco)()
            .prepare("UPDATE compras SET status = 'cancelada', motivo_cancelamento = ?, cancelado_por = ?, cancelado_em = ?, atualizado_em = ? WHERE id = ?")
            .run(motivoLimpo, usuario.id, (0, db_1.agora)(), (0, db_1.agora)(), id);
        // Cancelar nunca apaga: registra como evento novo na mesma compra.
        (0, db_1.banco)()
            .prepare("INSERT INTO eventos_financeiros(compra_id, tipo, valor_centavos, motivo, criado_por, criado_em) VALUES (?, 'correcao', ?, ?, ?, ?)")
            .run(id, -compra.valor_centavos, `cancelamento: ${motivoLimpo}`, usuario.id, (0, db_1.agora)());
        (0, auditoria_1.registrarTrilha)({
            usuario,
            entidade: "compra",
            entidadeId: id,
            acao: "cancelar",
            antes: { status: compra.status },
            depois: { status: "cancelada" },
            motivo: motivoLimpo,
        });
    })();
}
function registrarCompensacao(id, tipo, valorCentavos, motivo, usuario) {
    const compra = obterCompra(id);
    if (!(0, rbac_1.pode)(usuario.papel, rbac_1.PERMISSOES.comprasEditar))
        (0, regras_1.forbidden)(`${usuario.papel} não registra ${tipo}`);
    if (valorCentavos <= 0)
        (0, regras_1.invalido)(`o valor do ${tipo} deve ser maior que zero`);
    if (motivo.trim().length < 5)
        (0, regras_1.invalido)(`o ${tipo} exige motivo com ao menos 5 caracteres`);
    garantirMesAberto(compra.competencia, `registrar ${tipo}`);
    (0, db_1.banco)()
        .transaction(() => {
        (0, db_1.banco)()
            .prepare("INSERT INTO eventos_financeiros(compra_id, tipo, valor_centavos, motivo, criado_por, criado_em) VALUES (?, ?, ?, ?, ?, ?)")
            .run(id, tipo, valorCentavos, motivo.trim(), usuario.id, (0, db_1.agora)());
        (0, auditoria_1.registrarTrilha)({
            usuario,
            entidade: "compra",
            entidadeId: id,
            acao: tipo,
            depois: { valor_centavos: valorCentavos },
            motivo,
        });
    })();
}
function garantirCatalogos(input) {
    const db = (0, db_1.banco)();
    const categoria = db.prepare("SELECT id, ativo FROM categorias WHERE id = ?").get(input.categoria_id);
    if (!categoria)
        (0, regras_1.invalido)("categoria inválida");
    if (categoria.ativo !== 1)
        (0, regras_1.invalido)("a categoria escolhida está desativada");
    const setor = db.prepare("SELECT id, ativo FROM setores WHERE id = ?").get(input.setor_id);
    if (!setor)
        (0, regras_1.invalido)("setor inválido");
    if (setor.ativo !== 1)
        (0, regras_1.invalido)("o setor escolhido está desativado");
    if (input.turma_id) {
        const turma = db.prepare("SELECT id, ativo FROM turmas WHERE id = ?").get(input.turma_id);
        if (!turma)
            (0, regras_1.invalido)("turma inválida");
        if (turma.ativo !== 1)
            (0, regras_1.invalido)("a turma escolhida está desativada");
    }
    if (input.valor_centavos <= 0)
        (0, regras_1.invalido)("cada alocação precisa ser maior que zero");
}
function garantirPermissaoRateio(usuario, compra, turmaId) {
    if ((0, rbac_1.pode)(usuario.papel, rbac_1.PERMISSOES.alocacoesEditar)) {
        if (podeEditar(usuario, compra))
            return;
    }
    const coord = (0, rbac_1.coordenacaoDoPapel)(usuario.papel);
    if (coord && (0, rbac_1.pode)(usuario.papel, rbac_1.PERMISSOES.alocacoesEditarCoord)) {
        if (!turmaId)
            (0, regras_1.invalido)(`o perfil ${usuario.papel} precisa escolher uma turma da coordenação ${coord}`);
        const turma = (0, db_1.banco)()
            .prepare("SELECT co.codigo AS coord FROM turmas t JOIN coordenacoes co ON co.id = t.coordenacao_id WHERE t.id = ?")
            .get(turmaId);
        if (!turma || turma.coord !== coord)
            (0, regras_1.forbidden)(`você só rateia turmas da coordenação ${coord}`);
        return;
    }
    (0, regras_1.forbidden)(`${usuario.papel} não pode editar o rateio`);
}
function salvarAlocacao(input, usuario, motivo = "") {
    garantirCatalogos(input);
    const compra = obterCompra(input.compra_id);
    garantirPermissaoRateio(usuario, compra, input.turma_id ?? null);
    garantirNaoAprovada(compra, "alteração do rateio", usuario);
    garantirMesAberto(compra.competencia, "alterar o rateio");
    return (0, db_1.banco)()
        .transaction(() => {
        const { rateado } = validarRateio(compra.id, compra.valor_centavos, input.id ?? 0);
        if (rateado + input.valor_centavos > compra.valor_centavos) {
            const excede = rateado + input.valor_centavos - compra.valor_centavos;
            (0, regras_1.invalido)(`o rateio não pode ultrapassar o total da compra (${(0, numerario_1.formatarCentavos)(compra.valor_centavos)}); excede em ${(0, numerario_1.formatarCentavos)(excede)}`);
        }
        if (input.id) {
            (0, db_1.banco)()
                .prepare(`UPDATE alocacoes SET categoria_id = ?, setor_id = ?, turma_id = ?, centro_custo_id = ?,
               projeto_id = ?, valor_centavos = ?, observacao = ? WHERE id = ? AND compra_id = ?`)
                .run(input.categoria_id, input.setor_id, input.turma_id ?? null, input.centro_custo_id ?? null, input.projeto_id ?? null, input.valor_centavos, input.observacao ?? "", input.id, compra.id);
            (0, auditoria_1.registrarTrilha)({
                usuario,
                entidade: "alocacao",
                entidadeId: input.id,
                acao: "editar",
                depois: { valor_centavos: input.valor_centavos, compra_id: compra.id },
                motivo,
            });
            return input.id;
        }
        const r = (0, db_1.banco)()
            .prepare(`INSERT INTO alocacoes(compra_id, categoria_id, setor_id, turma_id, centro_custo_id, projeto_id, valor_centavos, observacao, criado_em)
           VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)`)
            .run(compra.id, input.categoria_id, input.setor_id, input.turma_id ?? null, input.centro_custo_id ?? null, input.projeto_id ?? null, input.valor_centavos, input.observacao ?? "", (0, db_1.agora)());
        (0, auditoria_1.registrarTrilha)({
            usuario,
            entidade: "alocacao",
            entidadeId: r.lastInsertRowid,
            acao: "criar",
            depois: { valor_centavos: input.valor_centavos, compra_id: compra.id },
        });
        return Number(r.lastInsertRowid);
    })();
}
function excluirAlocacao(id, usuario, motivo = "") {
    const alocacao = (0, db_1.banco)().prepare("SELECT * FROM alocacoes WHERE id = ?").get(id);
    if (!alocacao)
        (0, regras_1.naoEncontrado)("alocação");
    const compra = obterCompra(alocacao.compra_id);
    garantirPermissaoRateio(usuario, compra, alocacao.turma_id);
    garantirNaoAprovada(compra, "exclusão de alocação", usuario);
    garantirMesAberto(compra.competencia, "excluir alocação");
    (0, db_1.banco)()
        .transaction(() => {
        (0, db_1.banco)().prepare("DELETE FROM alocacoes WHERE id = ?").run(id);
        (0, auditoria_1.registrarTrilha)({
            usuario,
            entidade: "alocacao",
            entidadeId: id,
            acao: "excluir",
            antes: { valor_centavos: alocacao.valor_centavos, compra_id: compra.id },
            motivo,
        });
    })();
}
function resumoRateio(compraId, eixo) {
    const mapa = {
        setor: "s.codigo AS chave, s.nome AS nome",
        categoria: "cat.codigo AS chave, cat.nome AS nome",
        turma: "COALESCE(t.codigo, 'SEM TURMA') AS chave, COALESCE(t.nome, 'Sem turma') AS nome",
        coordenacao: "COALESCE(co.codigo, 'SEM COORDENACAO') AS chave, COALESCE(co.nome, 'Sem coordenação') AS nome",
    };
    const sel = mapa[eixo];
    if (!sel)
        (0, regras_1.invalido)(`eixo de resumo inválido: ${eixo}`);
    const total = (0, db_1.banco)()
        .prepare("SELECT valor_centavos FROM compras WHERE id = ?")
        .get(compraId)?.valor_centavos;
    if (total === undefined)
        (0, regras_1.naoEncontrado)("compra");
    const linhas = (0, db_1.banco)()
        .prepare(`SELECT ${sel}, SUM(a.valor_centavos) AS valor_centavos
         FROM alocacoes a
         JOIN categorias cat ON cat.id = a.categoria_id
         JOIN setores s ON s.id = a.setor_id
         LEFT JOIN turmas t ON t.id = a.turma_id
         LEFT JOIN coordenacoes co ON co.id = t.coordenacao_id
        WHERE a.compra_id = ? GROUP BY chave ORDER BY valor_centavos DESC`)
        .all(compraId);
    return linhas.map((l) => ({ ...l, percentual: Math.round((l.valor_centavos / total) * 1000) / 10 }));
}
// ---- anexos -------------------------------------------------------------
const EXTENSOES = {
    "image/jpeg": "jpg",
    "image/png": "png",
    "image/webp": "webp",
    "image/heic": "heic",
    "application/pdf": "pdf",
};
async function salvarAnexo(compraId, arquivo, usuario) {
    const compra = obterCompra(compraId);
    if (!(0, rbac_1.pode)(usuario.papel, rbac_1.PERMISSOES.anexosGerir) && compra.responsavel_id !== usuario.id) {
        (0, regras_1.forbidden)(`${usuario.papel} não pode anexar comprovantes a outras compras`);
    }
    garantirMesAberto(compra.competencia, "anexar comprovantes");
    const ext = EXTENSOES[arquivo.type];
    if (!ext)
        (0, regras_1.invalido)("envie uma imagem (jpg, png, webp, heic) ou PDF");
    const buffer = Buffer.from(await arquivo.arrayBuffer());
    if (buffer.byteLength === 0)
        (0, regras_1.invalido)("o arquivo está vazio");
    if (buffer.byteLength > exports.LIMITE_ANEXO_BYTES)
        (0, regras_1.invalido)("o arquivo excede 10 MB");
    const nomeGravado = `anexo-${node_crypto_1.default.randomBytes(12).toString("hex")}.${ext}`;
    node_fs_1.default.writeFileSync(node_path_1.default.join(db_1.UPLOADS_DIR, nomeGravado), buffer);
    return (0, db_1.banco)()
        .transaction(() => {
        const r = (0, db_1.banco)()
            .prepare("INSERT INTO anexos(compra_id, nome_arquivo, caminho, mime, tamanho_bytes, criado_por, criado_em) VALUES (?, ?, ?, ?, ?, ?, ?)")
            .run(compra.id, arquivo.name.slice(0, 200), nomeGravado, arquivo.type, buffer.byteLength, usuario.id, (0, db_1.agora)());
        (0, auditoria_1.registrarTrilha)({
            usuario,
            entidade: "anexo",
            entidadeId: r.lastInsertRowid,
            acao: "upload",
            depois: { compra_id: compra.id, nome: arquivo.name, tamanho_bytes: buffer.byteLength },
        });
        return Number(r.lastInsertRowid);
    })();
}
function obterAnexo(id) {
    const anexo = (0, db_1.banco)().prepare("SELECT * FROM anexos WHERE id = ?").get(id);
    if (!anexo)
        (0, regras_1.naoEncontrado)("anexo");
    return anexo;
}
function marcarLegibilidadeAnexo(id, legivel, motivo, usuario) {
    if (!(0, rbac_1.pode)(usuario.papel, rbac_1.PERMISSOES.anexosGerir))
        (0, regras_1.forbidden)(`${usuario.papel} não avalia legibilidade`);
    const anexo = obterAnexo(id);
    if (motivo.trim().length < 5)
        (0, regras_1.invalido)("a legibilidade exige motivo com ao menos 5 caracteres");
    (0, db_1.banco)()
        .transaction(() => {
        (0, db_1.banco)().prepare("UPDATE anexos SET legivel = ? WHERE id = ?").run(legivel ? 1 : 0, id);
        (0, auditoria_1.registrarTrilha)({
            usuario,
            entidade: "anexo",
            entidadeId: id,
            acao: legivel ? "legivel" : "ilegivel",
            antes: { legivel: anexo.legivel },
            depois: { legivel: legivel ? 1 : 0 },
            motivo,
        });
    })();
}
function removerAnexo(id, motivo, usuario) {
    if (!(0, rbac_1.pode)(usuario.papel, rbac_1.PERMISSOES.anexosGerir))
        (0, regras_1.forbidden)(`${usuario.papel} não remove anexos`);
    const anexo = obterAnexo(id);
    if (motivo.trim().length < 5)
        (0, regras_1.invalido)("a remoção do comprovante exige motivo");
    (0, db_1.banco)()
        .transaction(() => {
        (0, db_1.banco)().prepare("DELETE FROM anexos WHERE id = ?").run(id);
        node_fs_1.default.rmSync(node_path_1.default.join(db_1.UPLOADS_DIR, anexo.caminho), { force: true });
        (0, auditoria_1.registrarTrilha)({
            usuario,
            entidade: "anexo",
            entidadeId: id,
            acao: "excluir",
            antes: { compra_id: anexo.compra_id, nome: anexo.nome_arquivo },
            motivo,
        });
    })();
}
