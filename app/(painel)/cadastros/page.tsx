import type { ReactNode } from "react";
import type { Metadata } from "next";
import Link from "next/link";
import {
  Area,
  Aviso,
  Botao,
  Cabecalho,
  Campo,
  Painel,
  Recado,
  Selecao,
  Selo,
  Tabela,
  type Opcao,
} from "@/components/ui";
import { exigirUsuario } from "@/lib/auth";
import { ENTIDADES, listarEntidade, nomeEntidade, opcoesCatalogos, type Entidade } from "@/lib/cadastros";
import { PERMISSOES, pode } from "@/lib/rbac";
import { criarCadastroAction, desativarCadastroAction, editarCadastroAction } from "@/lib/acoes/cadastros";

export const dynamic = "force-dynamic";
export const metadata: Metadata = { title: "Cadastros" };

const ROTULO_ABA: Record<Entidade, string> = {
  categorias: "Categorias",
  setores: "Setores",
  turmas: "Turmas",
  "centros-custo": "Centros de custo",
  fornecedores: "Fornecedores",
  projetos: "Projetos",
};

const ROTULO_COLUNA: Record<string, string> = {
  id: "ID",
  codigo: "Código",
  nome: "Nome",
  ativo: "Situação",
  usos: "Usos em rateios",
  coordenacao_id: "Coordenação (id)",
  centro_custo_id: "Centro de custo (id)",
  tipo: "Tipo",
};

const TEM_CODIGO: Entidade[] = ["categorias", "setores", "turmas", "centros-custo"];

function celula(chave: string, valor: unknown) {
  if (chave === "ativo") {
    const ligado = Number(valor) === 1;
    return <Selo valor={ligado ? "ativo" : "inativo"} rotulo={ligado ? "Ativo" : "Inativo"} />;
  }
  if (valor === null || valor === undefined || valor === "") {
    return <span className="text-white/35">—</span>;
  }
  return <span className="tabular-nums">{String(valor)}</span>;
}

function opcoesDeTipos(): Opcao[] {
  return [
    { valor: "setor", rotulo: "Setor" },
    { valor: "coordenacao", rotulo: "Coordenação" },
  ];
}

