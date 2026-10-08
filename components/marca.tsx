import Image from "next/image";

/** Logo real da escola. A arte é azul-escuro sobre fundo transparente, então
 *  no tema escuro ela é clareada por filtro — sem placa/fundo branco. */
export function Marca() {
  return (
    <Image
      src="/sonho.png"
      alt="Colégio Sonho de Ícaro"
      width={848}
      height={294}
      className="h-6 w-auto brightness-[3]"
      priority
    />
  );
}
