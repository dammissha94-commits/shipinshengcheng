/* Adapted from pure-genealogy under MIT License (https://github.com/yunfengsa/pure-genealogy). */

'use client';

import { useCallback, useState } from 'react';
import { useReactFlow, getNodesBounds, getViewportForBounds } from '@xyflow/react';
import { toPng } from 'html-to-image';

interface UseExportGenealogyImageOptions {
  fileName: string;
  backgroundColor?: string;
}

interface UseExportGenealogyImageResult {
  exportImage: () => Promise<void>;
  isExporting: boolean;
  errorMessage: string | null;
  resetError: () => void;
}

export function useExportGenealogyImage({
  fileName,
  backgroundColor = '#F5F2EB',
}: UseExportGenealogyImageOptions): UseExportGenealogyImageResult {
  const reactFlow = useReactFlow();
  const [isExporting, setIsExporting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const resetError = useCallback(() => setErrorMessage(null), []);

  const exportImage = useCallback(async () => {
    if (typeof window === 'undefined') return;
    setIsExporting(true);
    setErrorMessage(null);

    try {
      const viewport = document.querySelector('.react-flow__viewport') as HTMLElement | null;
      if (!viewport) {
        throw new Error('未找到关系图视图');
      }

      const nodes = reactFlow.getNodes();
      if (nodes.length === 0) {
        throw new Error('暂无可导出的关系图');
      }

      const bounds = getNodesBounds(nodes);
      const padding = 80;
      const imageWidth = Math.max(bounds.width + padding * 2, 480);
      const imageHeight = Math.max(bounds.height + padding * 2, 360);
      const transform = getViewportForBounds(bounds, imageWidth, imageHeight, 0.2, 2, 0.2);

      const dataUrl = await toPng(viewport, {
        width: imageWidth,
        height: imageHeight,
        backgroundColor,
        pixelRatio: 2,
        cacheBust: true,
        style: {
          width: `${imageWidth}px`,
          height: `${imageHeight}px`,
          transform: `translate(${transform.x}px, ${transform.y}px) scale(${transform.zoom})`,
        },
      });

      const link = document.createElement('a');
      link.href = dataUrl;
      link.download = fileName.endsWith('.png') ? fileName : `${fileName}.png`;
      document.body.appendChild(link);
      link.click();
      link.remove();
    } catch (error) {
      setErrorMessage(error instanceof Error ? error.message : '导出关系图失败');
    } finally {
      setIsExporting(false);
    }
  }, [backgroundColor, fileName, reactFlow]);

  return { exportImage, isExporting, errorMessage, resetError };
}
