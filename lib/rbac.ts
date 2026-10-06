// Matriz de permissões espelhando api/internal/rbac/rbac.go do projeto original.
// O frontend apenas reflete; a decisão acontece na camada de serviço.

export type Papel =
  | "admin"
  | "gestor"
  | "comprador"
  | "lancador"
  | "coord_f1"
  | "coord_f2"
  | "auditor";

export const PERMISSOES = {
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
} as const;

export type Permissao = (typeof PERMISSOES)[keyof typeof PERMISSOES];

const MATRIZ: Record<Papel, Partial<Record<Permissao | "*", true>>> = {
  admin: { "*": true },
  gestor: {
    [PERMISSOES.usuariosVer]: true,
    [PERMISSOES.comprasCriar]: true,
    [PERMISSOES.comprasVerTodas]: true,
    [PERMISSOES.comprasEditar]: true,
    [PERMISSOES.comprasCancelar]: true,
    [PERMISSOES.comprasEditarFechada]: true,
    [PERMISSOES.alocacoesEditar]: true,
    [PERMISSOES.anexosGerir]: true,
    [PERMISSOES.cadastrosVer]: true,
    [PERMISSOES.conciliacaoGerir]: true,
    [PERMISSOES.revisaoGerir]: true,
    [PERMISSOES.relatoriosVer]: true,
    [PERMISSOES.auditoriaVer]: true,
    [PERMISSOES.exportar]: true,
    [PERMISSOES.fechamentoGerir]: true,
  },
  comprador: {
    [PERMISSOES.comprasCriar]: true,
    [PERMISSOES.comprasEditarProprias]: true,
    [PERMISSOES.alocacoesEditar]: true,
    [PERMISSOES.anexosGerir]: true,
    [PERMISSOES.cadastrosVer]: true,
    [PERMISSOES.relatoriosVer]: true,
  },
  lancador: {
    [PERMISSOES.comprasCriar]: true,
    [PERMISSOES.comprasVerTodas]: true,
    [PERMISSOES.comprasEditar]: true,
    [PERMISSOES.alocacoesEditar]: true,
    [PERMISSOES.anexosGerir]: true,
    [PERMISSOES.cadastrosVer]: true,
    [PERMISSOES.relatoriosVer]: true,
  },
  coord_f1: {
    [PERMISSOES.comprasCriar]: true,
    [PERMISSOES.comprasVerTodas]: true,
    [PERMISSOES.alocacoesEditarCoord]: true,
    [PERMISSOES.anexosGerir]: true,
    [PERMISSOES.cadastrosVer]: true,
    [PERMISSOES.relatoriosVer]: true,
    [PERMISSOES.exportar]: true,
  },
  coord_f2: {
    [PERMISSOES.comprasCriar]: true,
    [PERMISSOES.comprasVerTodas]: true,
    [PERMISSOES.alocacoesEditarCoord]: true,
    [PERMISSOES.anexosGerir]: true,
    [PERMISSOES.cadastrosVer]: true,
    [PERMISSOES.relatoriosVer]: true,
    [PERMISSOES.exportar]: true,
  },
  auditor: {
    [PERMISSOES.comprasVerTodas]: true,
    [PERMISSOES.cadastrosVer]: true,
    [PERMISSOES.relatoriosVer]: true,
    [PERMISSOES.auditoriaVer]: true,
    [PERMISSOES.exportar]: true,
  },
};

export const PAPEIS: { valor: Papel; nome: string; descricao: string }[] = [
  { valor: "admin", nome: "Administrador", descricao: "Acesso total, usuários e fechamento" },
  { valor: "gestor", nome: "Gestor financeiro", descricao: "Conciliação, relatórios e aprovações" },
  { valor: "comprador", nome: "Comprador", descricao: "Registra e edita as próprias compras" },
  { valor: "lancador", nome: "Lançador", descricao: "Lança compras de qualquer responsável" },
  { valor: "coord_f1", nome: "Coordenação F1", descricao: "Rateio e relatórios da F1" },
  { valor: "coord_f2", nome: "Coordenação F2", descricao: "Rateio e relatórios da F2" },
  { valor: "auditor", nome: "Auditor", descricao: "Somente leitura, relatórios e trilha" },
];

export function nomeDoPapel(papel: string): string {
  return PAPEIS.find((p) => p.valor === papel)?.nome ?? papel;
}

export function pode(papel: string, permissao: Permissao): boolean {
  const p = MATRIZ[papel as Papel];
  if (!p) return false;
  return p["*"] === true || p[permissao] === true;
}

export function coordenacaoDoPapel(papel: string): "F1" | "F2" | "" {
  if (papel === "coord_f1") return "F1";
  if (papel === "coord_f2") return "F2";
  return "";
}
