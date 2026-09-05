import React, { useState, useEffect, useRef, useCallback } from 'react';
import { ZoomIn, ZoomOut, Maximize2 } from 'lucide-react';
import * as pdfjsLib from 'pdfjs-dist';
import type { PDFDocumentProxy } from 'pdfjs-dist';
import workerUrl from 'pdfjs-dist/build/pdf.worker.min.mjs?url';

pdfjsLib.GlobalWorkerOptions.workerSrc = workerUrl;

const MIN_ZOOM = 1;
const MAX_ZOOM = 4;
/** Obergrenze für die Canvas-Breite — schützt iOS vor Out-of-Memory bei vielen Seiten */
const MAX_CANVAS_WIDTH = 2400;

interface Props {
  url: string;
  /** Wird gemeldet, wenn das PDF gar nicht gelesen werden kann (Fallback anzeigen) */
  onError?: () => void;
}

interface PageInfo {
  pageNumber: number;
  /** Breite/Höhe bei scale 1 (PDF-Punkte) */
  baseWidth: number;
  baseHeight: number;
}

/**
 * PDF-Anzeige über pdf.js statt <iframe>: WebKit rendert PDFs im iframe in
 * fester Größe und ignoriert CSS — dadurch war die Seite rechts und unten
 * abgeschnitten. Hier wird jede Seite auf ein Canvas gezeichnet, standardmäßig
 * auf die volle Breite eingepasst; Zoom per Buttons oder Pinch-Geste.
 */
