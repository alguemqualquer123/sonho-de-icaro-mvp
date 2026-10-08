"use strict";
// Matriz de permissões espelhando api/internal/rbac/rbac.go do projeto original.
// O frontend apenas reflete; a decisão acontece na camada de serviço.
Object.defineProperty(exports, "__esModule", { value: true });
exports.PAPEIS = exports.PERMISSOES = void 0;
exports.nomeDoPapel = nomeDoPapel;
exports.pode = pode;
exports.coordenacaoDoPapel = coordenacaoDoPapel;
exports.PERMISSOES = {
    usuariosGerir: "usuarios.gerir",
    usuariosVer: "usuarios.ver",
    comprasCriar: "compras.criar",
    comprasVerTodas: "compras.ver_todas",
    comprasEditar: "compras.editar",
    comprasEditarProprias: "compras.editar_proprias",
    comprasCancelar: "compras.cancelar",
    comprasEditarFechada: "compras.editar_fechada",
    alocacoesEditar: "alocacoes.editar",
    alocacoesEditarCoord: "alocacoes.editar_coord",
    anexosGerir: "anexos.gerir",
    cadastrosGerir: "cadastros.gerir",
    cadastrosVer: "cadastros.ver",
    conciliacaoGerir: "conciliacao.gerir",
    revisaoGerir: "revisao.gerir",
    relatoriosVer: "relatorios.ver",
    auditoriaVer: "auditoria.ver",
    exportar: "exportar",
    fechamentoGerir: "fechamento.gerir",
};
const MATRIZ = {
    admin: { "*": true },
    gestor: {
        [exports.PERMISSOES.usuariosVer]: true,
        [exports.PERMISSOES.comprasCriar]: true,
        [exports.PERMISSOES.comprasVerTodas]: true,
        [exports.PERMISSOES.comprasEditar]: true,
        [exports.PERMISSOES.comprasCancelar]: true,
        [exports.PERMISSOES.comprasEditarFechada]: true,
        [exports.PERMISSOES.alocacoesEditar]: true,
        [exports.PERMISSOES.anexosGerir]: true,
        [exports.PERMISSOES.cadastrosVer]: true,
        [exports.PERMISSOES.conciliacaoGerir]: true,
        [exports.PERMISSOES.revisaoGerir]: true,
        [exports.PERMISSOES.relatoriosVer]: true,
        [exports.PERMISSOES.auditoriaVer]: true,
        [exports.PERMISSOES.exportar]: true,
        [exports.PERMISSOES.fechamentoGerir]: true,
    },
    comprador: {
        [exports.PERMISSOES.comprasCriar]: true,
        [exports.PERMISSOES.comprasEditarProprias]: true,
        [exports.PERMISSOES.alocacoesEditar]: true,
        [exports.PERMISSOES.anexosGerir]: true,
        [exports.PERMISSOES.cadastrosVer]: true,
        [exports.PERMISSOES.relatoriosVer]: true,
    },
    lancador: {
        [exports.PERMISSOES.comprasCriar]: true,
        [exports.PERMISSOES.comprasVerTodas]: true,
        [exports.PERMISSOES.comprasEditar]: true,
        [exports.PERMISSOES.alocacoesEditar]: true,
        [exports.PERMISSOES.anexosGerir]: true,
        [exports.PERMISSOES.cadastrosVer]: true,
        [exports.PERMISSOES.relatoriosVer]: true,
    },
    coord_f1: {
        [exports.PERMISSOES.comprasCriar]: true,
        [exports.PERMISSOES.comprasVerTodas]: true,
        [exports.PERMISSOES.alocacoesEditarCoord]: true,
        [exports.PERMISSOES.anexosGerir]: true,
        [exports.PERMISSOES.cadastrosVer]: true,
        [exports.PERMISSOES.relatoriosVer]: true,
        [exports.PERMISSOES.exportar]: true,
    },
    coord_f2: {
        [exports.PERMISSOES.comprasCriar]: true,
        [exports.PERMISSOES.comprasVerTodas]: true,
        [exports.PERMISSOES.alocacoesEditarCoord]: true,
        [exports.PERMISSOES.anexosGerir]: true,
        [exports.PERMISSOES.cadastrosVer]: true,
        [exports.PERMISSOES.relatoriosVer]: true,
        [exports.PERMISSOES.exportar]: true,
    },
    auditor: {
        [exports.PERMISSOES.comprasVerTodas]: true,
        [exports.PERMISSOES.cadastrosVer]: true,
        [exports.PERMISSOES.relatoriosVer]: true,
        [exports.PERMISSOES.auditoriaVer]: true,
        [exports.PERMISSOES.exportar]: true,
    },
};
exports.PAPEIS = [
    { valor: "admin", nome: "Administrador", descricao: "Acesso total, usuários e fechamento" },
    { valor: "gestor", nome: "Gestor financeiro", descricao: "Conciliação, relatórios e aprovações" },
    { valor: "comprador", nome: "Comprador", descricao: "Registra e edita as próprias compras" },
    { valor: "lancador", nome: "Lançador", descricao: "Lança compras de qualquer responsável" },
    { valor: "coord_f1", nome: "Coordenação F1", descricao: "Rateio e relatórios da F1" },
    { valor: "coord_f2", nome: "Coordenação F2", descricao: "Rateio e relatórios da F2" },
    { valor: "auditor", nome: "Auditor", descricao: "Somente leitura, relatórios e trilha" },
];
function nomeDoPapel(papel) {
    return exports.PAPEIS.find((p) => p.valor === papel)?.nome ?? papel;
}
function pode(papel, permissao) {
    const p = MATRIZ[papel];
    if (!p)
        return false;
    return p["*"] === true || p[permissao] === true;
}
function coordenacaoDoPapel(papel) {
    if (papel === "coord_f1")
        return "F1";
    if (papel === "coord_f2")
        return "F2";
    return "";
}
