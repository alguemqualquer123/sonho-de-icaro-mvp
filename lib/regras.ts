export class ErroRegra extends Error {
  constructor(mensagem: string) {
    super(mensagem);
    this.name = "ErroRegra";
  }
}

export function invalido(mensagem: string): never {
  throw new ErroRegra(mensagem);
}

export function forbidden(mensagem: string): never {
  throw new ErroRegra(`Sem permissão: ${mensagem}`);
}

export function naoEncontrado(o: string): never {
  throw new ErroRegra(`${o} não encontrado(a)`);
}

export function mensagemDe(erro: unknown): string {
  if (erro instanceof ErroRegra) return erro.message;
  if (erro instanceof Error) return erro.message;
  return "falha inesperada";
}