export function PdfViewer({ url, onError }: Props) {
  const scrollRef = useRef<HTMLDivElement>(null);
  const canvasRefs = useRef<Map<number, HTMLCanvasElement>>(new Map());
  const renderTasks = useRef<Map<number, { cancel: () => void }>>(new Map());
  const pdfRef = useRef<PDFDocumentProxy | null>(null);
  // onError über eine Ref halten: als Dep würde die wechselnde Funktions-
  // identität des Parents das PDF bei jedem Re-Render neu laden.
  const onErrorRef = useRef(onError);
  useEffect(() => { onErrorRef.current = onError; }, [onError]);
  /** Zählt Render-Durchläufe, damit ein überholter Lauf nicht ins Canvas malt */
  const renderGeneration = useRef(0);

  const [pages, setPages] = useState<PageInfo[]>([]);
  const [fitScale, setFitScale] = useState(0);
  const [zoom, setZoom] = useState(1);
  const [loading, setLoading] = useState(true);
  const [failed, setFailed] = useState(false);

  // Verfügbare Breite ermitteln (inkl. Orientierungswechsel)
  const [viewportWidth, setViewportWidth] = useState(0);
  useEffect(() => {
    const measure = () => {
      const el = scrollRef.current;
      if (el) setViewportWidth(el.clientWidth);
    };
    measure();
    window.addEventListener('resize', measure);
    window.addEventListener('orientationchange', measure);
    return () => {
      window.removeEventListener('resize', measure);
      window.removeEventListener('orientationchange', measure);
    };
  }, []);

  // Dokument laden
  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    setFailed(false);
    setZoom(1);

    const task = pdfjsLib.getDocument({ url });
    task.promise
      .then(async pdf => {
        if (cancelled) return;
        pdfRef.current = pdf;
        const infos: PageInfo[] = [];
        for (let n = 1; n <= pdf.numPages; n++) {
          const page = await pdf.getPage(n);
          const vp = page.getViewport({ scale: 1 });
          infos.push({ pageNumber: n, baseWidth: vp.width, baseHeight: vp.height });
        }
        if (cancelled) return;
        setPages(infos);
        setLoading(false);
      })
      .catch(() => {
        if (cancelled) return;
        setFailed(true);
        setLoading(false);
        onErrorRef.current?.();
      });

    return () => {
      cancelled = true;
      renderTasks.current.forEach(t => t.cancel());
      renderTasks.current.clear();
      pdfRef.current = null;
      // destroy() am LoadingTask gibt auch das Dokument frei (pdf.js v6)
      void task.destroy();
    };
  }, [url]);

  // Einpass-Faktor: breiteste Seite füllt die Anzeige komplett aus
  useEffect(() => {
    if (!pages.length || !viewportWidth) return;
    const widest = Math.max(...pages.map(p => p.baseWidth));
    setFitScale(viewportWidth / widest);
  }, [pages, viewportWidth]);

  // Seiten zeichnen. Läuft entkoppelt vom Zoom-State: die CSS-Breite folgt dem
  // Zoom sofort (Browser skaliert das vorhandene Bitmap weich mit), das
  // scharfe Neuzeichnen kommt verzögert hinterher.
  const renderPages = useCallback((targetZoom: number) => {
    const pdf = pdfRef.current;
    if (!pdf || !fitScale) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const generation = ++renderGeneration.current;

    pages.forEach(info => {
      const canvas = canvasRefs.current.get(info.pageNumber);
      if (!canvas) return;

      const cssWidth = info.baseWidth * fitScale * targetZoom;
      const rawScale = fitScale * targetZoom * dpr;
      // Canvas-Breite deckeln, sonst reißt iOS bei großem Zoom den Speicher auf
      const scale = Math.min(rawScale, MAX_CANVAS_WIDTH / info.baseWidth);

      renderTasks.current.get(info.pageNumber)?.cancel();

      void pdf.getPage(info.pageNumber).then(page => {
        if (generation !== renderGeneration.current) return;
        const viewport = page.getViewport({ scale });
        const ctx = canvas.getContext('2d');
        if (!ctx) return;
        canvas.width = Math.floor(viewport.width);
        canvas.height = Math.floor(viewport.height);
        canvas.style.width = `${cssWidth}px`;
        canvas.style.height = `${info.baseHeight * fitScale * targetZoom}px`;

        const task = page.render({ canvasContext: ctx, viewport });
        renderTasks.current.set(info.pageNumber, task);
        task.promise
          .then(() => { renderTasks.current.delete(info.pageNumber); })
          .catch(() => { /* abgebrochen durch neueren Render — kein Fehlerfall */ });
      });
    });
  }, [pages, fitScale]);

  // Erstes Rendern, sobald Einpass-Faktor steht
  useEffect(() => {
    if (fitScale) renderPages(zoom);
    // zoom bewusst nicht in den Deps: Zoom-Änderungen laufen über den Effekt unten
  }, [fitScale, renderPages]); // eslint-disable-line react-hooks/exhaustive-deps

  // Nach dem Zoomen scharf nachzeichnen (entprellt)
  useEffect(() => {
    if (!fitScale) return;
    const t = setTimeout(() => renderPages(zoom), 180);
    return () => clearTimeout(t);
  }, [zoom, fitScale, renderPages]);

  // CSS-Breite sofort mitziehen, damit Zoomen ohne Verzögerung wirkt
  useEffect(() => {
    if (!fitScale) return;
    pages.forEach(info => {
      const canvas = canvasRefs.current.get(info.pageNumber);
      if (!canvas) return;
      canvas.style.width = `${info.baseWidth * fitScale * zoom}px`;
      canvas.style.height = `${info.baseHeight * fitScale * zoom}px`;
    });
  }, [zoom, fitScale, pages]);

  // Pinch-to-Zoom
  const pinch = useRef<{ startDist: number; startZoom: number } | null>(null);
  function touchDistance(t: React.TouchList) {
    const dx = t[0].clientX - t[1].clientX;
    const dy = t[0].clientY - t[1].clientY;
    return Math.hypot(dx, dy);
  }
  function handleTouchStart(e: React.TouchEvent) {
    if (e.touches.length === 2) {
      pinch.current = { startDist: touchDistance(e.touches), startZoom: zoom };
    }
  }
  function handleTouchMove(e: React.TouchEvent) {
    if (e.touches.length === 2 && pinch.current) {
      e.preventDefault();
      const ratio = touchDistance(e.touches) / pinch.current.startDist;
      setZoom(clamp(pinch.current.startZoom * ratio));
    }
  }
  function handleTouchEnd(e: React.TouchEvent) {
    if (e.touches.length < 2) pinch.current = null;
  }

  function clamp(z: number) {
    return Math.min(MAX_ZOOM, Math.max(MIN_ZOOM, z));
  }

  if (failed) return null;

  return (
    <div className="relative w-full h-full flex flex-col">
      <div
        ref={scrollRef}
        className="flex-1 overflow-auto overscroll-contain"
        style={{ touchAction: 'pan-x pan-y', WebkitOverflowScrolling: 'touch' }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
      >
        {loading && (
          <div className="flex items-center justify-center h-full">
            <div className="w-8 h-8 border-2 border-white/70 border-t-transparent rounded-full animate-spin" />
          </div>
        )}
        <div className="flex flex-col items-center gap-2 py-2 w-max min-w-full">
          {pages.map(info => (
            <canvas
              key={info.pageNumber}
              ref={el => {
                if (el) canvasRefs.current.set(info.pageNumber, el);
                else canvasRefs.current.delete(info.pageNumber);
              }}
              className="bg-white shadow-lg block"
            />
          ))}
        </div>
      </div>

      {/* Zoom-Steuerung */}
      {!loading && pages.length > 0 && (
        <div className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-1 bg-black/70 backdrop-blur rounded-full px-1.5 py-1">
          <button
            onClick={() => setZoom(z => clamp(z - 0.5))}
            disabled={zoom <= MIN_ZOOM}
            className="p-2.5 text-white/90 hover:text-white disabled:opacity-30 transition-colors"
            aria-label="Verkleinern"
          >
            <ZoomOut size={18} />
          </button>
          <button
            onClick={() => setZoom(1)}
            className="px-2 py-2.5 text-white/90 hover:text-white transition-colors flex items-center gap-1.5"
            aria-label="Ganze Seite"
          >
            <Maximize2 size={16} />
            <span className="text-xs font-medium tabular-nums">{Math.round(zoom * 100)}%</span>
          </button>
          <button
            onClick={() => setZoom(z => clamp(z + 0.5))}
            disabled={zoom >= MAX_ZOOM}
            className="p-2.5 text-white/90 hover:text-white disabled:opacity-30 transition-colors"
            aria-label="Vergrößern"
          >
            <ZoomIn size={18} />
          </button>
        </div>
      )}
    </div>
  );
}
