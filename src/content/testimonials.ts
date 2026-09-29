/**
 * Depoimentos da landing.
 *
 * Só depoimentos reais, com autorização de quem deu. Enquanto o array estiver
 * vazio, a seção inteira não é renderizada.
 */
export type Testimonial = {
  name: string;
  /** Ocupação ou contexto curto, ex.: "Divide apartamento com duas pessoas". */
  role?: string;
  /** Caminho em /public ou URL absoluta. */
  photo: string;
  text: string;
};

export const testimonials: Testimonial[] = [];
