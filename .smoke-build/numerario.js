"use strict";
// Dinheiro em centavos inteiros. Nada aqui usa ponto flutuante no caminho de
// cálculo: entrada é tratada como string e convertida com aritmética inteira.
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatarCentavos = formatarCentavos;
exports.apenasNumeros = apenasNumeros;
exports.entradaInvalida = entradaInvalida;
exports.parsearCentavos = parsearCentavos;
exports.somarCentavos = somarCentavos;
exports.dividirIgual = dividirIgual;
function formatarCentavos(centavos) {
    const negativo = centavos < 0;
    const abs = Math.abs(Math.trunc(centavos));
    const inteiro = String(Math.floor(abs / 100));
    const resto = abs % 100;
    const grupos = [];
    for (let i = inteiro.length; i > 0; i -= 3) {
        grupos.unshift(inteiro.slice(Math.max(0, i - 3), i));
    }
    return `${negativo ? "-" : ""}R$ ${grupos.join(".")},${String(resto).padStart(2, "0")}`;
}
function apenasNumeros(centavos) {
    const abs = Math.abs(Math.trunc(centavos));
    return `${Math.floor(abs / 100)}.${String(abs % 100).padStart(2, "0")}`;
}
function entradaInvalida(entrada) {
    const limpo = entrada.trim().replace(/\s/g, "").replace(/^R\$/i, "");
    if (limpo === "")
        return "informe um valor";
    if (!/^-?\d+(?:[.,]\d{1,2})?$/.test(limpo.replace(/\.(?=\d{3}(\D|$))/g, ""))) {
        return "use o formato 1.234,56";
    }
    return "";
}
function parsearCentavos(entrada) {
    if (typeof entrada === "number")
        return Math.round(entrada);
    let s = entrada.trim().replace(/[Rr]\$\s?/, "").replace(/\s/g, "");
    const sinal = s.startsWith("-") ? -1 : 1;
    s = s.replace(/^-/, "");
    if (s.includes(","))
        s = s.replace(/\./g, "").replace(",", ".");
    else {
        // 1.234 = mil duzentos e trinta e quatro; 1.5 = um real e cinquenta
        const partes = s.split(".");
        if (partes.length > 1 && partes[1].length === 3)
            s = partes.join("");
        else
            s = partes.join(".");
    }
    const [int, dec = ""] = s.split(".");
    const inteiro = int === "" ? 0 : Number(int);
    const centavos = Number(dec.padEnd(2, "0").slice(0, 2) || "0");
    if (!Number.isInteger(inteiro) || !Number.isInteger(centavos)) {
        throw new Error(`valor monetário inválido: ${entrada}`);
    }
    return sinal * (inteiro * 100 + centavos);
}
function somarCentavos(...valores) {
    return valores.reduce((acc, v) => acc + Math.trunc(v), 0);
}
function dividirIgual(total, partes) {
    const base = Math.floor(total / partes);
    const resto = total - base * partes;
    return Array.from({ length: partes }, (_, i) => base + (i < resto ? 1 : 0));
}
