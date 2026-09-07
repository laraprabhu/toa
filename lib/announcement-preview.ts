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
  background.addColorStop(0.58, '#164d57');
  background.addColorStop(1, '#11606a');
  context.fillStyle = background;
  context.fillRect(0, 0, WIDTH, HEIGHT);

  const glow = context.createRadialGradient(1040, 60, 20, 1040, 60, 470);
  glow.addColorStop(0, 'rgba(245, 190, 79, 0.34)');
  glow.addColorStop(1, 'rgba(245, 190, 79, 0)');
  context.fillStyle = glow;
  context.fillRect(570, 0, 630, 530);

  context.strokeStyle = 'rgba(255, 255, 255, 0.055)';
  context.lineWidth = 1;
  for (let x = 0; x <= WIDTH; x += 60) {
    context.beginPath();
    context.moveTo(x, 0);
    context.lineTo(x, HEIGHT);
    context.stroke();
  }
  for (let y = 0; y <= HEIGHT; y += 60) {
    context.beginPath();
    context.moveTo(0, y);
    context.lineTo(WIDTH, y);
    context.stroke();
  }

  context.fillStyle = '#f5be4f';
  roundedRect(context, 72, 62, 70, 70, 19);
  context.fill();
  context.fillStyle = '#102f3f';
  context.font = '700 30px Georgia, serif';
  context.textAlign = 'center';
  context.textBaseline = 'middle';
  context.fillText('TOA', 107, 98);

  context.textAlign = 'left';
  context.fillStyle = '#ffffff';
  context.font = '700 27px "Segoe UI", Arial, sans-serif';
  context.fillText('TOA NOTICEBOARD', 162, 87);
  context.fillStyle = 'rgba(255,255,255,0.7)';
  context.font = '500 19px "Segoe UI", Arial, sans-serif';
  context.fillText('Official resident communication', 162, 119);

  context.font = '700 18px "Segoe UI", Arial, sans-serif';
  const category = categoryLabels[announcement.category];
  const badgeWidth = context.measureText(category).width + 42;
  context.fillStyle = 'rgba(255,255,255,0.12)';
  roundedRect(context, 72, 186, badgeWidth, 43, 22);
  context.fill();
  context.fillStyle = '#f7cf79';
  context.textBaseline = 'alphabetic';
  context.fillText(category, 93, 215);

  context.fillStyle = '#ffffff';
  context.font = '700 58px Georgia, "Times New Roman", serif';
  const titleLines = fitLines(context, announcement.title, 870, 3);
  titleLines.forEach((line, index) => context.fillText(line, 72, 300 + index * 68));

  const summaryY = 318 + titleLines.length * 68;
  context.fillStyle = 'rgba(255,255,255,0.78)';
  context.font = '400 24px "Segoe UI", Arial, sans-serif';
  const summaryLines = fitLines(context, announcement.summary, 880, Math.max(1, Math.min(2, Math.floor((536 - summaryY) / 32))));
  summaryLines.forEach((line, index) => context.fillText(line, 72, summaryY + index * 32));

  context.fillStyle = '#f5be4f';
  context.beginPath();
  context.arc(1050, 315, 104, 0, Math.PI * 2);
  context.fill();
  context.fillStyle = '#102f3f';
  context.textAlign = 'center';
  context.font = '700 18px "Segoe UI", Arial, sans-serif';
  context.fillText('ANNOUNCEMENT', 1050, 292);
  context.font = '700 72px Georgia, serif';
  context.fillText(`#${announcement.number}`, 1050, 365);

  context.fillStyle = 'rgba(4, 27, 36, 0.42)';
  context.fillRect(0, 565, WIDTH, 65);
  context.textAlign = 'left';
  context.fillStyle = 'rgba(255,255,255,0.72)';
  context.font = '600 18px "Segoe UI", Arial, sans-serif';
  context.fillText('READ THE COMPLETE UPDATE ON TOA NOTICEBOARD', 72, 604);
  context.textAlign = 'right';
  context.fillStyle = '#f7cf79';
  context.fillText('Residents first · Clear and timely', 1128, 604);

  const dataUrl = canvas.toDataURL('image/png');
  const encoded = dataUrl.split(',')[1];
  if (!encoded) throw new Error('The announcement preview could not be encoded.');
  return encoded;
}
