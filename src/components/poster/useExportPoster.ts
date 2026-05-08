'use client';

import { useCallback, useState } from 'react';
import { toPng } from 'html-to-image';

interface UseExportPosterResult {
  exportPoster: (node: HTMLElement | null, fileName: string) => Promise<void>;
  isExporting: boolean;
  error: string | null;
  successMessage: string | null;
  reset: () => void;
}

/**
 * useExportPoster — 把任意 DOM 节点渲染为 9:16 PNG 海报
 *
 * 特征：
 * - pixelRatio=2 保证清晰度
 * - cacheBust=true 避免缓存
 * - 失败时给出可读错误
 */
export function useExportPoster(): UseExportPosterResult {
  const [isExporting, setIsExporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  const reset = useCallback(() => {
    setError(null);
    setSuccessMessage(null);
  }, []);

  const exportPoster = useCallback(async (node: HTMLElement | null, fileName: string) => {
    if (typeof window === 'undefined') return;
    if (!node) {
      setError('海报内容尚未准备好');
      return;
    }
    setIsExporting(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const dataUrl = await toPng(node, {
        pixelRatio: 2,
        cacheBust: true,
        backgroundColor: '#F5EBD7',
        // skip element for cross-origin imagery (none expected, but safe)
        filter: (n) => {
          const el = n as HTMLElement;
          return !(el.dataset && el.dataset.posterSkip === 'true');
        },
      });

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName.endsWith('.png') ? fileName : `${fileName}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
      setSuccessMessage('海报已下载');
    } catch (e) {
      setError(e instanceof Error && e.message ? e.message : '生成海报失败');
    } finally {
      setIsExporting(false);
    }
  }, []);

  return { exportPoster, isExporting, error, successMessage, reset };
}
