import { useState } from "react";

interface ModalFeedback {
  show: boolean;
  titulo: string;
  mensagem: string;
  tipo: "sucesso" | "info";
}

interface ModalConfirm {
  show: boolean;
  titulo: string;
  mensagem: string;
  onConfirm: () => void;
}

export function useModals() {
  const [modalFeedback, setModalFeedback] = useState<ModalFeedback>({
    show: false,
    titulo: "",
    mensagem: "",
    tipo: "sucesso",
  });

  const [modalConfirm, setModalConfirm] = useState<ModalConfirm>({
    show: false,
    titulo: "",
    mensagem: "",
    onConfirm: () => {},
  });

  const showFeedback = (
    titulo: string,
    mensagem: string,
    tipo: "sucesso" | "info"
  ) => {
    setModalFeedback({ show: true, titulo, mensagem, tipo });
  };

  const hideFeedback = () => {
    setModalFeedback((prev) => ({ ...prev, show: false }));
  };

  const showConfirm = (
    titulo: string,
    mensagem: string,
    onConfirm: () => void
  ) => {
    setModalConfirm({ show: true, titulo, mensagem, onConfirm });
  };

  const hideConfirm = () => {
    setModalConfirm((prev) => ({ ...prev, show: false }));
  };

  return {
    modalFeedback,
    setModalFeedback,
    showFeedback,
    hideFeedback,
    modalConfirm,
    setModalConfirm,
    showConfirm,
    hideConfirm,
  };
}
