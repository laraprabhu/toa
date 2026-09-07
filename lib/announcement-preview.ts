import type { Announcement } from '@/lib/announcements';

export const ANNOUNCEMENT_PREVIEW_WIDTH = 1200;
export const ANNOUNCEMENT_PREVIEW_HEIGHT = 800;

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
  canvas.width = ANNOUNCEMENT_PREVIEW_WIDTH;
  canvas.height = ANNOUNCEMENT_PREVIEW_HEIGHT;
  const context = canvas.getContext('2d');
  if (!context) throw new Error('This browser cannot generate announcement previews.');

  const background = context.createLinearGradient(0, 0, ANNOUNCEMENT_PREVIEW_WIDTH, ANNOUNCEMENT_PREVIEW_HEIGHT);
  background.addColorStop(0, '#102f3f');
  background.addColorStop(0.62, '#164853');
  background.addColorStop(1, '#0f5d66');
  context.fillStyle = background;
  context.fillRect(0, 0, ANNOUNCEMENT_PREVIEW_WIDTH, ANNOUNCEMENT_PREVIEW_HEIGHT);

  const glow = context.createRadialGradient(1140, 40, 20, 1140, 40, 540);
  glow.addColorStop(0, 'rgba(245, 190, 79, 0.22)');
  glow.addColorStop(1, 'rgba(245, 190, 79, 0)');
  context.fillStyle = glow;
  context.fillRect(600, 0, 600, ANNOUNCEMENT_PREVIEW_HEIGHT);

  context.save();
  context.strokeStyle = 'rgba(255,255,255,0.045)';
  context.lineWidth = 2;
  for (let offset = -ANNOUNCEMENT_PREVIEW_HEIGHT; offset < ANNOUNCEMENT_PREVIEW_WIDTH + ANNOUNCEMENT_PREVIEW_HEIGHT; offset += 76) {
    context.beginPath();
    context.moveTo(offset, 0);
    context.lineTo(offset - ANNOUNCEMENT_PREVIEW_HEIGHT, ANNOUNCEMENT_PREVIEW_HEIGHT);
    context.stroke();
  }
  context.strokeStyle = 'rgba(245,190,79,0.035)';
  for (let offset = 0; offset < ANNOUNCEMENT_PREVIEW_WIDTH + ANNOUNCEMENT_PREVIEW_HEIGHT; offset += 152) {
    context.beginPath();
    context.moveTo(offset, 0);
    context.lineTo(offset + ANNOUNCEMENT_PREVIEW_HEIGHT, ANNOUNCEMENT_PREVIEW_HEIGHT);
    context.stroke();
  }
  context.restore();

  context.textAlign = 'left';
  context.fillStyle = '#f7c65b';
  context.font = '700 48px Georgia, "Times New Roman", serif';
  context.textBaseline = 'alphabetic';
  context.fillText(`TOA Announcement #${announcement.number}`, 72, 128);

  context.font = '700 22px "Segoe UI", Arial, sans-serif';
  const category = categoryLabels[announcement.category];
  const categoryWidth = context.measureText(category).width + 56;
  const categoryX = ANNOUNCEMENT_PREVIEW_WIDTH - categoryWidth - 72;
  context.fillStyle = 'rgba(119, 232, 221, 0.17)';
  roundedRect(context, categoryX, 72, categoryWidth, 64, 32);
  context.fill();
  context.strokeStyle = 'rgba(172, 255, 247, 0.38)';
  context.lineWidth = 1.5;
  context.stroke();
  context.fillStyle = '#b9fff5';
  context.textAlign = 'center';
  context.fillText(category, categoryX + categoryWidth / 2, 114);

  context.textAlign = 'left';
  context.strokeStyle = 'rgba(255,255,255,0.14)';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(72, 180);
  context.lineTo(1128, 180);
  context.stroke();

  context.fillStyle = '#ffffff';
  context.font = '700 96px Georgia, "Times New Roman", serif';
  const titleLines = fitLines(context, announcement.title, 1056, 3);

  context.font = '400 40px "Segoe UI", Arial, sans-serif';
  const summaryLines = fitLines(context, announcement.summary, 1056, 3);
  const titleLineHeight = 104;
  const summaryLineHeight = 53;
  const contentHeight = titleLines.length * titleLineHeight + 32 + summaryLines.length * summaryLineHeight;
  const contentTop = 200 + Math.max(0, (548 - contentHeight) / 2);
  const titleStartY = contentTop + 82;

  context.fillStyle = '#ffffff';
  context.font = '700 96px Georgia, "Times New Roman", serif';
  titleLines.forEach((line, index) => context.fillText(line, 72, titleStartY + index * titleLineHeight));

  const summaryY = contentTop + titleLines.length * titleLineHeight + 66;
  context.fillStyle = 'rgba(255,255,255,0.82)';
  context.font = '400 40px "Segoe UI", Arial, sans-serif';
  summaryLines.forEach((line, index) => context.fillText(line, 72, summaryY + index * summaryLineHeight));

  const dataUrl = canvas.toDataURL('image/png');
  const encoded = dataUrl.split(',')[1];
  if (!encoded) throw new Error('The announcement preview could not be encoded.');
  return encoded;
}
