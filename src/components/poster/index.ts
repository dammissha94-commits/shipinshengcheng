/**
 * 海报导出组件桶
 *
 * 用法：
 *   const ref = useRef<HTMLDivElement>(null);
 *   const { exportPoster, isExporting } = useExportPoster();
 *
 *   return (
 *     <>
 *       <button onClick={() => exportPoster(ref.current, '王氏家堂海报')}>导出</button>
 *       <StoryPoster ref={ref} {...props} />
 *     </>
 *   );
 *
 * 注：海报组件采用 fixed top:-99999 离屏渲染，肉眼不可见。
 */
export { default as PosterFrame } from './PosterFrame';
export { default as StoryPoster } from './StoryPoster';
export { default as TreePoster } from './TreePoster';
export { default as BirthdayPoster } from './BirthdayPoster';
export { default as AnniversaryPoster } from './AnniversaryPoster';
export { default as FestivalPoster } from './FestivalPoster';
export { useExportPoster } from './useExportPoster';
