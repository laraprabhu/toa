'use client';

import { useState } from 'react';
import { Check, Copy } from 'lucide-react';

export function ShareButton() {
  const [copied, setCopied] = useState(false);

  async function copyLink() {
    const shareUrl = new URL(window.location.href);
    shareUrl.search = '';
    shareUrl.hash = '';
    shareUrl.pathname = shareUrl.pathname.replace(/\/$/, '');
    await navigator.clipboard.writeText(shareUrl.href);
    setCopied(true);
    window.setTimeout(() => setCopied(false), 1800);
  }

  return (
    <button className="share-button" type="button" onClick={copyLink}>
      {copied ? (
        <Check size={17} aria-hidden="true" />
      ) : (
        <Copy size={17} aria-hidden="true" />
      )}
      {copied ? 'Copied' : 'Share update'}
    </button>
  );
}
