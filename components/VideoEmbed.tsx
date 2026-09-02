'use client';

// Kohler's article videos are YouTube embeds, not files we can host, so the
// choice is not "iframe or video tag" — it is *when* the iframe appears.
//
// A raw <iframe src="youtube.com/…"> costs the reader roughly half a megabyte
// of player and a set of Google cookies before they have decided they want to
// watch anything, on every page that carries one. This is a static export with
// no consent banner and no server to put one behind, so the honest default is
// to ship no third-party request at all until the reader asks for one.
//
// So: a local poster and a real <button>. The first click is what creates the
// iframe, and only then does anything leave our origin. Verified by counting
// requests to a non-local host before and after the click — see
// scratchpad/task-a3.md §3.
//
// Three details that are easy to get wrong and are deliberate here:
//
//   • The poster is OUR file, not i.ytimg.com. Using YouTube's thumbnail URL
//     would still be a third-party request on first paint, which is the whole
//     thing we are avoiding. scripts/build-editorial.mjs downloads it.
//   • It is a <button>, not a div with onClick, so Tab reaches it, Enter and
//     Space fire it, and it has an accessible name — the video's own title,
//     which matters on the article that carries two of them.
//   • `youtube-nocookie.com`, and `autoplay=1` only on the post-click src.
//     Autoplay is correct here precisely because the reader just clicked; it is
//     not an unprompted moving image, so it does not conflict with
//     prefers-reduced-motion.

import { useState } from 'react';
import { useLang } from './LangProvider';
import type { PostVideo } from '@/lib/posts';

type Props = {
  video: PostVideo;
  className?: string;
  /** rendered width at 1440 — picks a rendition without upscaling */
  slot?: number;
};

export default function VideoEmbed({ video, className = '', slot = 894 }: Props) {
  const { t } = useLang();
  const [playing, setPlaying] = useState(false);
  const poster = video.poster;

  // A dead id never reaches here — the build script drops videos whose oEmbed
  // and poster both 404 — but a poster can be missing without the video being
  // dead, and a play button over an empty box is worse than no button.
  if (!poster) return null;

  const label = video.title || t.video.play;

  return (
    <div
      className={`relative overflow-hidden border border-line-6 bg-ink ${className}`}
      style={{ aspectRatio: '16 / 9' }}
    >
      {playing ? (
        <iframe
          // Created on click, never on mount. This element existing at all is
          // the first and only third-party request the page makes.
          src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1`}
          title={label}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className="absolute inset-0 h-full w-full"
        />
      ) : (
        <button
          type="button"
          onClick={() => setPlaying(true)}
          className="focus-inset group absolute inset-0 block h-full w-full cursor-pointer"
        >
          {/* eslint-disable-next-line @next/next/no-img-element -- static export, poster is a local file */}
          <img
            src={poster.width > slot * 1.5 ? poster.src : poster.srcSmall}
            alt=""
            width={poster.width}
            height={poster.height}
            loading="lazy"
            decoding="async"
            className="h-full w-full object-cover transition-transform duration-700 ease-out group-hover:scale-[1.03]"
          />

          {/* The button's accessible name. Visually hidden because the poster
              already carries the video's own title frame; a screen reader has
              nothing to go on without it. */}
          <span className="sr-only">{`${t.video.play}: ${label}`}</span>

          {/* Play mark. A ring plus a triangle rather than a brand glyph — this
              is our button, not YouTube's, and it should not pretend to be
              theirs before it has loaded anything of theirs. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-0 flex items-center justify-center"
          >
            <span className="flex h-[72px] w-[72px] items-center justify-center rounded-full border border-white/70 bg-black/35 backdrop-blur-[2px] transition-colors duration-300 group-hover:bg-black/55">
              <svg width="20" height="24" viewBox="0 0 20 24" fill="none" aria-hidden>
                <path d="M0 0 L20 12 L0 24 Z" fill="#ffffff" />
              </svg>
            </span>
          </span>

          {/* Says out loud that pressing this reaches YouTube. On a page that
              has deliberately not contacted them yet, that is information the
              reader is entitled to before they click, not after. */}
          <span
            aria-hidden
            className="pointer-events-none absolute inset-x-0 bottom-0 flex items-end justify-between gap-4 bg-gradient-to-t from-black/70 to-transparent p-5 text-left"
          >
            <span className="micro !text-white/80">{t.video.source}</span>
          </span>

          <span data-focus-ring />
        </button>
      )}
    </div>
  );
}
