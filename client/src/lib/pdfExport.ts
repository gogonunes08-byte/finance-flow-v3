import { toast } from "sonner";
import jsPDF from "jspdf";
import html2canvas from "html2canvas";

export async function exportDashboardToPDF() {
  const element = document.getElementById("dashboard-content");
  if (!element) {
    toast.error("Conteúdo do Dashboard não encontrado");
    return;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "portrait",
      unit: "mm",
      format: "a4",
    });

    const imgWidth = 210;
    const pageHeight = 297;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.setFontSize(16);
    pdf.text("Finance Flow Pro - Dashboard", 15, 15);
    pdf.setFontSize(10);
    pdf.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 15, 25);

    position = 35;

    pdf.addImage(imgData, "PNG", 5, position, imgWidth - 10, imgHeight);
    heightLeft -= pageHeight - 35;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 5, position, imgWidth - 10, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`Finance-Flow-Dashboard-${new Date().toISOString().split("T")[0]}.pdf`);
    toast.success("PDF do Dashboard exportado com sucesso!");
  } catch (error) {
    console.error("Erro ao exportar PDF:", error);
    toast.error("Erro ao exportar PDF. Tente novamente.");
  }
}

export async function exportReportsToPDF() {
  const element = document.getElementById("reports-content");
  if (!element) {
    toast.error("Conteúdo de Relatórios não encontrado");
    return;
  }

  try {
    const canvas = await html2canvas(element, {
      scale: 2,
      backgroundColor: "#ffffff",
      logging: false,
    });

    const imgData = canvas.toDataURL("image/png");
    const pdf = new jsPDF({
      orientation: "landscape",
      unit: "mm",
      format: "a4",
    });

    const imgWidth = 297;
    const pageHeight = 210;
    const imgHeight = (canvas.height * imgWidth) / canvas.width;
    let heightLeft = imgHeight;
    let position = 0;

    pdf.setFontSize(16);
    pdf.text("Finance Flow Pro - Relatórios", 15, 15);
    pdf.setFontSize(10);
    pdf.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 15, 25);

    position = 35;

    pdf.addImage(imgData, "PNG", 5, position, imgWidth - 10, imgHeight);
    heightLeft -= pageHeight - 35;

    while (heightLeft > 0) {
      position = heightLeft - imgHeight;
      pdf.addPage();
      pdf.addImage(imgData, "PNG", 5, position, imgWidth - 10, imgHeight);
      heightLeft -= pageHeight;
    }

    pdf.save(`Finance-Flow-Relatorios-${new Date().toISOString().split("T")[0]}.pdf`);
    toast.success("PDF de Relatórios exportado com sucesso!");
  } catch (error) {
    console.error("Erro ao exportar PDF:", error);
    toast.error("Erro ao exportar PDF. Tente novamente.");
  }
}

export function exportTransactionsToPDF(transactions: any[]) {
  const pdf = new jsPDF({
    orientation: "portrait",
    unit: "mm",
    format: "a4",
  });

  pdf.setFontSize(16);
  pdf.text("Finance Flow Pro - Transações", 15, 15);
  pdf.setFontSize(10);
  pdf.text(`Data: ${new Date().toLocaleDateString("pt-BR")}`, 15, 25);
  pdf.text(`Total de Transações: ${transactions.length}`, 15, 32);

  let yPosition = 40;
  const pageHeight = 297;
  const margin = 15;
  const lineHeight = 6;

  pdf.setFontSize(9);
  (pdf.setFont as any)(undefined, "bold");
  pdf.text("Data", margin, yPosition);
  pdf.text("Tipo", margin + 30, yPosition);
  pdf.text("Categoria", margin + 50, yPosition);
  pdf.text("Descrição", margin + 90, yPosition);
  pdf.text("Valor", margin + 160, yPosition);

  yPosition += lineHeight + 2;
  (pdf.setFont as any)(undefined, "normal");

  transactions.forEach((transaction) => {
    if (yPosition > pageHeight - margin) {
      pdf.addPage();
      yPosition = margin;
    }

    pdf.text(String(transaction.date || ""), margin, yPosition);
    pdf.text(transaction.type === "income" ? "Entrada" : "Saída", margin + 30, yPosition);
    pdf.text(String(transaction.category || ""), margin + 50, yPosition);
    pdf.text(String(transaction.description || ""), margin + 90, yPosition);
    pdf.text(`R$ ${transaction.amount.toFixed(2)}`, margin + 160, yPosition);

    yPosition += lineHeight;
  });

  pdf.save(`Finance-Flow-Transacoes-${new Date().toISOString().split("T")[0]}.pdf`);
}
