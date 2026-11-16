import PDFDocument from "pdfkit";
import type { Response } from "express";
import type { PaymentRow, ReceiptRow } from "@workspace/db";

export function sampleReceipt(res: Response, payment: PaymentRow, existing?: ReceiptRow) {
  const index = Number(payment.orderId.replace("ORD-", "")) - 1041;
  const transactionDate = existing?.transactionDate || (index === 5 || index === 6 ? new Date().toISOString().slice(0, 10) : payment.createdAt.toISOString().slice(0, 10));
  const ref = existing?.reference ?? `KWT${900101 + (Number.isInteger(index) && index >= 0 && index < 10 ? index : 100)}`;
  const doc = new PDFDocument({ size: "A4", margin: 60 });
  res.attachment(`demo-receipt-${payment.orderId.replace(/[^a-zA-Z0-9-]/g, "")}.pdf`).type("application/pdf");
  doc.pipe(res);
  doc.fontSize(12).fillColor("#F36B3F").text("VERIFY PAY / DEMONSTRATION DOCUMENT");
  doc.moveDown(2).fontSize(28).fillColor("#101B35").text("Sample Transfer Receipt");
  doc.moveDown().fontSize(12).fillColor("#536078").text("Illustrative data only. Not issued by a bank. Not evidence of a real payment.");
  doc.moveDown(2).fillColor("#101B35").fontSize(15);
  for (const [label, value] of [
    ["Amount", `${((existing?.amountFils ?? payment.amountFils) / 1000).toFixed(3)} KWD`],
    ["Transaction date", transactionDate], ["Transaction reference", ref || "Not available"],
    ["Sender", existing?.sender || payment.customerName], ["Receiver", existing?.receiver || "Bayt Studio"],
    ["Order ID", payment.orderId],
  ]) { doc.text(`${label}: ${value}`); doc.moveDown(0.8); }
  doc.moveDown(2).fontSize(11).fillColor("#7A8498").text("Upload this file in the demo workspace, review its extracted fields, then compare it with imported sample records. A record match does not independently confirm bank settlement.");
  doc.end();
}
