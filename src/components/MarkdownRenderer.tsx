import {
  useEffect,
  useMemo,
  useRef,
  useState,
  type ImgHTMLAttributes,
  type RefObject,
  type SyntheticEvent,
} from 'react';
import ReactMarkdown from 'react-markdown';
import remarkMath from 'remark-math';
import remarkGfm from 'remark-gfm';
import rehypeKatex from 'rehype-katex';
import { Box, Check, Copy, Download, ExternalLink, Film, Maximize2, Play } from 'lucide-react';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { cn } from '@/lib/utils';
import 'katex/dist/katex.min.css';

interface MarkdownRendererProps {
  children: string;
  className?: string;
}

interface MediaAttributes {
  id?: string;
  title?: string;
  url?: string;
  subtitle?: string;
  thumbnail?: string;
  height?: string;
  duration?: string;
  [key: string]: string | undefined;
}

type MediaPart =
  | { type: 'markdown'; content: string }
  | { type: 'sim'; attrs: MediaAttributes }
  | { type: 'video'; attrs: MediaAttributes };

interface TextRange {
  start: number;
  end: number;
}

const MEDIA_TAG_REGEX = /<(TenTenSim|TenTenVideo)\s+([^>]+?)\/>/g;
const ATTRIBUTE_REGEX = /([A-Za-z_:][\w:.-]*)\s*=\s*(?:"([^"]*)"|'([^']*)')/g;
const VIDEO_MUTED_SESSION_KEY = 'tenten-video-muted';

const decodeAttributeValue = (value: string) =>
  value.replace(/&(quot|apos|amp|lt|gt);/g, (match, entity) => {
    switch (entity) {
      case 'quot':
        return '"';
      case 'apos':
        return "'";
      case 'amp':
        return '&';
      case 'lt':
        return '<';
      case 'gt':
        return '>';
      default:
        return match;
    }
  });

const parseMediaAttributes = (source: string): MediaAttributes => {
  const attrs: MediaAttributes = {};
  ATTRIBUTE_REGEX.lastIndex = 0;

  let match: RegExpExecArray | null;
  while ((match = ATTRIBUTE_REGEX.exec(source)) !== null) {
    const [, name, doubleQuotedValue, singleQuotedValue] = match;
    attrs[name] = decodeAttributeValue(doubleQuotedValue ?? singleQuotedValue ?? '');
  }

  return attrs;
};

const isInsideRange = (index: number, ranges: TextRange[]) =>
  ranges.some((range) => index >= range.start && index < range.end);

