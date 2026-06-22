import { jsPDF } from "jspdf";
import html2canvas from "html2canvas";

export async function downloadPdf(entry, element) {
  const ruler = document.createElement("div");
  ruler.style.height = "210mm";
  ruler.style.position = "absolute";
  ruler.style.left = "-9999px";
  ruler.style.top = "0";
  ruler.style.pointerEvents = "none";
  element.appendChild(ruler);
  const mmPx = ruler.offsetHeight;
  element.removeChild(ruler);

  const scale = 2;

  const canvas = await html2canvas(element, {
    scale,
    useCORS: true,
    backgroundColor: null,
  });

  const sliceHeight = Math.round(mmPx * scale);
  const numPages = Math.ceil(canvas.height / sliceHeight);
  const r = 16;

  const doc = new jsPDF({
    unit: "pt",
    format: [canvas.width, Math.min(sliceHeight, canvas.height)],
  });

  for (let i = 0; i < numPages; i++) {
    const y = i * sliceHeight;
    const h = Math.min(sliceHeight, canvas.height - y);

    if (i > 0) doc.addPage([canvas.width, h]);

    const sliceCanvas = document.createElement("canvas");
    sliceCanvas.width = canvas.width;
    sliceCanvas.height = h;
    const ctx = sliceCanvas.getContext("2d");
    ctx.fillStyle = "#ffffff";
    ctx.fillRect(0, 0, canvas.width, h);
    ctx.beginPath();
    ctx.roundRect(0, 0, canvas.width, h, r);
    ctx.clip();
    ctx.drawImage(canvas, 0, y, canvas.width, h, 0, 0, canvas.width, h);

    doc.addImage(sliceCanvas.toDataURL("image/jpeg", 0.95), "JPEG", 0, 0, canvas.width, h);
  }

  const slug = (entry.title || new Date(entry.date).toISOString().split("T")[0])
    .replace(/[^a-zA-Z0-9 ]/g, "").trim().slice(0, 60);
  doc.save(`Reflecta - ${slug}.pdf`);
}
