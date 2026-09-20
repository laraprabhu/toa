const urlPattern = /https?:\/\/[^\s<>]+/g;

function linkifyLine(line: string) {
  const parts: (string | React.ReactNode)[] = [];
  let previousEnd = 0;

  for (const match of line.matchAll(urlPattern)) {
    const start = match.index;
    const rawUrl = match[0];
    const url = rawUrl.replace(/[.,;:!?)}\]]+$/, '');

    if (start > previousEnd) parts.push(line.slice(previousEnd, start));

    try {
      const parsed = new URL(url);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        throw new Error('Unsupported link protocol');
      }
      parts.push(
        <a key={start} href={url} target="_blank" rel="noopener noreferrer">
          {url}
        </a>,
      );
    } catch {
      parts.push(url);
    }

    if (rawUrl.length > url.length) parts.push(rawUrl.slice(url.length));
    previousEnd = start + rawUrl.length;
  }

  if (previousEnd < line.length) parts.push(line.slice(previousEnd));
  return parts;
}

function formatBody(value: string) {
  return value
    .trim()
    .split(/\n\s*\n+/)
    .map((paragraph) =>
      paragraph
        .split('\n')
        .map((line) => line.trim())
        .filter(Boolean),
    )
    .filter((paragraph) => paragraph.length > 0);
}

export function NoticeBody({ body }: { body: string }) {
  return (
    <div className="notice-body">
      {formatBody(body).map((paragraph, paragraphIndex) => (
        <p key={paragraphIndex}>
          {paragraph.map((line, lineIndex) => (
            <span className="block" key={lineIndex}>
              {linkifyLine(line)}
            </span>
          ))}
        </p>
      ))}
    </div>
  );
}
