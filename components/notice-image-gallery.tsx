'use client';

import { useEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { AnnouncementImage } from '@/lib/announcements';
import { siteHref } from '@/lib/site-path';

export function NoticeImageGallery({
  images,
}: {
  images: AnnouncementImage[];
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const isMultiple = images.length > 1;

  useEffect(() => {
    if (activeIndex === null) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    dialogRef.current?.focus();

    const handleKeyDown = (event: KeyboardEvent) => {
      if (event.key === 'Escape') setActiveIndex(null);
      if (event.key === 'ArrowLeft' && isMultiple) {
        setActiveIndex((current) =>
          current === null
            ? null
            : (current - 1 + images.length) % images.length,
        );
      }
      if (event.key === 'ArrowRight' && isMultiple) {
        setActiveIndex((current) =>
          current === null ? null : (current + 1) % images.length,
        );
      }
    };

    window.addEventListener('keydown', handleKeyDown);
    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener('keydown', handleKeyDown);
    };
  }, [activeIndex, images.length, isMultiple]);

  const showPrevious = () =>
    setActiveIndex((current) =>
      current === null ? null : (current - 1 + images.length) % images.length,
    );
  const showNext = () =>
    setActiveIndex((current) =>
      current === null ? null : (current + 1) % images.length,
    );

  return (
    <>
      <div
        className={
          isMultiple
            ? 'notice-image-gallery notice-image-masonry'
            : 'notice-image-gallery'
        }
      >
        {images.map((image, index) => (
          <button
            className="notice-image-button"
            key={image.src}
            type="button"
            onClick={() => setActiveIndex(index)}
            aria-label={`Open image ${index + 1} of ${images.length}`}
          >
            <Image
              src={siteHref(image.src)}
              alt={image.alt}
              width={image.width}
              height={image.height}
              loading={index === 0 ? 'eager' : 'lazy'}
              unoptimized
            />
          </button>
        ))}
      </div>

      {activeIndex !== null && (
        <dialog
          ref={dialogRef}
          className="notice-lightbox"
          open
          aria-modal="true"
          aria-label={`Image ${activeIndex + 1} of ${images.length}`}
          tabIndex={-1}
        >
          <button
            className="notice-lightbox-close"
            type="button"
            onClick={() => setActiveIndex(null)}
            aria-label="Close image viewer"
          >
            <X aria-hidden="true" />
          </button>
          {isMultiple && (
            <button
              className="notice-lightbox-previous"
              type="button"
              onClick={showPrevious}
              aria-label="Previous image"
            >
              <ChevronLeft aria-hidden="true" />
            </button>
          )}
          <Image
            src={siteHref(images[activeIndex].src)}
            alt={images[activeIndex].alt}
            width={images[activeIndex].width}
            height={images[activeIndex].height}
            unoptimized
          />
          {isMultiple && (
            <>
              <button
                className="notice-lightbox-next"
                type="button"
                onClick={showNext}
                aria-label="Next image"
              >
                <ChevronRight aria-hidden="true" />
              </button>
              <span className="notice-lightbox-count">
                {activeIndex + 1} / {images.length}
              </span>
            </>
          )}
        </dialog>
      )}
    </>
  );
}