const getMarkdownCodeRanges = (content: string): TextRange[] => {
  const ranges: TextRange[] = [];
  let offset = 0;
  let fenceStart: number | null = null;
  let fenceMarker = '';

  const lines = content.match(/[^\n]*(?:\n|$)/g) ?? [];

  for (const line of lines) {
    if (line === '') break;

    if (fenceStart !== null) {
      const closeMatch = line.match(/^ {0,3}(`{3,}|~{3,})/);
      if (
        closeMatch &&
        closeMatch[1][0] === fenceMarker[0] &&
        closeMatch[1].length >= fenceMarker.length
      ) {
        ranges.push({ start: fenceStart, end: offset + line.length });
        fenceStart = null;
        fenceMarker = '';
      }

      offset += line.length;
      continue;
    }

    const openMatch = line.match(/^ {0,3}(`{3,}|~{3,})/);
    if (openMatch) {
      fenceStart = offset;
      fenceMarker = openMatch[1];
    }

    offset += line.length;
  }

  if (fenceStart !== null) {
    ranges.push({ start: fenceStart, end: content.length });
  }

  for (let index = 0; index < content.length; index += 1) {
    if (content[index] !== '`' || isInsideRange(index, ranges)) continue;

    let runEnd = index + 1;
    while (content[runEnd] === '`') runEnd += 1;

    const marker = content.slice(index, runEnd);
    const closingIndex = content.indexOf(marker, runEnd);

    if (closingIndex !== -1 && !isInsideRange(closingIndex, ranges)) {
      ranges.push({ start: index, end: closingIndex + marker.length });
      index = closingIndex + marker.length - 1;
    }
  }

  return ranges.sort((a, b) => a.start - b.start);
};

const splitMediaParts = (content: string): MediaPart[] => {
  const parts: MediaPart[] = [];
  let lastIndex = 0;
  const protectedRanges = getMarkdownCodeRanges(content);

  MEDIA_TAG_REGEX.lastIndex = 0;
  let match: RegExpExecArray | null;

  while ((match = MEDIA_TAG_REGEX.exec(content)) !== null) {
    const [rawTag, tagName, attrSource] = match;
    const isProtected = isInsideRange(match.index, protectedRanges);
    const attrs = isProtected ? null : parseMediaAttributes(attrSource);

    if (isProtected || !attrs?.url) {
      continue;
    }

    if (match.index > lastIndex) {
      parts.push({
        type: 'markdown',
        content: content.slice(lastIndex, match.index),
      });
    }

    parts.push({
      type: tagName === 'TenTenSim' ? 'sim' : 'video',
      attrs,
    });

    lastIndex = match.index + rawTag.length;
  }

  if (lastIndex < content.length) {
    parts.push({
      type: 'markdown',
      content: content.slice(lastIndex),
    });
  }

  return parts.length > 0 ? parts : [{ type: 'markdown', content }];
};

const getFrameHeight = (height?: string) => {
  if (!height) return 'min(72dvh, 720px)';

  const numericHeight = Number(height);
  if (Number.isFinite(numericHeight)) {
    return `${Math.min(Math.max(numericHeight, 280), 900)}px`;
  }

  if (/^\d+(px|rem|vh|dvh|%)$/.test(height)) {
    return height;
  }

  return 'min(72dvh, 720px)';
};

const getStoredVideoMuted = () => {
  if (typeof window === 'undefined') return true;
  return window.sessionStorage.getItem(VIDEO_MUTED_SESSION_KEY) !== 'false';
};

const setStoredVideoMuted = (muted: boolean) => {
  if (typeof window === 'undefined') return;
  window.sessionStorage.setItem(VIDEO_MUTED_SESSION_KEY, String(muted));
};

const useManualVideoPlayback = () => {
  const [manualPlayback, setManualPlayback] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined') return;

    const reducedMotionQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const getSaveData = () =>
      Boolean((navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData);

    const updatePreference = () => {
      setManualPlayback(reducedMotionQuery.matches || getSaveData());
    };

    updatePreference();
    reducedMotionQuery.addEventListener('change', updatePreference);

    return () => reducedMotionQuery.removeEventListener('change', updatePreference);
  }, []);

  return manualPlayback;
};

const useHalfVisible = (ref: RefObject<HTMLElement>) => {
  const [isVisible, setIsVisible] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    if (typeof IntersectionObserver === 'undefined') {
      setIsVisible(true);
      return;
    }

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsVisible(entry.intersectionRatio >= 0.5);
      },
      { threshold: [0, 0.5, 1] }
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [ref]);

  return isVisible;
};

const getVideoMimeType = (url: string) => {
  const normalizedUrl = url.toLowerCase();
  if (normalizedUrl.includes('.m3u8')) return 'application/vnd.apple.mpegurl';
  if (normalizedUrl.includes('.mp4')) return 'video/mp4';
  if (normalizedUrl.includes('.webm')) return 'video/webm';
  if (normalizedUrl.includes('.ogg') || normalizedUrl.includes('.ogv')) return 'video/ogg';
  return undefined;
};

const matchesHost = (host: string, domain: string) =>
  host === domain || host.endsWith(`.${domain}`);

