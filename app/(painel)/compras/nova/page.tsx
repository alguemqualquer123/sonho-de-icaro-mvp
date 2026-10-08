import type { Metadata } from "next";
import { Aviso, Cabecalho, Painel, Recado } from "@/components/ui";
import { FormNovaCompra } from "@/components/form-nova-compra";
import { exigirUsuario } from "@/lib/auth";
import { opcoesCatalogos } from "@/lib/cadastros";
import { PERMISSOES, pode } from "@/lib/rbac";

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

  const catalogos = opcoesCatalogos();

  return (
    <div>
      <Cabecalho
        titulo="Nova compra"
        descricao="Registre a saída do cartão primeiro; o rateio — destino (setor) e valor de cada parte — é feito na próxima tela, num só lugar."
      />
      <Recado searchParams={params} />

      <Aviso tipo="aviso">
        O valor informado aqui é A SAÍDA ÚNICA do cartão neste lançamento. Uma compra gera uma única despesa no
        total do mês; o rateio que vem depois apenas distribui esse mesmo valor entre os destinos — ele nunca soma
        despesa nova. Se a compra for parcelada, informe o valor da parcela que cai neste mês (precisa dividir de
        forma exata pelo número de parcelas). Mês fechado trava este registro até uma reabertura justificada.
      </Aviso>

      <Painel className="mt-4 p-5">
        <FormNovaCompra
          usuarioId={usuario.id}
          dataInicial={hoje()}
          fornecedores={catalogos.fornecedores.map((f) => f.nome)}
          temErro={Boolean(params.erro)}
        />
      </Painel>
    </div>
  );
}