export default async function CadastrosPage({
  searchParams,
}: {
  searchParams: Promise<{ entidade?: string; erro?: string; ok?: string }>;
}) {
  const usuario = await exigirUsuario();
  const params = await searchParams;
  const canVer = pode(usuario.papel, PERMISSOES.cadastrosVer);
  const canGerir = pode(usuario.papel, PERMISSOES.cadastrosGerir);

  const cabecalho = (
    <Cabecalho
      titulo="Cadastros"
      descricao="Catálogos usados nas compras e nos rateios. Um cadastro em uso não é apagado: ele sai de circulação ficando inativo, e cada mudança fica na trilha de auditoria."
    />
  );

  if (!canVer) {
    return (
      <div>
        {cabecalho}
        <Aviso tipo="aviso">
          Esta área exige a permissão {PERMISSOES.cadastrosVer}. Seu perfil ({usuario.papel}) não tem acesso aos
          catálogos — peça ao administrador a leitura ou a gestão de cadastros.
        </Aviso>
      </div>
    );
  }

  const entidade: Entidade = (ENTIDADES as readonly string[]).includes(params.entidade ?? "")
    ? (params.entidade as Entidade)
    : "categorias";
  const linhas = listarEntidade(entidade);
  const catalogos = canGerir ? opcoesCatalogos() : null;
  const temCodigo = TEM_CODIGO.includes(entidade);

  const chaves = linhas.length > 0 ? Object.keys(linhas[0]) : ["id", "codigo", "nome", "ativo", "usos"];
  const colunas: (string | ReactNode)[] = chaves.map((c) => ROTULO_COLUNA[c] ?? c);
  if (canGerir) colunas.push("Gerenciar");

  const linhasTabela = linhas.map((linha) => {
    const celulas: ReactNode[] = chaves.map((chave) => celula(chave, linha[chave]));
    if (canGerir && catalogos) {
      const id = Number(linha.id);
      const ativo = Number(linha.ativo) === 1;
      celulas.push(
        <details className="min-w-[240px]">
          <summary className="cursor-pointer list-none rounded-xl border border-white/10 bg-white/5 px-3 py-1.5 text-center text-xs font-medium text-white/70 transition hover:bg-white/10 hover:text-white">
            Gerenciar
          </summary>
          <div className="mt-3 space-y-4 rounded-xl border border-white/10 bg-white/[0.03] p-3">
            <form action={editarCadastroAction} className="space-y-3">
              <input type="hidden" name="entidade" value={entidade} />
              <input type="hidden" name="id" value={id} />
              <Campo rotulo="Nome" name="nome" defaultValue={String(linha.nome ?? "")} required />
              {entidade === "turmas" ? (
                <Selecao
                  rotulo="Coordenação (opcional — vazio mantém a atual)"
                  name="coordenacao_id"
                  vazio="Manter coordenação atual"
                  defaultValor={linha.coordenacao_id != null ? String(linha.coordenacao_id) : undefined}
                  opcoes={catalogos.coordenacoes.map((c) => ({ valor: String(c.id), rotulo: c.nome }))}
                />
              ) : null}
              {entidade === "setores" ? (
                <Selecao
                  rotulo="Centro de custo vinculado"
                  name="centro_custo_id"
                  vazio="Sem centro de custo"
                  defaultValor={linha.centro_custo_id != null ? String(linha.centro_custo_id) : ""}
                  opcoes={catalogos.centrosCusto.map((c) => ({ valor: String(c.id), rotulo: c.nome }))}
                />
              ) : null}
              <Botao variante="secundario">Salvar edição</Botao>
            </form>
            <form action={desativarCadastroAction} className="space-y-3 border-t border-white/10 pt-3">
              <input type="hidden" name="entidade" value={entidade} />
              <input type="hidden" name="id" value={id} />
              <Area
                rotulo={ativo ? "Motivo da desativação" : "Motivo da reativação"}
                name="motivo"
                rows={2}
                placeholder="Explique a decisão; o texto integra a trilha de auditoria."
              />
              <Botao variante={ativo ? "perigo" : "secundario"}>
                {ativo ? "Desativar cadastro" : "Reativar cadastro"}
              </Botao>
            </form>
          </div>
        </details>,
      );
    }
    return celulas;
  });

  return (
    <div>
      {cabecalho}
      <Recado searchParams={params} />

      <nav className="mb-5 flex flex-wrap gap-2">
        {ENTIDADES.map((e) => {
          const ativo = e === entidade;
          return (
            <Link
              key={e}
              href={`/cadastros?entidade=${e}`}
              className={`rounded-xl border px-3.5 py-1.5 text-xs font-medium transition ${
                ativo
                  ? "border-indigo-400/50 bg-indigo-500/20 text-white"
                  : "border-white/10 bg-white/5 text-white/60 hover:bg-white/10 hover:text-white"
              }`}
            >
              {ROTULO_ABA[e]}
            </Link>
          );
        })}
      </nav>

      {!canGerir ? (
        <Aviso tipo="aviso">
          Seu perfil ({usuario.papel}) tem apenas leitura dos catálogos. Cadastro, edição e desativação exigem a
          permissão {PERMISSOES.cadastrosGerir} (Administrador).
        </Aviso>
      ) : (
        <Painel className="mb-5 p-5">
          <h2 className="text-sm font-semibold text-white">Novo cadastro · {ROTULO_ABA[entidade]}</h2>
          <p className="mt-0.5 text-[11px] text-white/40">
            Entidade atual: {nomeEntidade(entidade)}. Campos extras aparecem conforme a necessidade da entidade.
          </p>
          <form action={criarCadastroAction} className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
            <input type="hidden" name="entidade" value={entidade} />
            {temCodigo ? (
              <Campo rotulo="Código" name="codigo" required placeholder="Ex.: CAT-LIVRARIA" hint="Mínimo de 2 caracteres; vira maiúsculas." />
            ) : null}
            <Campo rotulo="Nome" name="nome" required placeholder="Nome completo do cadastro" />
            {entidade === "turmas" && catalogos ? (
              <Selecao
                rotulo="Coordenação"
                name="coordenacao_id"
                required
                vazio="Selecione F1 ou F2"
                opcoes={catalogos.coordenacoes.map((c) => ({ valor: String(c.id), rotulo: c.nome }))}
              />
            ) : null}
            {entidade === "setores" && catalogos ? (
              <Selecao
                rotulo="Centro de custo (opcional)"
                name="centro_custo_id"
                vazio="Sem centro de custo"
                opcoes={catalogos.centrosCusto.map((c) => ({ valor: String(c.id), rotulo: c.nome }))}
              />
            ) : null}
            {entidade === "centros-custo" ? (
              <Selecao rotulo="Tipo" name="tipo" opcoes={opcoesDeTipos()} defaultValor="setor" />
            ) : null}
            <div className="flex items-end">
              <Botao>Criar cadastro</Botao>
            </div>
          </form>
        </Painel>
      )}

      <Tabela
        colunas={colunas}
        linhas={linhasTabela}
        vazio={`Nenhum cadastro de ${nomeEntidade(entidade)} por enquanto.`}
      />
    </div>
  );
}
