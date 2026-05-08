/**
 * SkipToContent — 键盘用户的「跳到主内容」链接
 * 平时不可见；按 Tab 时自动出现于左上角，按 Enter 跳转
 *
 * 用法：放在 layout.tsx 的 <body> 第一个子元素
 *   配合 <main id="main"> 即可
 */
export default function SkipToContent({ targetId = 'main' }: { targetId?: string }) {
  return (
    <a href={`#${targetId}`} className="skip-to-content">
      跳到主内容
    </a>
  );
}
