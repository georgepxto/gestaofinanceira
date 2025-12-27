export interface PagamentoParcial {
  id?: string;
  valor: number;
  data: string;
}

export type AbaAtiva = "gastos" | "dividas" | "eu";

export interface ModalFeedback {
  show: boolean;
  titulo: string;
  mensagem: string;
  tipo: "sucesso" | "info";
}

export interface ModalConfirm {
  show: boolean;
  titulo: string;
  mensagem: string;
  onConfirm: () => void;
}
