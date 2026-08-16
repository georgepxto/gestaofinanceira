import { Link, useLocation } from "react-router-dom";
import { gruposVisiveis } from "./navGroups";
import { useAppContext } from "../../context";

/**
 * As sub-telas do grupo atual, em pílulas, logo abaixo do header do mobile.
 *
 * `CarteiraPage`, `OrcamentoPage` e `NaRuaPage` são shells de rota puros — um
 * `<Outlet />` e nada mais. Sem esta linha, trocar de *Contas* para *Cartões*
 * no celular exigia abrir a gaveta a cada toque.
 *
 * Não aparece no Dashboard nem em Configurações (não são grupo), nem em grupo
 * que ficou com um filho só depois do filtro de features: uma pílula sozinha
 * não é escolha, é rótulo.
 */
export const SubPills = () => {
  const { pathname } = useLocation();
  const { isAdmin, features } = useAppContext();

  const grupo = gruposVisiveis(isAdmin, features).find((g) => pathname.startsWith(g.prefix));
  if (!grupo || grupo.items.length < 2) return null;

  return (
    <nav
      aria-label={`Seções de ${grupo.label}`}
      className="md:hidden sticky top-16 z-30 bg-zinc-50 dark:bg-app-dark"
    >
      <div className="h-12 flex items-center gap-2 overflow-x-auto -mx-4 px-4 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
        {grupo.items.map((item) => {
          const ativo = pathname.startsWith(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              aria-current={ativo ? "page" : undefined}
              className={`h-8 px-3.5 rounded-full text-[13px] whitespace-nowrap flex items-center transition-colors ${
                ativo
                  ? "bg-white dark:bg-white/[0.08] text-zinc-900 dark:text-zinc-50 font-semibold shadow-sm dark:shadow-none border border-zinc-200 dark:border-white/[0.09]"
                  : "text-zinc-500 dark:text-zinc-400 font-medium"
              }`}
            >
              {item.label}
            </Link>
          );
        })}
      </div>
    </nav>
  );
};
