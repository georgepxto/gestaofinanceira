import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrency, formatMonthYear } from "./calculations";
import { categoriaDeGasto, normalizarCategoria } from "./categories";
import type { ParcelaAtiva, ResumoMensal, MeuGasto, MetaGasto } from "../types";
import type { PagamentoParcial } from "../types/extended";

// Paleta do PDF: a mesma régua do app em papel. Tinta quase preta e cinzas;
// laranja só para atenção (80% da meta, pendente) e vermelho para estouro.
// No papel branco o laranja do app não tem contraste para texto, então o texto
// de atenção usa uma versão escura.
type RGB = [number, number, number];
const TINTA: RGB = [17, 17, 17];
const TINTA_2: RGB = [94, 94, 91];
const FIO: RGB = [220, 220, 217];
const FUNDO: RGB = [244, 244, 242];
const LARANJA: RGB = [255, 107, 53];
const LARANJA_TEXTO: RGB = [184, 70, 18];
const PERIGO: RGB = [200, 40, 46];
const CABECALHO = { fillColor: [232, 232, 229] as RGB, textColor: TINTA, fontStyle: "bold" as const };

export const generateGastosPDF = (
  parcelas: ParcelaAtiva[],
  resumo: ResumoMensal[],
  total: number,
  mes: Date,
  filtros: { pessoa: string; tipo: string; dia: string },
  pagamentosPorPessoa?: Record<string, PagamentoParcial[]>
) => {
  const doc = new jsPDF();
  
  // Título
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Relatório de despesas", 14, 22);
  
  // Mês referência
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TINTA_2);
  const mesFormatado = formatMonthYear(mes);
  doc.text(`${mesFormatado.charAt(0).toUpperCase() + mesFormatado.slice(1)}`, 14, 30);
  
  let yPos = 38;

  // Filtros aplicados
  const filtrosAtivos = [];
  if (filtros.pessoa) filtrosAtivos.push(`Pessoa: ${filtros.pessoa}`);
  if (filtros.tipo) filtrosAtivos.push(`Tipo: ${filtros.tipo === "credito" ? "Crédito" : "Débito"}`);
  if (filtros.dia) filtrosAtivos.push(`Data: ${format(new Date(`${filtros.dia}T12:00:00`), "dd/MM/yyyy")}`);
  
  if (filtrosAtivos.length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(...TINTA_2);
    doc.text(`Filtros: ${filtrosAtivos.join(" | ")}`, 14, yPos);
    yPos += 10;
  }

  // Linha separadora
  doc.setDrawColor(...FIO);
  doc.line(14, yPos - 2, 196, yPos - 2);
  yPos += 4;

  // Agrupar por pessoa
  const pessoasSet = new Set(parcelas.map(p => p.gasto.pessoa));
  const pessoas = Array.from(pessoasSet).sort();

  pessoas.forEach((pessoa, idx) => {
    const parcelasPessoa = parcelas.filter(p => p.gasto.pessoa === pessoa);
    const resumoPessoa = resumo.find(r => r.pessoa === pessoa);
    
    // Verificar se precisa de nova página
    if (yPos > doc.internal.pageSize.height - 60) {
      doc.addPage();
      yPos = 20;
    }

    // Nome da pessoa
    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TINTA);
    doc.text(pessoa, 14, yPos);
    const nomeWidth = doc.getTextWidth(pessoa); // medir ANTES de trocar font
    
    // Quantidade de itens (na mesma linha, após o nome)
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TINTA_2);
    doc.text(`${parcelasPessoa.length} ${parcelasPessoa.length === 1 ? "lançamento" : "lançamentos"}`, 14 + nomeWidth + 4, yPos);
    yPos += 6;
    
    // Tabela individual
    const tableData = parcelasPessoa.map(p => {
      // Formatar data evitando timezone
      const dateParts = p.gasto.data_inicio.split("-");
      const safeDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : p.gasto.data_inicio;
      
      return [
        safeDate,
        p.gasto.descricao,
        normalizarCategoria(p.gasto.categoria) || "—",
        p.gasto.tipo === "credito" ? "Crédito" : "Débito",
        p.gasto.recorrente ? "Fixo" : `${p.parcela_atual}/${p.gasto.num_parcelas}`,
        formatCurrency(p.valor_parcela)
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [["Data", "Descrição", "Categoria", "Tipo", "Parcela", "Valor"]],
      body: tableData,
      theme: "striped",
      headStyles: { ...CABECALHO, fontSize: 9 },
      bodyStyles: {
        fontSize: 9,
      },
      columnStyles: {
        0: { cellWidth: 22 },  // Data
        1: { cellWidth: "auto" }, // Descrição
        2: { cellWidth: 30 },  // Categoria
        3: { cellWidth: 20 },  // Tipo
        4: { cellWidth: 20 },  // Parcela
        5: { cellWidth: 28, halign: "right" },  // Valor
      },
      margin: { left: 14, right: 14 },
    });

    // @ts-ignore - jspdf-autotable adds lastAutoTable
    yPos = doc.lastAutoTable.finalY + 4;
    
    // Total da pessoa
    if (resumoPessoa) {
      doc.setFontSize(11);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...TINTA);
      const totalText = `Total ${pessoa}: ${formatCurrency(resumoPessoa.total)}`;
      // Alinhar à direita
      const textWidth = doc.getTextWidth(totalText);
      doc.text(totalText, 196 - textWidth, yPos);
      doc.setFont("helvetica", "normal");
      yPos += 8;
    }

    // Pagamentos parciais da pessoa
    const pagamentos = pagamentosPorPessoa?.[pessoa] || [];
    if (pagamentos.length > 0) {
      const resumoPessoa2 = resumo.find(r => r.pessoa === pessoa);
      const totalDevido = resumoPessoa2?.total || 0;
      const totalPago = pagamentos.reduce((sum, p) => sum + p.valor, 0);
      const restante = totalDevido - totalPago;

      // Verificar se precisa de nova página
      if (yPos > doc.internal.pageSize.height - 60) {
        doc.addPage();
        yPos = 20;
      }

      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...TINTA);
      doc.text(`Pagamentos parciais — ${pessoa}`, 14, yPos);
      yPos += 5;

      const pagData = pagamentos.map(p => [
        p.data,
        formatCurrency(p.valor)
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [["Data", "Valor pago"]],
        body: pagData,
        theme: "striped",
        headStyles: { ...CABECALHO, fontSize: 9 },
        bodyStyles: { fontSize: 9 },
        columnStyles: {
          0: { cellWidth: 40 },
          1: { cellWidth: 40, halign: "right" },
        },
        margin: { left: 14, right: 100 },
        tableWidth: 80,
      });

      // @ts-ignore
      yPos = doc.lastAutoTable.finalY + 4;

      doc.setFontSize(9);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...TINTA);
      doc.text(`Total pago: ${formatCurrency(totalPago)}`, 14, yPos);
      doc.setTextColor(...(restante > 0 ? LARANJA_TEXTO : TINTA_2));
      doc.text(`Falta: ${formatCurrency(Math.max(0, restante))}`, 70, yPos);
      doc.setFont("helvetica", "normal");
      yPos += 10;
    }
    
    // Separador entre pessoas
    if (idx < pessoas.length - 1) {
      doc.setDrawColor(...FIO);
      doc.line(14, yPos - 4, 196, yPos - 4);
      yPos += 4;
    }
  });

  // Total Geral
  if (yPos > doc.internal.pageSize.height - 30) {
    doc.addPage();
    yPos = 20;
  }
  
  // Linha antes do total geral
  doc.setDrawColor(...TINTA);
  doc.setLineWidth(0.5);
  doc.line(14, yPos, 196, yPos);
  yPos += 8;
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...TINTA);
  doc.text(`Total geral: ${formatCurrency(total)}`, 14, yPos);
  yPos += 6;
  
  // Quantidade total (linha separada)
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TINTA_2);
  doc.text(`${parcelas.length} ${parcelas.length === 1 ? "lançamento" : "lançamentos"}`, 14, yPos);
  yPos += 12;

  // Seção: Para o Saldo Devedor ( Restante do mês )
  const pessoasNoPdf = Array.from(new Set(parcelas.map(p => p.gasto.pessoa)));
  const devendoEsteMes: { pessoa: string; totalDevido: number; totalPago: number; restante: number }[] = [];

  pessoasNoPdf.forEach(pessoa => {
    const resumoPessoa = resumo.find(r => r.pessoa === pessoa);
    const pagamentos = pagamentosPorPessoa?.[pessoa] || [];
    const totalDevido = resumoPessoa?.total || 0;
    const totalPago = pagamentos.reduce((sum, p) => sum + p.valor, 0);
    const restante = totalDevido - totalPago;

    // Apenas quem ainda deve algo deste mês específico
    if (restante > 0.01) { // margem de arredondamento
      devendoEsteMes.push({ pessoa, totalDevido, totalPago, restante });
    }
  });

  if (devendoEsteMes.length > 0) {
    if (yPos > doc.internal.pageSize.height - 60) {
      doc.addPage();
      yPos = 20;
    }

    doc.setDrawColor(...TINTA);
    doc.setLineWidth(0.5);
    doc.line(14, yPos - 2, 196, yPos - 2);
    yPos += 6;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TINTA);
    doc.text("Vai para a dívida (não pago neste mês)", 14, yPos);
    yPos += 6;

    const dividasData = devendoEsteMes.map(d => [
      d.pessoa,
      formatCurrency(d.totalDevido),
      formatCurrency(d.totalPago),
      formatCurrency(d.restante),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Pessoa", "Total do mês", "Valor pago", "Vai para a dívida"]],
      body: dividasData,
      theme: "striped",
      headStyles: { ...CABECALHO, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        0: { cellWidth: 40 },
        1: { cellWidth: 35, halign: "right" },
        2: { cellWidth: 35, halign: "right" },
        3: { cellWidth: 35, halign: "right", fontStyle: "bold" },
      },
      margin: { left: 14, right: 14 },
    });

    // @ts-ignore
    yPos = doc.lastAutoTable.finalY + 4;

    const totalParaDivida = devendoEsteMes.reduce((sum, d) => sum + d.restante, 0);
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TINTA);
    const totalDivText = `Total que vai para a dívida: ${formatCurrency(totalParaDivida)}`;
    const divTextW = doc.getTextWidth(totalDivText);
    doc.text(totalDivText, 196 - divTextW, yPos);
  }

  // Rodapé com data/hora de geração
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TINTA_2);
    const pageHeight = doc.internal.pageSize.height;
    doc.text(
      `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
      14,
      pageHeight - 10
    );
    doc.text(
      `Página ${i} de ${pageCount}`,
      196 - doc.getTextWidth(`Página ${i} de ${pageCount}`),
      pageHeight - 10
    );
  }

  // Download
  let filename = `gastos_${format(mes, "MM-yyyy")}`;
  if (filtros.pessoa) filename += `_${filtros.pessoa.replace(/\s+/g, "_")}`;
  doc.save(`${filename}.pdf`);
};

// ========================================
// PDF de Meus Gastos (Pessoais)
// ========================================
export const generateMeusGastosPDF = (
  meusGastosDoMes: MeuGasto[],
  gastosFixos: MeuGasto[],
  metas: MetaGasto[],
  totais: {
    credito: number;
    debito: number;
    pagos: number;
    fixos: number;
  },
  mes: Date,
  filtros: { categoria: string; dia: string }
) => {
  const doc = new jsPDF();
  const pageWidth = doc.internal.pageSize.width;

  // ─── Título ───
  doc.setFontSize(20);
  doc.setFont("helvetica", "bold");
  doc.text("Meus gastos — relatório pessoal", 14, 22);

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TINTA_2);
  const mesFormatado = formatMonthYear(mes);
  doc.text(`${mesFormatado.charAt(0).toUpperCase() + mesFormatado.slice(1)}`, 14, 30);

  let yPos = 38;

  // Filtros
  const filtrosAtivos = [];
  if (filtros.categoria) {
    const labels: Record<string, string> = { pessoal: "Pessoal", dividido: "Dividido", fixo: "Fixo" };
    filtrosAtivos.push(`Categoria: ${labels[filtros.categoria] || filtros.categoria}`);
  }
  if (filtros.dia) filtrosAtivos.push(`Data: ${format(new Date(`${filtros.dia}T12:00:00`), "dd/MM/yyyy")}`);

  if (filtrosAtivos.length > 0) {
    doc.setFontSize(10);
    doc.setTextColor(...TINTA_2);
    doc.text(`Filtros: ${filtrosAtivos.join(" | ")}`, 14, yPos);
    yPos += 8;
  }

  // ─── Resumo (4 cards em linha) ───
  doc.setDrawColor(...FIO);
  doc.line(14, yPos, pageWidth - 14, yPos);
  yPos += 6;

  const cardWidth = (pageWidth - 28 - 12) / 4; // 4 cards with 4px gaps
  const cards = [
    { label: "Crédito", valor: totais.credito },
    { label: "Débito", valor: totais.debito },
    { label: "Pago", valor: totais.pagos },
    { label: "Fixos", valor: totais.fixos },
  ];

  cards.forEach((card, i) => {
    const x = 14 + i * (cardWidth + 4);
    // Card background
    doc.setFillColor(...FUNDO);
    doc.roundedRect(x, yPos, cardWidth, 22, 1, 1, "F");
    // Label
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TINTA_2);
    doc.text(card.label, x + 4, yPos + 8);
    // Value
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TINTA);
    doc.text(formatCurrency(card.valor), x + 4, yPos + 18);
  });

  yPos += 30;

  // Total geral do mês
  const totalMes = totais.credito + totais.debito;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...TINTA);
  doc.text(`Total do mês: ${formatCurrency(totalMes)}`, 14, yPos);
  yPos += 10;

  // ─── Metas de Gasto ───
  if (metas.length > 0) {
    doc.setDrawColor(...FIO);
    doc.line(14, yPos - 2, pageWidth - 14, yPos - 2);
    yPos += 4;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TINTA);
    doc.text("Metas de gasto", 14, yPos);
    yPos += 8;

    metas.forEach(meta => {
      if (yPos > doc.internal.pageSize.height - 40) {
        doc.addPage();
        yPos = 20;
      }

      // Calcular gasto atual nesta categoria
      const gastoCategoria = meusGastosDoMes
        .filter(g => categoriaDeGasto(g).toLowerCase() === meta.categoria.toLowerCase())
        .reduce((acc, g) => {
          const val = g.categoria === "dividido" && g.minha_parte ? g.minha_parte : g.valor;
          return acc + val;
        }, 0);

      const percentual = meta.limite > 0 ? Math.min((gastoCategoria / meta.limite) * 100, 100) : 0;
      const ultrapassou = gastoCategoria > meta.limite;

      // Nome da categoria + valores
      doc.setFontSize(10);
      doc.setFont("helvetica", "bold");
      doc.setTextColor(...TINTA);
      doc.text(meta.categoria, 14, yPos);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(...TINTA_2);
      const statusText = `${formatCurrency(gastoCategoria)} / ${formatCurrency(meta.limite)} (${percentual.toFixed(0)}%)`;
      doc.text(statusText, pageWidth - 14 - doc.getTextWidth(statusText), yPos);
      yPos += 4;

      // Barra de progresso
      const barWidth = pageWidth - 28;
      const barHeight = 2;

      // Background
      doc.setFillColor(...FIO);
      doc.rect(14, yPos, barWidth, barHeight, "F");

      // Mesma régua do app: tinta, laranja a partir de 80%, vermelho acima de 100%.
      doc.setFillColor(...(ultrapassou ? PERIGO : percentual >= 80 ? LARANJA : TINTA));
      const fillWidth = (percentual / 100) * barWidth;
      if (fillWidth > 0) {
        doc.rect(14, yPos, fillWidth, barHeight, "F");
      }

      yPos += 10;
    });

    yPos += 4;
  }

  // ─── Gastos Fixos ───
  const fixosAtivos = gastosFixos.filter(g => g.ativo !== false);
  if (fixosAtivos.length > 0) {
    if (yPos > doc.internal.pageSize.height - 60) {
      doc.addPage();
      yPos = 20;
    }

    doc.setDrawColor(...FIO);
    doc.line(14, yPos - 2, pageWidth - 14, yPos - 2);
    yPos += 4;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TINTA);
    doc.text("Gastos fixos", 14, yPos);
    yPos += 6;

    const fixosData = fixosAtivos
      .sort((a, b) => (a.dia_vencimento || 0) - (b.dia_vencimento || 0))
      .map(g => [
        `Dia ${g.dia_vencimento || "—"}`,
        g.descricao,
        g.tipo === "credito" ? "Crédito" : "Débito",
        normalizarCategoria(g.categoria_gasto) || "—",
        formatCurrency(g.minha_parte || g.valor),
      ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Vencimento", "Descrição", "Tipo", "Categoria", "Valor"]],
      body: fixosData,
      theme: "striped",
      headStyles: { ...CABECALHO, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 4: { halign: "right" } },
      margin: { left: 14, right: 14 },
    });

    // @ts-ignore
    yPos = doc.lastAutoTable.finalY + 4;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TINTA);
    const totalFixosText = `Total dos fixos: ${formatCurrency(totais.fixos)}`;
    doc.text(totalFixosText, pageWidth - 14 - doc.getTextWidth(totalFixosText), yPos);
    yPos += 12;
  }

  // ─── Gastos do Mês (detalhado por dia) ───
  if (meusGastosDoMes.length > 0) {
    if (yPos > doc.internal.pageSize.height - 60) {
      doc.addPage();
      yPos = 20;
    }

    doc.setDrawColor(...FIO);
    doc.line(14, yPos - 2, pageWidth - 14, yPos - 2);
    yPos += 4;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TINTA);
    doc.text(`Gastos do mês (${meusGastosDoMes.length})`, 14, yPos);
    yPos += 6;

    // Preparar dados para tabela
    const gastosOrdenados = [...meusGastosDoMes].sort((a, b) => a.data.localeCompare(b.data));

    const tableData = gastosOrdenados.map(g => {
      const dateParts = g.data.split("-");
      const safeDate = dateParts.length === 3 ? `${dateParts[2]}/${dateParts[1]}/${dateParts[0]}` : g.data;
      const categoriaLabel: Record<string, string> = { pessoal: "Pessoal", dividido: "Dividido", fixo: "Fixo" };
      const valor = g.categoria === "dividido" && g.minha_parte ? g.minha_parte : g.valor;

      return [
        safeDate,
        g.descricao,
        normalizarCategoria(g.categoria_gasto) || "—",
        categoriaLabel[g.categoria] || g.categoria,
        g.tipo === "credito" ? "Crédito" : "Débito",
        g.pago || g.tipo === "debito" ? "Pago" : "Pendente",
        formatCurrency(valor),
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [["Data", "Descrição", "Categoria", "Tipo", "Pagamento", "Status", "Valor"]],
      body: tableData,
      theme: "striped",
      headStyles: { ...CABECALHO, fontSize: 8 },
      bodyStyles: { fontSize: 8 },
      columnStyles: {
        0: { cellWidth: 20 },
        1: { cellWidth: "auto" },
        2: { cellWidth: 24 },
        3: { cellWidth: 20 },
        4: { cellWidth: 20 },
        5: { cellWidth: 18 },
        6: { cellWidth: 24, halign: "right" },
      },
      margin: { left: 14, right: 14 },
      didParseCell: (data: any) => {
        // Status: pago em cinza, pendente em atenção
        if (data.section === "body" && data.column.index === 5) {
          data.cell.styles.textColor = data.cell.raw === "Pago" ? TINTA_2 : LARANJA_TEXTO;
        }
      },
    });

    // @ts-ignore
    yPos = doc.lastAutoTable.finalY + 8;
  }

  // ─── Resumo por Categoria de Gasto ───
  const categoriaMap: Record<string, number> = {};
  meusGastosDoMes.forEach(g => {
    const cat = normalizarCategoria(g.categoria_gasto) || "Sem categoria";
    const val = g.categoria === "dividido" && g.minha_parte ? g.minha_parte : g.valor;
    categoriaMap[cat] = (categoriaMap[cat] || 0) + val;
  });

  const categoriasOrdenadas = Object.entries(categoriaMap).sort((a, b) => b[1] - a[1]);

  if (categoriasOrdenadas.length > 0) {
    if (yPos > doc.internal.pageSize.height - 60) {
      doc.addPage();
      yPos = 20;
    }

    doc.setDrawColor(...FIO);
    doc.line(14, yPos - 2, pageWidth - 14, yPos - 2);
    yPos += 4;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(...TINTA);
    doc.text("Resumo por categoria", 14, yPos);
    yPos += 6;

    const catData = categoriasOrdenadas.map(([cat, val]) => [
      cat,
      formatCurrency(val),
      `${totalMes > 0 ? ((val / totalMes) * 100).toFixed(1) : 0}%`,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Categoria", "Total", "% do total"]],
      body: catData,
      theme: "striped",
      headStyles: { ...CABECALHO, fontSize: 9 },
      bodyStyles: { fontSize: 9 },
      columnStyles: {
        1: { halign: "right" },
        2: { halign: "right" },
      },
      margin: { left: 14, right: 14 },
    });

    // @ts-ignore
    yPos = doc.lastAutoTable.finalY + 8;
  }

  // ─── Total Final ───
  if (yPos > doc.internal.pageSize.height - 30) {
    doc.addPage();
    yPos = 20;
  }

  doc.setDrawColor(...TINTA);
  doc.setLineWidth(0.5);
  doc.line(14, yPos, pageWidth - 14, yPos);
  yPos += 8;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(...TINTA);
  doc.text(`Total geral: ${formatCurrency(totalMes)}`, 14, yPos);
  yPos += 6;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(...TINTA_2);
  doc.text(`${meusGastosDoMes.length} ${meusGastosDoMes.length === 1 ? "lançamento" : "lançamentos"} + ${fixosAtivos.length} fixos`, 14, yPos);

  // ─── Rodapé ───
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(...TINTA_2);
    const pageHeight = doc.internal.pageSize.height;
    doc.text(
      `Gerado em ${format(new Date(), "dd/MM/yyyy 'às' HH:mm", { locale: ptBR })}`,
      14,
      pageHeight - 10
    );
    doc.text(
      `Página ${i} de ${pageCount}`,
      pageWidth - 14 - doc.getTextWidth(`Página ${i} de ${pageCount}`),
      pageHeight - 10
    );
  }

  // Download
  let filename = `meus_gastos_${format(mes, "MM-yyyy")}`;
  if (filtros.categoria) filename += `_${filtros.categoria}`;
  doc.save(`${filename}.pdf`);
};
