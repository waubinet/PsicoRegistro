/**
 * Escuta os atalhos globais e mostra a lista de ajuda (Shift + ?).
 * Montado uma vez no layout.
 */
import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { ATALHOS, focoEmCampo, resolver, rotulo } from "@/lib/atalhos";
import { Modal } from "./ui";

export function Atalhos() {
  const [ajudaAberta, setAjudaAberta] = useState(false);
  const nav = useNavigate();

  useEffect(() => {
    function aoTeclar(e: KeyboardEvent) {
      // digitar num campo nunca dispara atalho
      if (focoEmCampo(e.target)) return;
      const a = resolver(e);
      if (!a) return;
      e.preventDefault();
      if (a.acao === "ajuda-atalhos") setAjudaAberta(true);
      else if (a.acao === "novo-atendimento") nav("/agenda?novo=1");
      else nav(a.acao);
    }
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [nav]);

  return (
    <Modal open={ajudaAberta} onClose={() => setAjudaAberta(false)} title="Atalhos de teclado">
      <table className="table-base">
        <tbody>
          {ATALHOS.map((a) => (
            <tr key={a.acao}>
              <td className="whitespace-nowrap font-mono text-sm">{rotulo(a)}</td>
              <td>{a.descricao}</td>
            </tr>
          ))}
          <tr>
            <td className="whitespace-nowrap font-mono text-sm">Esc</td>
            <td>Fechar a janela aberta</td>
          </tr>
        </tbody>
      </table>
      <p className="mt-3 text-sm text-base-700">
        Os atalhos não funcionam enquanto você digita num campo de texto.
      </p>
      <div className="mt-4 flex justify-end">
        <button className="btn-primary" onClick={() => setAjudaAberta(false)}>
          Fechar
        </button>
      </div>
    </Modal>
  );
}
