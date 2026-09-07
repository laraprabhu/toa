'use client';

import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';

export function ShareButton({ number, title, summary }: { number: number; title: string; summary: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const shareUrl = new URL(window.location.href);
    shareUrl.search = '';
    shareUrl.hash = '';
    shareUrl.searchParams.set('v', String(number));
    const url = shareUrl.href;
    const shareTitle = `Announcement #${number}: ${title}`;
    const text = `*${shareTitle}*\n\n${summary}\n\nRead the complete update: ${url}`;

    if (navigator.share) {
      await navigator.share({ title: shareTitle, text, url }).catch(() => undefined);
      return;
    }

    await navigator.clipboard.writeText(text);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button className="share-button" type="button" onClick={share}>
      {copied ? <Check size={17} aria-hidden="true" /> : <Share2 size={17} aria-hidden="true" />}
      {copied ? 'Copied for WhatsApp' : 'Share update'}
    </button>
  );
}
