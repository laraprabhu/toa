'use client';

import { useState } from 'react';
import { Check, Share2 } from 'lucide-react';

export function ShareButton({ title, summary }: { title: string; summary: string }) {
  const [copied, setCopied] = useState(false);

  async function share() {
    const url = window.location.href;
    const text = `*${title}*\n\n${summary}\n\nRead the complete update: ${url}`;

    if (navigator.share) {
      await navigator.share({ title, text, url }).catch(() => undefined);
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
