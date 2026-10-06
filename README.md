# Sonho de Ícaro — MVP de controle do cartão XP Black

Aplicação Next.js autônoma (front + back + banco) para lançar as compras do cartão
corporativo, ratear cada compra entre os setores que ela atendeu, guardar comprovantes,
conciliar com a fatura e fechar a competência do mês. Reproduz as regras financeiras do
sistema principal (`../SonhoXpBlack`, API Go + Postgres) em um stack único.

## Como rodar

```bash
npm install
npm run dev        # http://localhost:3000
```

O banco SQLite é criado sozinho em `data/app.db` no primeiro start, já com os catálogos
(coordenações, turmas, categorias, centros de custo, setores) preenchidos.
**A primeira conta registrada vira administradora** — registre-se em `/registro` antes
de qualquer outra pessoa.

```bash
npm run build && npm start   # produção
npm run typecheck            # tsc --noEmit
npm run lint                 # eslint
```

Variáveis em `.env.local` (veja `.env.example`): `DATA_DIR`, `SESSION_SECRET`,
`SESSION_TTL_HORAS`.

## Regras que o sistema não deixa quebrar

- **Uma compra = uma saída de dinheiro.** O rateio distribui o valor já lançado entre
  setor, categoria, turma e centro de custo; ele nunca cria despesa nova.
- **Soma das alocações ≤ total da compra.** Tentar ultrapassar é recusado com o valor
  excedido na mensagem.
- **Total do mês soma compras; recortes analíticos somam alocações.** Por isso o mesmo
  gasto aparece em vários recortes, mas nunca é contado duas vezes no total.
- **Dinheiro é sempre centavo inteiro** (`lib/numerario.ts`). Nada de float no cálculo.
- **Nada é apagado.** Cancelamento, estorno e reembolso entram como eventos novos na
  trilha; a auditoria é append-only.
- **Mês fechado trava escrita.** Depois do fechamento, só quem tem `compras.editar_fechada`
  reabre, e a reabertura fica registrada com motivo.
- **Dados sensíveis do cartão nunca são armazenados** (PAN, CVV, senha, token). Só o
  número da fatura, fornecedor e valores.

## Perfis

| Perfil | Pode |
| --- | --- |
| `admin` | tudo, inclusive usuários e fechamento |
| `gestor` | conciliação, aprovação, fechamento, relatórios, trilha, exportar |
| `comprador` | registra e edita as próprias compras, rateia, anexa, reporta |
| `lancador` | lança compras de qualquer responsável, rateia, anexa |
| `coord_f1` / `coord_f2` | rateia e reporta só as turmas da própria coordenação |
| `auditor` | somente leitura: compras, relatórios, trilha, exportar |

A matriz vive em `lib/rbac.ts` e é espelho de `api/internal/rbac/rbac.go` no projeto Go.
**O backend decide**: cada ação de escrita checa permissão em `lib/compras.ts`,
`lib/conciliacao.ts`, `lib/cadastros.ts` e `lib/usuarios.ts`; as rotas bloqueadas também
mostram aviso em vez de dados, e os `route handlers` devolvem 403.

## Estrutura

```
app/
  page.tsx              landing page pública (dark)
  login/ registro/      autenticação pública
  (painel)/             dashboard, compras, conciliação, relatórios,
                        cadastros, usuários, auditoria (logado)
  api/anexos/[id]       streaming autenticado de comprovantes
  api/exportar          CSV por relatório (BOM, ; e decimal ,)
lib/
  db.ts                 esquema SQLite + seeds
  compras.ts            regras de compra, rateio, aprovação, mês fechado
  conciliacao.ts        fatura, pareamento automático/manual, fechamento
  numerario.ts          centavos e formatação pt-BR
  auth.ts rbac.ts auditoria.ts relatorios.ts cadastros.ts usuarios.ts
components/             kit de UI escuro + blocos da landing
data/                   app.db + uploads/ (fora do git)
```

Comprovantes ficam em disco (`data/uploads`), limite de 10 MB, extensões
jpg/png/webp/heic/pdf. Em produção real o arquivo é servido por streaming
autenticado, nunca por URL pública.

## Diferenças para o sistema principal

| | SonhoXpBlack | este MVP |
| --- | --- | --- |
| Backend | Go + Postgres + S3 | Next.js (App Router) + SQLite + disco |
| Entrada de usuário | convite | registro público (1º = admin) |
| Sessão | `sessoes` no Postgres | `sessoes` no SQLite, mesmo desenho (hash + expiração) |
| Escopo | multi-instância | instância única, sem deploy docker |
