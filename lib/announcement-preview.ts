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

  context.fillStyle = '#f5be4f';
  roundedRect(context, 72, 58, 58, 58, 16);
  context.fill();
  context.fillStyle = '#102f3f';
  context.font = '700 24px Georgia, serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('TOA', 101, 88);

  context.textAlign = 'left';
  context.fillStyle = '#ffffff';
  context.font = '700 25px "Segoe UI", Arial, sans-serif';
  context.textBaseline = 'alphabetic';
  context.fillText('TOA NOTICEBOARD', 151, 96);

  context.font = '700 17px "Segoe UI", Arial, sans-serif';
  const numberLabel = `ANNOUNCEMENT  #${announcement.number}`;
  const numberWidth = context.measureText(numberLabel).width + 44;
  context.fillStyle = '#f5be4f';
  roundedRect(context, WIDTH - numberWidth - 72, 65, numberWidth, 45, 23);
  context.fill();
  context.fillStyle = '#102f3f';
  context.textAlign = 'center';
  context.fillText(numberLabel, WIDTH - 72 - numberWidth / 2, 94);

  context.textAlign = 'left';
  context.font = '700 18px "Segoe UI", Arial, sans-serif';
  const category = categoryLabels[announcement.category];
  const badgeWidth = context.measureText(category).width + 42;
  context.fillStyle = 'rgba(255,255,255,0.12)';
  roundedRect(context, 72, 163, badgeWidth, 42, 21);
  context.fill();
  context.fillStyle = '#f7cf79';
  context.fillText(category, 93, 191);

  context.strokeStyle = 'rgba(255,255,255,0.14)';
  context.lineWidth = 1;
  context.beginPath();
  context.moveTo(72, 231);
  context.lineTo(1128, 231);
  context.stroke();

  context.fillStyle = '#ffffff';
  context.font = '700 60px Georgia, "Times New Roman", serif';
  const titleLines = fitLines(context, announcement.title, 990, 3);
  titleLines.forEach((line, index) => context.fillText(line, 72, 301 + index * 70));

  const summaryY = 362 + (titleLines.length - 1) * 70;
  context.fillStyle = 'rgba(255,255,255,0.76)';
  context.font = '400 24px "Segoe UI", Arial, sans-serif';
  const summaryLines = fitLines(context, announcement.summary, 990, Math.max(1, Math.min(2, Math.floor((575 - summaryY) / 34))));
  summaryLines.forEach((line, index) => context.fillText(line, 72, summaryY + index * 34));

  const dataUrl = canvas.toDataURL('image/png');
  const encoded = dataUrl.split(',')[1];
  if (!encoded) throw new Error('The announcement preview could not be encoded.');
  return encoded;
}
