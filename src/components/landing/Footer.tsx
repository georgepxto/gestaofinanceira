/** Rodapé: uma linha só. */
export function Footer() {
  return (
    <footer
      className="flex items-center pb-[max(28px,env(safe-area-inset-bottom))] pt-7 lg:h-[var(--lp-foot-h)] lg:py-0"
      style={{ borderTop: "1px solid var(--lp-line)" }}
    >
      <div className="lp-wrap flex flex-wrap items-baseline justify-between gap-x-6 gap-y-2 text-[14px]">
        <div className="flex items-baseline gap-4">
          <span className="text-[17px] font-medium">Hedge</span>
          <span className="text-lp-muted">Suas contas na régua.</span>
        </div>
        <span className="text-lp-muted">© <span className="lp-num">2026</span></span>
      </div>
    </footer>
  );
}
