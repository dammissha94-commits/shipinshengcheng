import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "吾家祠堂",
  description: "从自己的姓氏开始，建立一份属于家人的数字祠堂",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="zh-CN" className="h-full">
      <body className="min-h-full bg-[#F8F1E7] text-stone-900" suppressHydrationWarning>
        {children}
      </body>
    </html>
  );
}