const getProviderEmbed = (url: string, muted: boolean, autoplay: boolean) => {
  try {
    const parsed = new URL(url);
    const host = parsed.hostname.replace(/^www\./, '');
    const autoplayValue = autoplay ? '1' : '0';
    const mutedValue = muted ? '1' : '0';

    if (host === 'youtu.be' || matchesHost(host, 'youtube.com') || matchesHost(host, 'youtube-nocookie.com')) {
      const id =
        host === 'youtu.be'
          ? parsed.pathname.split('/').filter(Boolean)[0]
          : parsed.searchParams.get('v') ||
            parsed.pathname.match(/\/(?:embed|shorts)\/([^/?#]+)/)?.[1];

      if (!id) return null;

      const params = new URLSearchParams({
        autoplay: autoplayValue,
        mute: mutedValue,
        enablejsapi: '1',
        playsinline: '1',
        controls: '1',
        loop: '1',
        playlist: id,
      });

      return {
        provider: 'youtube',
        src: `https://www.youtube.com/embed/${id}?${params.toString()}`,
      };
    }

    if (matchesHost(host, 'vimeo.com')) {
      const id = parsed.pathname.split('/').filter(Boolean).pop();
      if (!id) return null;

      const params = new URLSearchParams({
        autoplay: autoplayValue,
        muted: mutedValue,
        loop: '1',
        title: '0',
        byline: '0',
        portrait: '0',
      });

      return {
        provider: 'vimeo',
        src: `https://player.vimeo.com/video/${id}?${params.toString()}`,
      };
    }
  } catch {
    return null;
  }

  return null;
};

const sanitizeFileName = (value: string) =>
  value
    .trim()
    .replace(/[\\/:*?"<>|]+/g, '-')
    .replace(/\s+/g, '-')
    .replace(/-+/g, '-')
    .replace(/^-|-$/g, '')
    .slice(0, 90);

const getImageFileName = (src: string, fallback: string) => {
  try {
    const url = new URL(src);
    const fileName = decodeURIComponent(url.pathname.split('/').filter(Boolean).pop() ?? '');
    const sanitizedFileName = sanitizeFileName(fileName);
    if (sanitizedFileName) return sanitizedFileName;
  } catch {
    // Fall back to the alt text when the source is not a full URL.
  }

  return sanitizeFileName(fallback) || 'image';
};

const getExtensionForMimeType = (mimeType: string) => {
  if (mimeType.includes('jpeg')) return 'jpg';
  if (mimeType.includes('png')) return 'png';
  if (mimeType.includes('webp')) return 'webp';
  if (mimeType.includes('gif')) return 'gif';
  if (mimeType.includes('svg')) return 'svg';
  return '';
};

const ensureFileExtension = (fileName: string, mimeType: string) => {
  if (/\.[a-z0-9]{2,5}$/i.test(fileName)) return fileName;

  const extension = getExtensionForMimeType(mimeType);
  return extension ? `${fileName}.${extension}` : fileName;
};

const fetchImageBlob = async (src: string) => {
  const response = await fetch(src);
  if (!response.ok) {
    throw new Error(`Image request failed with ${response.status}`);
  }

  const blob = await response.blob();
  if (!blob.type.startsWith('image/')) {
    throw new Error('The downloaded asset is not an image.');
  }

  return blob;
};

const convertImageBlobToPng = async (blob: Blob) => {
  if (blob.type === 'image/png') return blob;
  if (typeof createImageBitmap === 'undefined') return blob;

  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement('canvas');
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext('2d')?.drawImage(bitmap, 0, 0);
  bitmap.close();

  const pngBlob = await new Promise<Blob>((resolve, reject) => {
    canvas.toBlob((nextBlob) => {
      if (nextBlob) {
        resolve(nextBlob);
      } else {
        reject(new Error('Could not prepare image for clipboard.'));
      }
    }, 'image/png');
  });

  return pngBlob;
};

const copyImageToClipboard = async (src: string) => {
  if (typeof window === 'undefined' || !navigator.clipboard) {
    throw new Error('Clipboard is not available.');
  }

  if ('ClipboardItem' in window && navigator.clipboard.write) {
    const sourceBlob = await fetchImageBlob(src);
    const clipboardBlob = await convertImageBlobToPng(sourceBlob);

    await navigator.clipboard.write([
      new ClipboardItem({
        [clipboardBlob.type || 'image/png']: clipboardBlob,
      }),
    ]);

    return 'image';
  }

  if (navigator.clipboard.writeText) {
    await navigator.clipboard.writeText(src);
    return 'url';
  }

  throw new Error('Clipboard writes are not supported.');
};

const downloadImage = async (src: string, fileName: string) => {
  const blob = await fetchImageBlob(src);
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');

  anchor.href = objectUrl;
  anchor.download = ensureFileExtension(fileName, blob.type);
  anchor.rel = 'noopener noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();

  window.setTimeout(() => URL.revokeObjectURL(objectUrl), 250);
};

const directDownloadImage = (src: string, fileName: string) => {
  const anchor = document.createElement('a');
  anchor.href = src;
  anchor.download = fileName;
  anchor.target = '_blank';
  anchor.rel = 'noopener noreferrer';
  document.body.appendChild(anchor);
  anchor.click();
  anchor.remove();
};

function MarkdownImage({
  src,
  alt = '',
  title,
  className,
  style,
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  const [open, setOpen] = useState(false);
  const [copied, setCopied] = useState(false);
  const [isCopying, setIsCopying] = useState(false);
  const [isDownloading, setIsDownloading] = useState(false);

  if (!src) return null;

  const label = alt || title || 'Image';
  const fileName = getImageFileName(src, label);

  const handleCopy = async () => {
    setIsCopying(true);
    try {
      const result = await copyImageToClipboard(src);
      setCopied(true);
      toast.success(result === 'image' ? 'Image copied' : 'Image link copied');
      window.setTimeout(() => setCopied(false), 1600);
    } catch {
      try {
        await navigator.clipboard.writeText(src);
        setCopied(true);
        toast.success('Image link copied');
        window.setTimeout(() => setCopied(false), 1600);
      } catch {
        toast.error('Could not copy this image');
      }
    } finally {
      setIsCopying(false);
    }
  };

  const handleDownload = async () => {
    setIsDownloading(true);
    try {
      await downloadImage(src, fileName);
      toast.success('Image download started');
    } catch {
      directDownloadImage(src, fileName);
      toast.message('Opening image download');
    } finally {
      setIsDownloading(false);
    }
  };

  const controls = (
    <span className="flex items-center gap-2">
      <Button
        type="button"
        size="icon"
        variant="secondary"
        disabled={isCopying}
        onClick={(event) => {
          event.stopPropagation();
          void handleCopy();
        }}
        className="h-10 w-10 rounded-full border border-white/14 bg-black/58 text-white shadow-lg backdrop-blur-md hover:bg-black/72 focus-visible:ring-white/70 sm:h-9 sm:w-9"
        aria-label="Copy image"
        title="Copy image"
      >
        {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
      </Button>

      <Button
        type="button"
        size="icon"
        variant="secondary"
        disabled={isDownloading}
        onClick={(event) => {
          event.stopPropagation();
          void handleDownload();
        }}
        className="h-10 w-10 rounded-full border border-white/14 bg-black/58 text-white shadow-lg backdrop-blur-md hover:bg-black/72 focus-visible:ring-white/70 sm:h-9 sm:w-9"
        aria-label="Download image"
        title="Download image"
      >
        <Download className="h-4 w-4" />
      </Button>
    </span>
  );

  return (
    <>
      <span className="not-prose group relative my-4 block w-full overflow-hidden rounded-[1.2rem] bg-black/20 shadow-[0_18px_48px_-32px_rgba(0,0,0,0.7)]">
        <button
          type="button"
          onClick={() => setOpen(true)}
          className="block w-full cursor-zoom-in overflow-hidden rounded-[1.2rem] text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background"
          aria-label={`Open ${label} fullscreen`}
        >
          <img
            {...props}
            src={src}
            alt={alt}
            title={title}
            loading="lazy"
            className={cn('h-auto max-h-[72dvh] w-full max-w-full object-contain', className)}
            style={{ maxWidth: '100%', height: 'auto', ...style }}
          />
          <span className="pointer-events-none absolute bottom-2 left-2 flex h-9 w-9 items-center justify-center rounded-full bg-black/50 text-white opacity-100 backdrop-blur-md sm:opacity-0 sm:transition-opacity sm:group-hover:opacity-100">
            <Maximize2 className="h-4 w-4" />
          </span>
        </button>

        <span className="absolute right-2 top-2 z-10">{controls}</span>
      </span>

      <Dialog open={open} onOpenChange={setOpen}>
        {open && (
          <DialogContent className="nebula-glass flex max-h-[96dvh] w-[96vw] max-w-7xl flex-col overflow-hidden border-0 p-3 sm:p-4">
            <DialogHeader className="pr-10">
              <DialogTitle className="truncate text-sm sm:text-base">{label}</DialogTitle>
            </DialogHeader>

            <div className="flex min-h-0 items-center justify-center overflow-auto rounded-[1.2rem] bg-black/55 p-2 sm:p-4">
              <img
                src={src}
                alt={alt}
                title={title}
                loading="eager"
                className="h-auto max-h-[78dvh] w-auto max-w-full object-contain"
              />
            </div>

            <DialogFooter className="flex-col-reverse gap-2 sm:flex-row sm:justify-end sm:space-x-0">
              <Button
                type="button"
                variant="outline"
                onClick={() => void handleCopy()}
                disabled={isCopying}
                className="rounded-full"
              >
                {copied ? <Check className="h-4 w-4" /> : <Copy className="h-4 w-4" />}
                Copy
              </Button>
              <Button
                type="button"
                onClick={() => void handleDownload()}
                disabled={isDownloading}
                className="nebula-primary-button rounded-full border-0 text-primary-foreground"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </>
  );
}

function MarkdownChunk({ children }: { children: string }) {
  if (!children.trim()) return null;

  return (
    <ReactMarkdown
      remarkPlugins={[remarkMath, remarkGfm]}
      rehypePlugins={[rehypeKatex]}
      components={{
        code: ({ className, children, node, ...props }) => {
          const match = /language-(\w+)/.exec(className || '');
          const isInline = !match;

          if (isInline) {
            return (
              <code
                className="rounded-md bg-white/8 px-1.5 py-0.5 text-[0.92em] font-mono text-primary"
                {...props}
              >
                {children}
              </code>
            );
          }

          return (
            <pre className="nebula-well overflow-x-auto rounded-[1.25rem] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.04)]">
              <code className={className} {...props}>
                {children}
              </code>
            </pre>
          );
        },
        a: ({ href, children, node, ...props }) => (
          <a
            href={href}
            target="_blank"
            rel="noopener noreferrer"
            className="text-primary hover:text-primary-glow underline decoration-primary/40 underline-offset-4 transition-colors"
            {...props}
          >
            {children}
          </a>
        ),
        img: ({ src, alt, title, node, className: imageClassName, style, ...props }) => (
          <MarkdownImage
            {...props}
            src={src}
            alt={alt || ''}
            title={title}
            className={imageClassName}
            style={style}
          />
        ),
        h1: ({ children, node, ...props }) => (
          <h1 className="mb-4 text-2xl font-semibold text-foreground" {...props}>
            {children}
          </h1>
        ),
        h2: ({ children, node, ...props }) => (
          <h2 className="mb-3 text-xl font-semibold text-foreground" {...props}>
            {children}
          </h2>
        ),
        h3: ({ children, node, ...props }) => (
          <h3 className="mb-2 text-lg font-medium text-foreground" {...props}>
            {children}
          </h3>
        ),
        ul: ({ children, node, ...props }) => (
          <ul className="mb-4 list-disc space-y-2 pl-5" {...props}>
            {children}
          </ul>
        ),
        ol: ({ children, node, ...props }) => (
          <ol className="mb-4 list-decimal space-y-2 pl-5" {...props}>
            {children}
          </ol>
        ),
        p: ({ children, node, ...props }) => (
          <p className="mb-4 text-[0.84rem] leading-[1.45] sm:text-[0.96rem] sm:leading-7" {...props}>
            {children}
          </p>
        ),
        blockquote: ({ children, node, ...props }) => (
          <blockquote
            className="nebula-well rounded-[1.1rem] border-l-0 px-4 py-3 italic text-muted-foreground"
            {...props}
          >
            {children}
          </blockquote>
        ),
      }}
    >
      {children}
    </ReactMarkdown>
  );
}

function MediaPlaceholder({
  icon,
  className,
}: {
  icon: 'sim' | 'video';
  className?: string;
}) {
  const Icon = icon === 'sim' ? Box : Film;

  return (
    <div className={cn("flex items-center justify-center bg-white/6 text-muted-foreground", className)}>
      <Icon className="h-8 w-8" />
    </div>
  );
}

function MediaThumbnail({
  src,
  alt,
  icon,
  className,
}: {
  src?: string;
  alt: string;
  icon: 'sim' | 'video';
  className?: string;
}) {
  const [hasError, setHasError] = useState(false);

  useEffect(() => {
    setHasError(false);
  }, [src]);

  const baseClassName = cn(
    "h-36 w-full rounded-[1.1rem] object-cover sm:h-28 sm:w-44",
    className
  );

  if (src && !hasError) {
    return (
      <img
        src={src}
        alt={alt}
        loading="lazy"
        onError={() => setHasError(true)}
        className={baseClassName}
      />
    );
  }

  return <MediaPlaceholder icon={icon} className={baseClassName} />;
}

function VideoPosterButton({
  thumbnail,
  title,
  onClick,
}: {
  thumbnail?: string;
  title: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="group relative flex aspect-video w-full items-center justify-center overflow-hidden bg-black/45 text-left"
      aria-label={`Play ${title}`}
    >
      <MediaThumbnail
        src={thumbnail}
        alt={title}
        icon="video"
        className="absolute inset-0 h-full w-full rounded-none opacity-80 transition-transform duration-300 group-hover:scale-[1.02] sm:h-full sm:w-full"
      />
      <span className="relative flex h-14 w-14 items-center justify-center rounded-full bg-black/60 text-white backdrop-blur-md transition-transform duration-200 group-hover:scale-105">
        <Play className="h-6 w-6 fill-current" />
      </span>
    </button>
  );
}

function SimulationCard({ attrs }: { attrs: MediaAttributes }) {
  const [open, setOpen] = useState(false);
  const url = attrs.url;
  if (!url) return null;

  const title = attrs.title || 'TenTen Simulator';
  const subtitle = attrs.subtitle;
  const frameHeight = getFrameHeight(attrs.height);

  return (
    <div className="not-prose my-5">
      <div className="group relative overflow-hidden rounded-[1.65rem] bg-gradient-to-br from-primary/35 via-white/10 to-primary-glow/25 p-px shadow-[0_24px_70px_-38px_hsl(var(--primary)/0.75)]">
        <div className="relative overflow-hidden rounded-[1.6rem] bg-card/88 p-3 backdrop-blur sm:p-4">
          <div className="grid gap-4 md:grid-cols-[minmax(0,1.15fr)_minmax(220px,0.85fr)] md:items-stretch">
            <button
              type="button"
              onClick={() => setOpen(true)}
              className="relative block aspect-[16/10] min-h-[190px] overflow-hidden rounded-[1.35rem] bg-black/35 text-left shadow-[inset_0_1px_0_rgba(255,255,255,0.08)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-primary focus-visible:ring-offset-2 focus-visible:ring-offset-background sm:min-h-[230px] md:min-h-[260px]"
              aria-label={`Open ${title}`}
            >
              <MediaThumbnail
                src={attrs.thumbnail}
                alt={title}
                icon="sim"
                className="h-full w-full rounded-[1.35rem] object-cover transition-transform duration-500 group-hover:scale-[1.025] sm:h-full sm:w-full"
              />
              <span className="absolute inset-x-0 bottom-0 h-24 bg-gradient-to-t from-black/70 to-transparent" />
              <span className="absolute bottom-3 left-3 flex items-center gap-2 rounded-full bg-black/55 px-3 py-2 text-xs font-semibold text-white shadow-lg backdrop-blur-md sm:text-sm">
                <Play className="h-4 w-4 fill-current" />
                Try it
              </span>
            </button>

            <div className="flex min-w-0 flex-col justify-between gap-4 px-1 pb-1 md:py-2">
              <div className="space-y-3">
                <h4 className="text-xl font-semibold leading-tight text-foreground sm:text-2xl">
                  {title}
                </h4>
                {subtitle && (
                  <p className="text-sm leading-6 text-muted-foreground sm:text-[0.95rem]">
                    {subtitle}
                  </p>
                )}
              </div>

              <Button
                type="button"
                onClick={() => setOpen(true)}
                className="nebula-primary-button h-12 w-full rounded-full border-0 text-base text-primary-foreground shadow-[0_18px_42px_-22px_hsl(var(--primary)/0.9)] sm:w-fit sm:px-6"
              >
                <Play className="h-4 w-4 fill-current" />
                Try it
              </Button>
            </div>
          </div>
        </div>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        {open && (
          <DialogContent className="nebula-glass max-h-[94dvh] w-[96vw] max-w-6xl overflow-hidden border-0 p-4 sm:p-6">
            <DialogHeader className="pr-8">
              <DialogTitle>{title}</DialogTitle>
              {subtitle && <DialogDescription>{subtitle}</DialogDescription>}
            </DialogHeader>

            <div
              className="overflow-hidden rounded-[1.25rem] bg-black/40 outline outline-1 outline-white/10"
              style={{ height: frameHeight, maxHeight: '72dvh' }}
            >
              <iframe
                src={url}
                title={title}
                sandbox="allow-scripts allow-same-origin"
                allow="fullscreen"
                loading="lazy"
                referrerPolicy="no-referrer"
                className="h-full w-full"
              />
            </div>

            <p className="text-xs leading-5 text-muted-foreground">
              If the simulator does not load here, open it in a new tab.
            </p>

            <DialogFooter>
              <Button asChild variant="outline" className="rounded-full">
                <a href={url} target="_blank" rel="noopener noreferrer">
                  <ExternalLink className="h-4 w-4" />
                  Open in new tab
                </a>
              </Button>
            </DialogFooter>
          </DialogContent>
        )}
      </Dialog>
    </div>
  );
}

function VideoCard({ attrs }: { attrs: MediaAttributes }) {
  const url = attrs.url ?? '';
  const thumbnail = attrs.thumbnail;
  const containerRef = useRef<HTMLDivElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const providerFrameRef = useRef<HTMLIFrameElement | null>(null);
  const isVisible = useHalfVisible(containerRef);
  const manualPlayback = useManualVideoPlayback();
  const [hasStarted, setHasStarted] = useState(false);
  const [userActivated, setUserActivated] = useState(false);
  const [muted, setMuted] = useState(getStoredVideoMuted);

  const title = attrs.title || 'TenTen Video';
  const shouldPlay = isVisible && (!manualPlayback || hasStarted);
  const effectiveMuted = userActivated ? muted : true;
  const providerEmbed = useMemo(() => (url ? getProviderEmbed(url, effectiveMuted, true) : null), [url, effectiveMuted]);
  const mimeType = getVideoMimeType(url);
  const showManualOverlay = manualPlayback && !hasStarted;
  const showProviderFrame = Boolean(providerEmbed && hasStarted);

  const handleStart = () => {
    setUserActivated(true);
    setMuted(false);
    setStoredVideoMuted(false);
    setHasStarted(true);
    window.setTimeout(() => {
      videoRef.current?.play().catch(() => undefined);
    }, 0);
  };

  const handleVideoTap = () => {
    if (userActivated) return;

    setUserActivated(true);
    setMuted(false);
    setStoredVideoMuted(false);

    if (videoRef.current) {
      videoRef.current.muted = false;
      videoRef.current.play().catch(() => undefined);
    }
  };

  const handleVolumeChange = (event: SyntheticEvent<HTMLVideoElement>) => {
    const nextMuted = event.currentTarget.muted || event.currentTarget.volume === 0;
    if (!nextMuted) {
      setUserActivated(true);
    }
    setMuted(nextMuted);
    setStoredVideoMuted(nextMuted);
  };

  useEffect(() => {
    if (providerEmbed && !manualPlayback && isVisible && !hasStarted) {
      setHasStarted(true);
    }
  }, [hasStarted, isVisible, manualPlayback, providerEmbed]);

  useEffect(() => {
    if (!providerEmbed || !hasStarted) return;

    const frameWindow = providerFrameRef.current?.contentWindow;
    if (!frameWindow) return;

    if (providerEmbed.provider === 'youtube') {
      frameWindow.postMessage(
        JSON.stringify({
          event: 'command',
          func: isVisible ? 'playVideo' : 'pauseVideo',
          args: [],
        }),
        '*'
      );
      return;
    }

    if (providerEmbed.provider === 'vimeo') {
      frameWindow.postMessage(
        JSON.stringify({
          method: isVisible ? 'play' : 'pause',
        }),
        '*'
      );
    }
  }, [hasStarted, isVisible, providerEmbed]);

  useEffect(() => {
    if (!url) return;
    if (providerEmbed) return;

    const video = videoRef.current;
    if (!video) return;

    if (shouldPlay) {
      video.play().catch(() => undefined);
    } else {
      video.pause();
    }
  }, [providerEmbed, shouldPlay, url]);

  if (!url) return null;

  return (
    <div ref={containerRef} className="not-prose my-4">
      <div className="nebula-panel overflow-hidden rounded-[1.5rem] p-4">
        <div className="relative overflow-hidden rounded-[1.2rem] bg-black/40">
          {showProviderFrame ? (
            <iframe
              ref={providerFrameRef}
              src={providerEmbed.src}
              title={title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              loading="lazy"
              referrerPolicy="no-referrer"
              className="aspect-video w-full"
              onLoad={() => {
                const frameWindow = providerFrameRef.current?.contentWindow;
                if (!frameWindow) return;

                if (providerEmbed.provider === 'youtube') {
                  frameWindow.postMessage(
                    JSON.stringify({
                      event: 'command',
                      func: isVisible ? 'playVideo' : 'pauseVideo',
                      args: [],
                    }),
                    '*'
                  );
                  return;
                }

                if (providerEmbed.provider === 'vimeo') {
                  frameWindow.postMessage(
                    JSON.stringify({
                      method: isVisible ? 'play' : 'pause',
                    }),
                    '*'
                  );
                }
              }}
            />
          ) : providerEmbed ? (
            <VideoPosterButton thumbnail={thumbnail} title={title} onClick={handleStart} />
          ) : showManualOverlay ? (
            <VideoPosterButton thumbnail={thumbnail} title={title} onClick={handleStart} />
          ) : (
            <>
              <video
                ref={videoRef}
                className="aspect-video w-full bg-black object-contain"
                poster={thumbnail}
                muted={effectiveMuted}
                autoPlay={!manualPlayback && isVisible}
                playsInline
                loop
                preload="metadata"
                controls
                onClick={handleVideoTap}
                onPlay={() => setHasStarted(true)}
                onVolumeChange={handleVolumeChange}
              >
                <source src={url} type={mimeType} />
                Your browser cannot play this video.
              </video>

              {!hasStarted && (
                <div className="pointer-events-none absolute inset-0">
                  <MediaThumbnail
                    src={thumbnail}
                    alt={title}
                    icon="video"
                    className="h-full w-full rounded-none opacity-80 sm:h-full sm:w-full"
                  />
                </div>
              )}
            </>
          )}
        </div>

        <div className="mt-3 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0">
            <div className="flex items-center gap-2">
              <Film className="h-4 w-4 text-muted-foreground" />
              <h4 className="truncate text-base font-semibold text-foreground">{title}</h4>
            </div>
          </div>

          <div className="flex shrink-0 items-center gap-2">
            {attrs.duration && (
              <span className="rounded-full bg-white/8 px-3 py-1 text-xs text-muted-foreground">
                {attrs.duration}
              </span>
            )}
            <Button asChild variant="outline" size="sm" className="rounded-full">
              <a href={url} target="_blank" rel="noopener noreferrer">
                <ExternalLink className="h-3.5 w-3.5" />
                Open
              </a>
            </Button>
          </div>
        </div>
      </div>
    </div>
  );
}

export function MarkdownRenderer({ children, className = "" }: MarkdownRendererProps) {
  const parts = useMemo(() => splitMediaParts(children), [children]);

  return (
    <div className={`prose prose-sm dark:prose-invert max-w-none prose-headings:tracking-tight prose-p:text-inherit prose-p:leading-7 prose-strong:text-foreground prose-code:text-foreground prose-pre:bg-transparent prose-p:text-[0.84rem] prose-li:text-[0.84rem] sm:prose-p:text-[0.96rem] sm:prose-li:text-[0.96rem] ${className}`}>
      {parts.map((part, index) => {
        if (part.type === 'markdown') {
          return <MarkdownChunk key={`markdown-${index}`}>{part.content}</MarkdownChunk>;
        }

        if (part.type === 'sim') {
          return <SimulationCard key={`sim-${part.attrs.id ?? index}`} attrs={part.attrs} />;
        }

        return <VideoCard key={`video-${part.attrs.id ?? index}`} attrs={part.attrs} />;
      })}
    </div>
  );
}
