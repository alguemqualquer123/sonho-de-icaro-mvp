import "./landing.css";

import Header from "./header";
import Hero from "./hero";
import Rateio from "./rateio";
import ComoFunciona from "./como-funciona";
import Recursos from "./recursos";
import Principios from "./principios";
import Numeros from "./numeros";
import Faq from "./faq";
import ChamadaFinal from "./chamada-final";
import Rodape from "./rodape";

export default function Landing() {
  return (
    <div className="min-h-screen bg-[#051327] font-[family-name:var(--font-geist-sans)] text-white antialiased [color-scheme:dark]">
      <Header />
      <main>
        <Hero />
        <Rateio />
        <ComoFunciona />
        <Recursos />
        <Principios />
        <Numeros />
        <Faq />
        <ChamadaFinal />
      </main>
      <Rodape />
    </div>
  );
}
