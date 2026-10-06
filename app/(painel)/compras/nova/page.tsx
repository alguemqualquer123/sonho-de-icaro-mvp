import type { Metadata } from "next";
import Link from "next/link";
import { Area, Aviso, Botao, Campo, Cabecalho, INPUT, Painel, Recado } from "@/components/ui";
import { Selecao } from "@/components/selecao";
import { exigirUsuario } from "@/lib/auth";
import { opcoesCatalogos } from "@/lib/cadastros";
import { PERMISSOES, pode } from "@/lib/rbac";
import { criarCompraAction } from "@/lib/acoes/compras";

export const metadata: Metadata = { title: "Nova compra" };

function hoje(): string {
  const d = new Date();
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export default async function NovaCompraPage({
  searchParams,
}: {
  searchParams: Promise<{ erro?: string; ok?: string }>;
}) {
  const usuario = await exigirUsuario();
  const params = await searchParams;

  if (!pode(usuario.papel, PERMISSOES.comprasCriar)) {
    return (
      <div>
        <Cabecalho titulo="Nova compra" />
        <Aviso tipo="erro">seu perfil não pode registrar compras no cartão XP Black.</Aviso>
      </div>
    );
  }

  const catalogos = await opcoesCatalogos();

  return (
    <div>
      <Cabecalho
        titulo="Nova compra"
        descricao="Registre a saída do cartão primeiro; o rateio entre setor, categoria, turma e centro de custo é feito na próxima tela."
      />
      <Recado searchParams={params} />

      <Aviso tipo="aviso">
        O valor informado aqui é A SAÍDA ÚNICA do cartão neste lançamento. Uma compra gera uma única despesa no
        total do mês; o rateio que vem depois apenas distribui esse mesmo valor entre os destinos — ele nunca soma
        despesa nova. Se a compra for parcelada, informe o valor da parcela que cai neste mês (precisa dividir de
        forma exata pelo número de parcelas). Mês fechado trava este registro até uma reabertura justificada.
      </Aviso>

      <Painel className="mt-4 p-5">
        <form action={criarCompraAction} className="space-y-4">
          <div className="grid gap-4 sm:grid-cols-2">
            <Campo rotulo="Data da compra" name="data" type="date" defaultValue={hoje()} required />
            <label className="block">
              <span className="mb-1.5 block text-xs font-medium text-white/60">Fornecedor</span>
              <input
                name="fornecedor"
                required
                list="fornecedores-historico"
                placeholder="comece a digitar ou escolha um histórico"
                className={INPUT}
              />
            </label>
          </div>
          <datalist id="fornecedores-historico">
            {catalogos.fornecedores.map((f: any) => (
              <option key={String(f.nome)} value={f.nome} />
            ))}
          </datalist>

          <Area rotulo="Descrição" name="descricao" rows={2} placeholder="o que foi comprado, número da nota, observações do pedido" />

          <div className="grid gap-4 sm:grid-cols-3">
            <Campo rotulo="Valor (saída única)" name="valor" required placeholder="1.234,56" hint="aceita 1.234,56, R$ 1234,56 ou 1234.56" />
            <Selecao
              rotulo="Parcelas no total"
              name="parcelas_total"
              defaultValor="1"
              opcoes={Array.from({ length: 12 }, (_, i) => ({
                valor: String(i + 1),
                rotulo: i === 0 ? "à vista (1 parcela)" : `${i + 1} parcelas`,
              }))}
            />
            <Selecao
              rotulo="Setor destino (opcional agora)"
              name="setor_id"
              vazio="definir no rateio"
              opcoes={catalogos.setores.map((s: any) => ({ valor: String(s.id), rotulo: String(s.nome) }))}
            />
          </div>

          <Area rotulo="Observação interna (opcional)" name="observacao" rows={2} placeholder="contexto para a conferência" />

          <div className="flex flex-wrap items-center gap-3 pt-1">
            <Botao>Registrar compra e ir para o rateio</Botao>
            <Link href="/compras" className="text-xs text-white/50 hover:text-white">
              cancelar e voltar para a lista
            </Link>
          </div>
        </form>
      </Painel>
    </div>
  );
}
