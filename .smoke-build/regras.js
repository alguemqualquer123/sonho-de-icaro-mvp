"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErroRegra = void 0;
exports.invalido = invalido;
exports.forbidden = forbidden;
exports.naoEncontrado = naoEncontrado;
exports.mensagemDe = mensagemDe;
class ErroRegra extends Error {
    constructor(mensagem) {
        super(mensagem);
        this.name = "ErroRegra";
    }
}
exports.ErroRegra = ErroRegra;
function invalido(mensagem) {
    throw new ErroRegra(mensagem);
}
function forbidden(mensagem) {
    throw new ErroRegra(`Sem permissão: ${mensagem}`);
}
function naoEncontrado(o) {
    throw new ErroRegra(`${o} não encontrado(a)`);
}
function mensagemDe(erro) {
    if (erro instanceof ErroRegra)
        return erro.message;
    if (erro instanceof Error)
        return erro.message;
    return "falha inesperada";
}
