import { useLocation } from "react-router-dom";
import { gruposVisiveis } from "./navGroups";
import { useAppContext } from "../../context";
import { SegmentedControl } from "../ui/SegmentedControl";

/**
 * As sub-telas do grupo atual, em abas segmentadas logo abaixo da barra do
 * topo no celular.
 *
 * `CarteiraPage`, `OrcamentoPage` e `NaRuaPage` são shells de rota puros — um
 * `<Outlet />` e nada mais. Sem esta linha, trocar de Contas para Cartões no
 * celular exigia abrir a gaveta a cada toque.
 *
 * Não aparece no Início nem em Configurações (não são grupo), nem em grupo
 * que ficou com um filho só depois do filtro de features: uma aba sozinha não
 * é escolha, é rótulo.
 */
/** O grupo da tela atual, se ele tem abas (dois filhos ou mais). */
function useGrupoComAbas() {
  const { pathname } = useLocation();
  const { isAdmin, features } = useAppContext();
  const grupo = gruposVisiveis(isAdmin, features).find((g) => pathname.startsWith(g.prefix));
  return grupo && grupo.items.length >= 2 ? grupo : null;
}

/**
 * Há abas de sub-tela no celular? Aí a aba já diz onde a pessoa está, e o
 * `PageHeader` esconde o título repetido e a descrição (só no celular).
 */
export const useTemSubAbas = () => useGrupoComAbas() !== null;

export const SubPills = () => {
  const { pathname } = useLocation();
  const grupo = useGrupoComAbas();
  if (!grupo) return null;

  return (
    <div className="md:hidden sticky top-14 z-sticky bg-page px-4 pt-1 pb-3">
      <SegmentedControl
        rotulo={`Seções de ${grupo.label}`}
        cheio
        segmentos={grupo.items.map((item) => ({
          chave: item.path,
          rotulo: item.label,
          to: item.path,
          ativo: pathname.startsWith(item.path),
        }))}
      />
    </div>
  );
};
