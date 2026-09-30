import { createContext, useContext, useEffect, useState, type ReactNode } from "react";

/**
 * Um botão laranja por tela, e só um.
 *
 * O "Lançar" da barra lateral é a ação principal do app — até a tela aberta ter
 * a sua própria (Novo cartão, Pagar fatura, Nova meta). Quando tem, a tela
 * avisa por `useAcaoPrincipalDaPagina()` e o Lançar passa a botão neutro
 * enquanto ela estiver montada. No celular a conta é outra: lá o "+" da barra
 * inferior é o botão da tela, e o botão laranja da página fica só no desktop.
 */
interface AcaoPrincipalValor {
  paginaTemAcao: boolean;
  registrar: () => () => void;
}

const AcaoPrincipalContext = createContext<AcaoPrincipalValor>({
  paginaTemAcao: false,
  registrar: () => () => {},
});

export function AcaoPrincipalProvider({ children }: { children: ReactNode }) {
  // Contador, não booleano: numa troca de rota a tela nova monta antes de a
  // antiga desmontar, e um booleano seria desligado pela que está saindo.
  const [registros, setRegistros] = useState(0);

  const registrar = () => {
    setRegistros((n) => n + 1);
    return () => setRegistros((n) => n - 1);
  };

  return (
    <AcaoPrincipalContext.Provider value={{ paginaTemAcao: registros > 0, registrar }}>
      {children}
    </AcaoPrincipalContext.Provider>
  );
}

export const useAcaoPrincipal = () => useContext(AcaoPrincipalContext);

/** A tela chama isto quando mostra o próprio botão laranja. */
export function useAcaoPrincipalDaPagina(ativa = true) {
  const { registrar } = useContext(AcaoPrincipalContext);
  useEffect(() => {
    if (!ativa) return;
    return registrar();
    // `registrar` é recriado a cada render do provider; o que importa é `ativa`.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ativa]);
}
