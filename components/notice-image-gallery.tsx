'use client';

import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import Image from 'next/image';
import { ChevronLeft, ChevronRight, X } from 'lucide-react';
import type { AnnouncementImage } from '@/lib/announcements';
import { siteHref } from '@/lib/site-path';

export function NoticeImageGallery({
  images,
  resolveSrc = siteHref,
}: {
  images: AnnouncementImage[];
  resolveSrc?: (src: string) => string;
}) {
  const [activeIndex, setActiveIndex] = useState<number | null>(null);
  const [galleryWidth, setGalleryWidth] = useState(0);
  const dialogRef = useRef<HTMLDialogElement>(null);
  const galleryRef = useRef<HTMLDivElement>(null);
  const isMultiple = images.length > 1;

  useLayoutEffect(() => {
    if (!isMultiple || !galleryRef.current) return;
    const gallery = galleryRef.current;
    const measure = () => setGalleryWidth(gallery.clientWidth);
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(gallery);
    return () => observer.disconnect();
  }, [isMultiple]);

  // Keep the original DOM/lightbox order, but place each image under the
  // shortest column. CSS multi-column layout balances blocks differently and
  // can leave a large gap beside mixed portrait/landscape images.
  const useMasonry = isMultiple && galleryWidth >= 420;
  const gap = 16;
  const columnWidth = useMasonry ? (galleryWidth - gap) / 2 : 0;
  const columnHeights = [0, 0];
  const positions = images.map((image) => {
    if (!useMasonry) return null;
    const column = columnHeights[0] <= columnHeights[1] ? 0 : 1;
    const top = columnHeights[column];
    const ratio =
      image.width > 0 && image.height > 0
        ? image.height / image.width
        : 1;
    const height = Math.max(0, columnWidth - 2) * ratio + 2;
    columnHeights[column] += height + gap;
    return { left: column * (columnWidth + gap), top, width: columnWidth };
  });
  const masonryHeight = Math.max(0, ...columnHeights) - gap;

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
        ref={galleryRef}
        className={
          isMultiple
            ? `notice-image-gallery notice-image-masonry${useMasonry ? ' is-positioned' : ''}`
            : 'notice-image-gallery'
        }
        style={useMasonry ? { height: masonryHeight } : undefined}
      >
        {images.map((image, index) => (
          <button
            className="notice-image-button"
            key={image.src}
            type="button"
            style={positions[index] ?? undefined}
            onClick={() => setActiveIndex(index)}
            aria-label={`Open image ${index + 1} of ${images.length}`}
          >
            <Image
              src={resolveSrc(image.src)}
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
            src={resolveSrc(images[activeIndex].src)}
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
