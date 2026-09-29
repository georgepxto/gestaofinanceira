import { Component, type ReactNode } from "react";

/**
 * Se a parte de baixo da landing falhar (um chunk que não carrega depois de
 * um deploy, um erro de runtime), ela some sozinha: o nav e o hero, com o
 * botão de cadastro, continuam na tela em vez de a página inteira apagar.
 */
export class SafeBoundary extends Component<{ children: ReactNode }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch(error: unknown) {
    console.error("Landing: seção abaixo do hero falhou e foi ocultada.", error);
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}
