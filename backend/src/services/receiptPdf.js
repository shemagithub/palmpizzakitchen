import { PDFDocument, StandardFonts, rgb } from "pdf-lib";

function formatRwf(amount) {
  return `${Math.round(Number(amount) || 0).toLocaleString("en-RW")} RWF`;
}

function formatDate(value) {
  const d = value ? new Date(value) : new Date();
  if (Number.isNaN(d.getTime())) return String(value || "");
  return d.toLocaleString("en-RW", {
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function clip(text, max = 48) {
  const value = String(text || "").trim() || "-";
  return value.length > max ? `${value.slice(0, max - 1)}…` : value;
}

export async function buildOrderReceiptPdf(data) {
  const pdfDoc = await PDFDocument.create();
  const page = pdfDoc.addPage([595.28, 841.89]);
  const { width, height } = page.getSize();
  const font = await pdfDoc.embedFont(StandardFonts.Helvetica);
  const fontBold = await pdfDoc.embedFont(StandardFonts.HelveticaBold);

  const red = rgb(0.89, 0.094, 0.216);
  const ink = rgb(0.11, 0.098, 0.086);
  const muted = rgb(0.42, 0.388, 0.357);
  const sand = rgb(0.953, 0.922, 0.886);
  const cream = rgb(0.988, 0.973, 0.957);
  const white = rgb(1, 1, 1);
  const basil = rgb(0.145, 0.455, 0.271);

  page.drawRectangle({ x: 0, y: 0, width, height, color: cream });
  page.drawRectangle({ x: 0, y: 0, width: 10, height, color: red });
  page.drawRectangle({ x: 0, y: height - 126, width, height: 126, color: red });

  page.drawText(clip(data.businessName || "Palm Pizza Kitchen", 36), {
    x: 36,
    y: height - 48,
    size: 22,
    font: fontBold,
    color: white,
  });
  page.drawText("Official payment receipt", {
    x: 36,
    y: height - 72,
    size: 11,
    font,
    color: rgb(1, 0.9, 0.9),
  });
  page.drawText(clip(data.businessAddress || "Kigali, Rwanda", 52), {
    x: 36,
    y: height - 96,
    size: 9,
    font,
    color: rgb(1, 0.86, 0.86),
  });

  page.drawRectangle({
    x: width - 148,
    y: height - 88,
    width: 112,
    height: 42,
    color: white,
  });
  page.drawText("PAID", {
    x: width - 118,
    y: height - 64,
    size: 16,
    font: fontBold,
    color: basil,
  });
  page.drawText("XentriPay", {
    x: width - 124,
    y: height - 80,
    size: 8,
    font,
    color: muted,
  });

  let y = height - 160;
  const infoBoxTop = y + 12;
  page.drawRectangle({
    x: 28,
    y: y - 78,
    width: width - 56,
    height: 98,
    color: white,
  });
  page.drawRectangle({
    x: 28,
    y: infoBoxTop - 8,
    width: 4,
    height: 98,
    color: red,
  });

  const col = (label, value, x, startY) => {
    page.drawText(label, { x, y: startY, size: 8, font, color: muted });
    page.drawText(clip(value, 34), {
      x,
      y: startY - 16,
      size: 11,
      font: fontBold,
      color: ink,
    });
  };

  col("Receipt number", `RCP-${data.orderId}`, 44, y);
  col("Order ID", data.orderId, 230, y);
  col("Payment date", formatDate(data.paymentDate), 400, y);
  y -= 46;
  col("Payment method", data.paymentMethodLabel || data.paymentMethod || "-", 44, y);
  col("Transaction ref", data.transactionId || data.reference || "-", 230, y);
  col("Status", "Successful", 400, y);

  y -= 56;
  page.drawText("Billed to", { x: 36, y, size: 12, font: fontBold, color: ink });
  y -= 18;
  page.drawText(clip(data.customerName, 50), {
    x: 36,
    y,
    size: 11,
    font: fontBold,
    color: ink,
  });
  y -= 16;
  page.drawText(clip(data.customerEmail || "-", 60), {
    x: 36,
    y,
    size: 9,
    font,
    color: muted,
  });
  y -= 14;
  page.drawText(clip(data.customerPhone || "-", 40), {
    x: 36,
    y,
    size: 9,
    font,
    color: muted,
  });
  y -= 14;
  page.drawText(clip(`Deliver to: ${data.address || "-"}`, 82), {
    x: 36,
    y,
    size: 9,
    font,
    color: muted,
  });

  y -= 28;
  page.drawRectangle({
    x: 28,
    y: y - 8,
    width: width - 56,
    height: 26,
    color: sand,
  });
  page.drawText("Item", { x: 40, y, size: 10, font: fontBold, color: ink });
  page.drawText("Qty", { x: 330, y, size: 10, font: fontBold, color: ink });
  page.drawText("Amount", { x: 430, y, size: 10, font: fontBold, color: ink });
  y -= 28;

  const items = Array.isArray(data.items) ? data.items : [];
  for (const item of items) {
    if (y < 160) break;
    const lineTotal = Number(item.unitPrice || item.price || 0) * Number(item.quantity || 0);
    page.drawText(clip(item.name, 42), { x: 40, y, size: 10, font, color: ink });
    page.drawText(String(item.quantity), { x: 336, y, size: 10, font, color: ink });
    page.drawText(formatRwf(lineTotal), {
      x: 430,
      y,
      size: 10,
      font: fontBold,
      color: ink,
    });
    y -= 18;
  }

  y -= 10;
  page.drawRectangle({
    x: 300,
    y: y - 58,
    width: 267,
    height: 72,
    color: white,
  });
  page.drawText("Subtotal", { x: 316, y: y - 8, size: 9, font, color: muted });
  page.drawText(formatRwf(data.subtotal), {
    x: 430,
    y: y - 8,
    size: 9,
    font,
    color: ink,
  });
  page.drawText("Delivery", { x: 316, y: y - 26, size: 9, font, color: muted });
  page.drawText(formatRwf(data.deliveryFee), {
    x: 430,
    y: y - 26,
    size: 9,
    font,
    color: ink,
  });
  page.drawText("Total paid", {
    x: 316,
    y: y - 48,
    size: 12,
    font: fontBold,
    color: ink,
  });
  page.drawText(formatRwf(data.total), {
    x: 430,
    y: y - 48,
    size: 12,
    font: fontBold,
    color: red,
  });

  page.drawRectangle({ x: 0, y: 0, width, height: 72, color: ink });
  page.drawText("Thank you for ordering from Palm Pizza Kitchen.", {
    x: 36,
    y: 42,
    size: 10,
    font: fontBold,
    color: white,
  });
  const contact = [
    data.businessPhone ? `Tel ${data.businessPhone}` : null,
    data.businessEmail ? data.businessEmail : null,
  ]
    .filter(Boolean)
    .join("  ·  ");
  page.drawText(contact || "Kigali, Rwanda", {
    x: 36,
    y: 24,
    size: 8,
    font,
    color: rgb(0.8, 0.76, 0.72),
  });

  const bytes = await pdfDoc.save();
  return Buffer.from(bytes);
}
