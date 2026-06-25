import { jsPDF } from "jspdf";

function renderEmoji(emoji) {
  const c = document.createElement("canvas");
  c.width = 64;
  c.height = 64;
  const ctx = c.getContext("2d");
  ctx.font = "48px serif";
  ctx.textAlign = "center";
  ctx.textBaseline = "middle";
  ctx.fillText(emoji, 32, 34);
  return c.toDataURL("image/png");
}

const MARGIN = 56;
const CARD_PAD = 8;
const CARD_TOP = 36;
const BOTTOM_LIMIT = 60;

function drawCard(doc, top, height) {
  doc.setFillColor(255, 255, 255);
  doc.setDrawColor(232, 229, 240);
  doc.roundedRect(MARGIN - CARD_PAD, top, doc.internal.pageSize.getWidth() - MARGIN * 2 + CARD_PAD * 2, height, 12, 12, "FD");
}

export function downloadPdf(entry) {
  const doc = new jsPDF({ unit: "pt", format: "a4" });
  const pageW = doc.internal.pageSize.getWidth();
  const pageH = doc.internal.pageSize.getHeight();
  const contentW = pageW - MARGIN * 2;
  const cardBodyTop = 72;
  const maxY = pageH - BOTTOM_LIMIT;

  let y = cardBodyTop;

  function needsPage(extra) {
    return y + extra > maxY;
  }

  function addPage() {
    doc.addPage();
    drawCard(doc, CARD_TOP, pageH - CARD_TOP - BOTTOM_LIMIT + CARD_PAD);
    y = cardBodyTop;
  }

  drawCard(doc, CARD_TOP, pageH - CARD_TOP - BOTTOM_LIMIT + CARD_PAD);

  // mood emoji
  if (entry.mood) {
    if (needsPage(32)) addPage();
    const moodImg = renderEmoji(entry.mood);
    doc.addImage(moodImg, "PNG", MARGIN, y - 4, 28, 28);
    y += 38;
  }

  // title
  doc.setFont("helvetica", "bold");
  doc.setFontSize(20);
  doc.setTextColor(26, 22, 37);
  const titleLines = doc.splitTextToSize(entry.title || "Untitled", contentW);
  const titleH = titleLines.length * 26;
  if (needsPage(titleH)) addPage();
  doc.text(titleLines, MARGIN, y);
  y += titleH;

  // date
  doc.setFont("helvetica", "normal");
  doc.setFontSize(10);
  doc.setTextColor(107, 96, 128);
  const dateStr = new Date(entry.date).toLocaleDateString("en-US", {
    weekday: "long", year: "numeric", month: "long", day: "numeric",
    hour: "numeric", minute: "2-digit",
  });
  if (needsPage(18)) addPage();
  doc.text(dateStr, MARGIN, y);
  y += 18;

  // divider
  if (needsPage(16)) addPage();
  doc.setDrawColor(232, 229, 240);
  doc.line(MARGIN, y, pageW - MARGIN, y);
  y += 16;

  // body
  doc.setFont("helvetica", "normal");
  doc.setFontSize(11);
  doc.setTextColor(50, 46, 62);

  if (entry.type === "todo" && entry.tasks?.length) {
    for (const task of entry.tasks) {
      const prefix = task.done ? "☑ " : "☐ ";
      const lines = doc.splitTextToSize(prefix + task.text, contentW);
      const h = lines.length * 15 + 4;
      if (needsPage(h)) addPage();
      doc.text(lines, MARGIN, y);
      y += h;
    }
  } else {
    const bodyLines = doc.splitTextToSize(entry.text || "", contentW);
    const lineH = 15;
    for (const line of bodyLines) {
      if (needsPage(lineH)) addPage();
      doc.text(line, MARGIN, y);
      y += lineH;
    }
  }

  // footer
  doc.setFont("helvetica", "normal");
  doc.setFontSize(8);
  doc.setTextColor(152, 144, 168);
  doc.text("Created with Reflecta", pageW - MARGIN, pageH - 52, { align: "right" });

  const slug = (entry.title || new Date(entry.date).toISOString().split("T")[0])
    .replace(/[^a-zA-Z0-9 ]/g, "").trim().slice(0, 60);
  doc.save(`Reflecta - ${slug}.pdf`);
}
