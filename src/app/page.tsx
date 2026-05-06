import Link from 'next/link';

export default function HomePage() {
  return (
    <main className="min-h-screen bg-[#F8F1E7] flex flex-col items-center justify-center px-4 py-6">
      <div className="w-full max-w-[430px]">
        <img
          src="/images/login-page.png"
          alt="吾家祠堂登录"
          className="w-full h-auto object-contain"
        />
      </div>
      <Link
        href="/login"
        className="mt-6 rounded-2xl bg-[#5D4037] px-8 py-3.5 text-base font-semibold text-white shadow-md hover:bg-[#4E342E] transition-colors"
      >
        进入登录
      </Link>
    </main>
  );
}
