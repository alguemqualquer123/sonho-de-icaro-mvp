import { agora, banco } from "./db";
import { hashSenha, validarForcaSenha, encerrarSessoesDoUsuario, type Usuario } from "./auth";
import { PAPEIS, PERMISSOES, pode, type Papel } from "./rbac";
import { registrarTrilha } from "./auditoria";
import { forbidden, invalido, naoEncontrado } from "./regras";

export type UsuarioLinha = {
  id: number;
  nome: string;
  email: string;
  papel: string;
  ativo: number;
  criado_em: string;
  compras: number;
};

export function totalUsuarios(): number {
  return (banco().prepare("SELECT COUNT(*) AS n FROM usuarios").get() as { n: number }).n;
}

export function listarUsuarios(): UsuarioLinha[] {
  return banco()
    .prepare(
      `SELECT u.id, u.nome, u.email, u.papel, u.ativo, u.criado_em,
              (SELECT COUNT(*) FROM compras c WHERE c.responsavel_id = u.id) AS compras
         FROM usuarios u ORDER BY u.id`,
    )
    .all() as UsuarioLinha[];
}

export function usuarioPorEmail(email: string) {
  return banco().prepare("SELECT * FROM usuarios WHERE LOWER(email) = LOWER(?)").get(email) as
    | (Usuario & { senha_hash: string })
    | undefined;
}

export function criarUsuario(
  input: { nome: string; email: string; senha: string; papel?: Papel },
  contexto: { publico: boolean; autor?: Usuario; ip?: string },
): { id: number; papel: Papel; primeiro: boolean } {
  const nome = input.nome.trim();
  const email = input.email.trim().toLowerCase();
  if (nome.length < 2) invalido("informe seu nome");
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) invalido("e-mail inválido");
  const erroSenha = validarForcaSenha(input.senha);
  if (erroSenha) invalido(erroSenha);
  if (usuarioPorEmail(email)) invalido("já existe uma conta com este e-mail");

  const primeiro = totalUsuarios() === 0;
  // O primeiro cadastro do sistema assume admin (não há convite nem seed).
  // Depois disso, registro público entra como comprador; papéis privativos só
  // são atribuídos por quem tem usuarios.gerir.
  let papel: Papel = primeiro ? "admin" : "comprador";
  if (input.papel && input.papel !== papel) {
    if (contexto.publico) {
      if (!primeiro) invalido("o registro público cria contas de comprador; peça ao administrador a troca de perfil");
    } else {
      if (!contexto.autor || !pode(contexto.autor.papel, PERMISSOES.usuariosGerir)) {
        forbidden("só quem tem usuarios.gerir define papéis");
      }
      if (!PAPEIS.some((p) => p.valor === input.papel)) invalido(`perfil desconhecido: ${input.papel}`);
      papel = input.papel;
    }
  }

  const id = Number(
    banco()
      .transaction(() => {
        const r = banco()
          .prepare("INSERT INTO usuarios(nome, email, senha_hash, papel, ativo, criado_em) VALUES (?, ?, ?, ?, 1, ?)")
          .run(nome, email, hashSenha(input.senha), papel, agora());
        registrarTrilha({
          usuario: contexto.autor ?? null,
          entidade: "usuario",
          entidadeId: r.lastInsertRowid,
          acao: primeiro ? "primeiro-admin" : contexto.publico ? "registro" : "criar",
          depois: { email, papel },
          ip: contexto.ip,
        });
        return r.lastInsertRowid;
      })(),
  );
  return { id, papel, primeiro };
}

export function alterarUsuario(
  id: number,
  input: { nome?: string; papel?: Papel; ativo?: boolean; senha?: string },
  autor: Usuario,
) {
  if (!pode(autor.papel, PERMISSOES.usuariosGerir)) forbidden(`${autor.papel} não gerencia usuários`);
  const alvo = banco().prepare("SELECT * FROM usuarios WHERE id = ?").get(id) as
    | (Usuario & { senha_hash: string })
    | undefined;
  if (!alvo) naoEncontrado("usuário");
  if (id === autor.id && input.papel && input.papel !== alvo!.papel) {
    invalido("você não pode mudar o seu próprio perfil");
  }

  const antes = { papel: alvo!.papel, ativo: alvo!.ativo, nome: alvo!.nome };
  const senhasQuebradas = (input.ativo === false || (input.papel && input.papel !== alvo!.papel));

  banco()
    .transaction(() => {
      if (input.nome !== undefined) {
        const nome = input.nome.trim();
        if (nome.length < 2) invalido("nome muito curto");
        banco().prepare("UPDATE usuarios SET nome = ? WHERE id = ?").run(nome, id);
      }
      if (input.papel) {
        if (!PAPEIS.some((p) => p.valor === input.papel)) invalido("perfil desconhecido");
        banco().prepare("UPDATE usuarios SET papel = ? WHERE id = ?").run(input.papel, id);
      }
      if (input.ativo !== undefined) {
        const outrosAdminsAtivos = (banco()
          .prepare("SELECT COUNT(*) AS n FROM usuarios WHERE papel = 'admin' AND ativo = 1 AND id <> ?")
          .get(id) as { n: number }).n;
        if (input.ativo === false && alvo!.papel === "admin" && outrosAdminsAtivos === 0) {
          invalido("não é possível desativar o último administrador ativo");
        }
        banco().prepare("UPDATE usuarios SET ativo = ? WHERE id = ?").run(input.ativo ? 1 : 0, id);
      }
      if (input.senha) {
        const erro = validarForcaSenha(input.senha);
        if (erro) invalido(erro);
        banco().prepare("UPDATE usuarios SET senha_hash = ? WHERE id = ?").run(hashSenha(input.senha), id);
        encerrarSessoesDoUsuario(id);
      }
      registrarTrilha({
        usuario: autor,
        entidade: "usuario",
        entidadeId: id,
        acao: input.senha ? "redefinir-senha" : "editar",
        antes,
        depois: { papel: input.papel ?? alvo!.papel, ativo: input.ativo === undefined ? alvo!.ativo : input.ativo ? 1 : 0 },
      });
    })();

  if (senhasQuebradas && !input.senha) encerrarSessoesDoUsuario(id);
}

export function resumoUsuarios() {
  const linhas = listarUsuarios();
  return {
    total: linhas.length,
    ativos: linhas.filter((l) => l.ativo === 1).length,
    porPapel: PAPEIS.map((p) => ({ papel: p.valor, nome: p.nome, quantidade: linhas.filter((l) => l.papel === p.valor).length })),
  };
}
