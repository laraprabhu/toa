import type { Announcement } from '@/lib/announcements';

const WIDTH = 1200;
const HEIGHT = 630;

const categoryLabels: Record<Announcement['category'], string> = {
  urgent: 'URGENT UPDATE',
  maintenance: 'MAINTENANCE',
  event: 'COMMUNITY EVENT',
  action: 'ACTION REQUIRED',
  community: 'COMMUNITY UPDATE',
};

function roundedRect(
  context: CanvasRenderingContext2D,
  x: number,
  y: number,
  width: number,
  height: number,
  radius: number,
) {
  context.beginPath();
  context.roundRect(x, y, width, height, radius);
}

function fitLines(
  context: CanvasRenderingContext2D,
  text: string,
  maxWidth: number,
  maxLines: number,
) {
  const words = text.trim().split(/\s+/);
  const lines: string[] = [];
  let line = '';

  for (const word of words) {
    const next = line ? `${line} ${word}` : word;
    if (context.measureText(next).width <= maxWidth) {
      line = next;
      continue;
    }
    if (line) lines.push(line);
    line = word;
    if (lines.length === maxLines) break;
  }
  if (line && lines.length < maxLines) lines.push(line);

  if (words.join(' ') !== lines.join(' ')) {
    let last = lines[maxLines - 1] ?? '';
    while (last && context.measureText(`${last}…`).width > maxWidth) {
      last = last.slice(0, -1).trimEnd();
    }
    lines[maxLines - 1] = `${last}…`;
  }
  return lines;
}

/** Generates the social-sharing PNG after the server assigns the permanent number. */
export function generateAnnouncementPreview(announcement: Announcement) {
  const canvas = document.createElement('canvas');
  canvas.width = WIDTH;
  canvas.height = HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser cannot generate announcement previews.');

  const background = context.createLinearGradient(0, 0, WIDTH, HEIGHT);
  background.addColorStop(0, '#102f3f');
  background.addColorStop(0.62, '#164853');
  background.addColorStop(1, '#0f5d66');
  context.fillStyle = background;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  const glow = context.createRadialGradient(1140, 40, 20, 1140, 40, 540);
  glow.addColorStop(0, 'rgba(245, 190, 79, 0.22)');
  glow.addColorStop(1, 'rgba(245, 190, 79, 0)');
  context.fillStyle = glow;
  context.fillRect(600, 0, 600, 580);

  context.save();
  context.strokeStyle = 'rgba(255,255,255,0.045)';
  context.lineWidth = 2;
  for (let offset = -HEIGHT; offset < WIDTH + HEIGHT; offset += 76) {
    context.beginPath();
    context.moveTo(offset, 0);
    context.lineTo(offset - HEIGHT, HEIGHT);
    context.stroke();
  }
  context.strokeStyle = 'rgba(245,190,79,0.035)';
  for (let offset = 0; offset < WIDTH + HEIGHT; offset += 152) {
    context.beginPath();
    context.moveTo(offset, 0);
    context.lineTo(offset + HEIGHT, HEIGHT);
    context.stroke();
  }
  context.restore();

  context.textAlign = 'left';
  context.fillStyle = '#ffffff';
  context.font = '700 36px Georgia, "Times New Roman", serif';
  context.textBaseline = 'alphabetic';
  context.fillText('TOA Noticeboard', 72, 104);

  context.font = '700 16px "Segoe UI", Arial, sans-serif';
  const numberLabel = `ANNOUNCEMENT  #${announcement.number}`;
  const numberWidth = context.measureText(numberLabel).width + 40;
  const numberX = WIDTH - numberWidth - 72;
  context.fillStyle = '#f5be4f';
  roundedRect(context, numberX, 65, numberWidth, 45, 23);
  context.fill();
  context.fillStyle = '#102f3f';
  context.textAlign = 'center';
  context.fillText(numberLabel, numberX + numberWidth / 2, 94);

  const category = categoryLabels[announcement.category];
  const categoryWidth = context.measureText(category).width + 38;
  const categoryX = numberX - categoryWidth - 12;
  context.fillStyle = 'rgba(255,255,255,0.13)';
  roundedRect(context, categoryX, 65, categoryWidth, 45, 23);
  context.fill();
  context.fillStyle = '#ffffff';
  context.fillText(category, categoryX + categoryWidth / 2, 94);

  context.textAlign = 'left';
  context.strokeStyle = 'rgba(255,255,255,0.14)';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(72, 148);
  context.lineTo(1128, 148);
  context.stroke();

  context.fillStyle = '#ffffff';
  context.font = '700 62px Georgia, "Times New Roman", serif';
  const titleLines = fitLines(context, announcement.title, 990, 3);

  context.font = '400 24px "Segoe UI", Arial, sans-serif';
  const summaryLines = fitLines(context, announcement.summary, 990, 2);
  const titleLineHeight = 72;
  const summaryLineHeight = 35;
  const titleStartY = 285;

  context.fillStyle = '#ffffff';
  context.font = '700 62px Georgia, "Times New Roman", serif';
  titleLines.forEach((line, index) => context.fillText(line, 72, titleStartY + index * titleLineHeight));

  const summaryY = 528 - (summaryLines.length - 1) * summaryLineHeight;
  context.fillStyle = 'rgba(255,255,255,0.78)';
  context.font = '400 24px "Segoe UI", Arial, sans-serif';
  summaryLines.forEach((line, index) => context.fillText(line, 72, summaryY + index * summaryLineHeight));

  const dataUrl = canvas.toDataURL('image/png');
  const encoded = dataUrl.split(',')[1];
  if (!encoded) throw new Error('The announcement preview could not be encoded.');
  return encoded;
}
