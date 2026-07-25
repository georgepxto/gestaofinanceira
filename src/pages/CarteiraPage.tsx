import { Outlet } from "react-router-dom";
import { PAGE_CONTAINER_RELATIVE_CLASS } from "../utils/layout";

/**
 * Aba-mãe "Carteira" — shell de rotas: a navegação entre visões vive na
 * sidebar e cada página-filha renderiza o próprio HEADER_PAGINA (com os
 * anchors de tour preservados). Aqui fica só o container.
 */
export const CarteiraPage = () => (
  <div className={PAGE_CONTAINER_RELATIVE_CLASS}>
    <Outlet />
  </div>
);
