import jsPDF from "jspdf";
import autoTable from "jspdf-autotable";
import { format } from "date-fns";
import { ptBR } from "date-fns/locale";
import { formatCurrency, formatMonthYear } from "./calculations";
import { categoriaDeGasto, normalizarCategoria } from "./categories";
import type { ParcelaAtiva, ResumoMensal, MeuGasto, MetaGasto } from "../types";
import type { PagamentoParcial } from "../types/extended";

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
  doc.text("Relatório de Despesas", 14, 22);
  
  // Mês referência
  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
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
    doc.setTextColor(120);
    doc.text(`Filtros: ${filtrosAtivos.join(" | ")}`, 14, yPos);
    yPos += 10;
  }

  // Linha separadora
  doc.setDrawColor(200);
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
    doc.setTextColor(59, 130, 246); // blue-600
    doc.text(pessoa, 14, yPos);
    const nomeWidth = doc.getTextWidth(pessoa); // medir ANTES de trocar font
    
    // Quantidade de itens (na mesma linha, após o nome)
    doc.setFontSize(10);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(150);
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
      headStyles: { 
        fillColor: [59, 130, 246],
        fontSize: 9,
        fontStyle: "bold",
      },
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
      doc.setTextColor(0);
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
      doc.setTextColor(34, 139, 34); // verde
      doc.text(`Pagamentos Parciais — ${pessoa}`, 14, yPos);
      yPos += 5;

      const pagData = pagamentos.map(p => [
        p.data,
        formatCurrency(p.valor)
      ]);

      autoTable(doc, {
        startY: yPos,
        head: [["Data", "Valor Pago"]],
        body: pagData,
        theme: "striped",
        headStyles: {
          fillColor: [34, 139, 34],
          fontSize: 9,
          fontStyle: "bold",
        },
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
      doc.setTextColor(34, 139, 34);
      doc.text(`Total pago: ${formatCurrency(totalPago)}`, 14, yPos);
      doc.setTextColor(restante > 0 ? 200 : 100, restante > 0 ? 80 : 100, restante > 0 ? 50 : 100);
      doc.text(`Falta: ${formatCurrency(Math.max(0, restante))}`, 70, yPos);
      doc.setFont("helvetica", "normal");
      yPos += 10;
    }
    
    // Separador entre pessoas
    if (idx < pessoas.length - 1) {
      doc.setDrawColor(220);
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
  doc.setDrawColor(59, 130, 246);
  doc.setLineWidth(0.5);
  doc.line(14, yPos, 196, yPos);
  yPos += 8;
  
  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text(`Total Geral: ${formatCurrency(total)}`, 14, yPos);
  yPos += 6;
  
  // Quantidade total (linha separada)
  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
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

    doc.setDrawColor(220, 80, 50);
    doc.setLineWidth(0.5);
    doc.line(14, yPos - 2, 196, yPos - 2);
    yPos += 6;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(220, 80, 50);
    doc.text("Para o Saldo Devedor (Não pago neste mês)", 14, yPos);
    yPos += 6;

    const dividasData = devendoEsteMes.map(d => [
      d.pessoa,
      formatCurrency(d.totalDevido),
      formatCurrency(d.totalPago),
      formatCurrency(d.restante),
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Pessoa", "Total do Mês", "Valor Pago", "Vai para dívida"]],
      body: dividasData,
      theme: "striped",
      headStyles: {
        fillColor: [220, 80, 50],
        fontSize: 9,
        fontStyle: "bold",
      },
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
    doc.setTextColor(220, 80, 50);
    const totalDivText = `Total para o Saldo Devedor: ${formatCurrency(totalParaDivida)}`;
    const divTextW = doc.getTextWidth(totalDivText);
    doc.text(totalDivText, 196 - divTextW, yPos);
  }

  // Rodapé com data/hora de geração
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(160);
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
  doc.text("Meus Gastos — Relatório Pessoal", 14, 22);

  doc.setFontSize(12);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(100);
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
    doc.setTextColor(120);
    doc.text(`Filtros: ${filtrosAtivos.join(" | ")}`, 14, yPos);
    yPos += 8;
  }

  // ─── Resumo (4 cards em linha) ───
  doc.setDrawColor(200);
  doc.line(14, yPos, pageWidth - 14, yPos);
  yPos += 6;

  const cardWidth = (pageWidth - 28 - 12) / 4; // 4 cards with 4px gaps
  const cards = [
    { label: "Crédito", valor: totais.credito, cor: [139, 92, 246] },  // purple
    { label: "Débito", valor: totais.debito, cor: [16, 185, 129] },   // emerald
    { label: "Pago", valor: totais.pagos, cor: [34, 197, 94] },       // green
    { label: "Fixos", valor: totais.fixos, cor: [245, 158, 11] },     // amber
  ];

  cards.forEach((card, i) => {
    const x = 14 + i * (cardWidth + 4);
    // Card background
    doc.setFillColor(245, 247, 250);
    doc.roundedRect(x, yPos, cardWidth, 22, 3, 3, "F");
    // Label
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(card.cor[0], card.cor[1], card.cor[2]);
    doc.text(card.label, x + 4, yPos + 8);
    // Value
    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(30);
    doc.text(formatCurrency(card.valor), x + 4, yPos + 18);
  });

  yPos += 30;

  // Total geral do mês
  const totalMes = totais.credito + totais.debito;
  doc.setFontSize(12);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text(`Total do Mês: ${formatCurrency(totalMes)}`, 14, yPos);
  yPos += 10;

  // ─── Metas de Gasto ───
  if (metas.length > 0) {
    doc.setDrawColor(200);
    doc.line(14, yPos - 2, pageWidth - 14, yPos - 2);
    yPos += 4;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(139, 92, 246); // purple
    doc.text("Metas de Gasto", 14, yPos);
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
      doc.setTextColor(30);
      doc.text(meta.categoria, 14, yPos);

      doc.setFont("helvetica", "normal");
      doc.setTextColor(100);
      const statusText = `${formatCurrency(gastoCategoria)} / ${formatCurrency(meta.limite)} (${percentual.toFixed(0)}%)`;
      doc.text(statusText, pageWidth - 14 - doc.getTextWidth(statusText), yPos);
      yPos += 4;

      // Barra de progresso
      const barWidth = pageWidth - 28;
      const barHeight = 5;

      // Background
      doc.setFillColor(230, 230, 230);
      doc.roundedRect(14, yPos, barWidth, barHeight, 2, 2, "F");

      // Progress fill
      if (ultrapassou) {
        doc.setFillColor(239, 68, 68); // red
      } else if (percentual > 80) {
        doc.setFillColor(245, 158, 11); // amber
      } else {
        doc.setFillColor(34, 197, 94); // green
      }
      const fillWidth = (percentual / 100) * barWidth;
      if (fillWidth > 0) {
        doc.roundedRect(14, yPos, fillWidth, barHeight, 2, 2, "F");
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

    doc.setDrawColor(200);
    doc.line(14, yPos - 2, pageWidth - 14, yPos - 2);
    yPos += 4;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(245, 158, 11); // amber
    doc.text("Gastos Fixos Mensais", 14, yPos);
    yPos += 6;

    const fixosData = fixosAtivos
      .sort((a, b) => (a.dia_vencimento || 0) - (b.dia_vencimento || 0))
      .map(g => [
        `Dia ${g.dia_vencimento || "—"}`,
        g.descricao,
        g.tipo === "credito" ? "Crédito" : "Débito",
        normalizarCategoria(g.categoria_gasto) || "—",
        formatCurrency(g.valor),
      ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Vencimento", "Descrição", "Tipo", "Categoria", "Valor"]],
      body: fixosData,
      theme: "striped",
      headStyles: { fillColor: [245, 158, 11], fontSize: 9, fontStyle: "bold" },
      bodyStyles: { fontSize: 9 },
      columnStyles: { 4: { halign: "right" } },
      margin: { left: 14, right: 14 },
    });

    // @ts-ignore
    yPos = doc.lastAutoTable.finalY + 4;

    doc.setFontSize(11);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(0);
    const totalFixosText = `Total Fixos: ${formatCurrency(totais.fixos)}`;
    doc.text(totalFixosText, pageWidth - 14 - doc.getTextWidth(totalFixosText), yPos);
    yPos += 12;
  }

  // ─── Gastos do Mês (detalhado por dia) ───
  if (meusGastosDoMes.length > 0) {
    if (yPos > doc.internal.pageSize.height - 60) {
      doc.addPage();
      yPos = 20;
    }

    doc.setDrawColor(200);
    doc.line(14, yPos - 2, pageWidth - 14, yPos - 2);
    yPos += 4;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(16, 185, 129); // emerald
    doc.text(`Gastos do Mês (${meusGastosDoMes.length})`, 14, yPos);
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
        g.pago || g.tipo === "debito" ? "✓ Pago" : "Pendente",
        formatCurrency(valor),
      ];
    });

    autoTable(doc, {
      startY: yPos,
      head: [["Data", "Descrição", "Categ. Gasto", "Tipo Gasto", "Pagamento", "Status", "Valor"]],
      body: tableData,
      theme: "striped",
      headStyles: { fillColor: [16, 185, 129], fontSize: 8, fontStyle: "bold" },
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
        // Colorir status
        if (data.section === "body" && data.column.index === 5) {
          if (data.cell.raw === "✓ Pago") {
            data.cell.styles.textColor = [34, 197, 94];
            data.cell.styles.fontStyle = "bold";
          } else {
            data.cell.styles.textColor = [245, 158, 11];
          }
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

    doc.setDrawColor(200);
    doc.line(14, yPos - 2, pageWidth - 14, yPos - 2);
    yPos += 4;

    doc.setFontSize(14);
    doc.setFont("helvetica", "bold");
    doc.setTextColor(59, 130, 246); // blue
    doc.text("Resumo por Categoria", 14, yPos);
    yPos += 6;

    const catData = categoriasOrdenadas.map(([cat, val]) => [
      cat,
      formatCurrency(val),
      `${totalMes > 0 ? ((val / totalMes) * 100).toFixed(1) : 0}%`,
    ]);

    autoTable(doc, {
      startY: yPos,
      head: [["Categoria", "Total", "% do Total"]],
      body: catData,
      theme: "striped",
      headStyles: { fillColor: [59, 130, 246], fontSize: 9, fontStyle: "bold" },
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

  doc.setDrawColor(16, 185, 129);
  doc.setLineWidth(0.5);
  doc.line(14, yPos, pageWidth - 14, yPos);
  yPos += 8;

  doc.setFontSize(14);
  doc.setFont("helvetica", "bold");
  doc.setTextColor(0);
  doc.text(`Total Geral: ${formatCurrency(totalMes)}`, 14, yPos);
  yPos += 6;

  doc.setFontSize(10);
  doc.setFont("helvetica", "normal");
  doc.setTextColor(120);
  doc.text(`${meusGastosDoMes.length} ${meusGastosDoMes.length === 1 ? "lançamento" : "lançamentos"} + ${fixosAtivos.length} fixos`, 14, yPos);

  // ─── Rodapé ───
  const pageCount = doc.getNumberOfPages();
  for (let i = 1; i <= pageCount; i++) {
    doc.setPage(i);
    doc.setFontSize(8);
    doc.setFont("helvetica", "normal");
    doc.setTextColor(160);
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
