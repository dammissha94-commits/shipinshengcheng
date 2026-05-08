export default function PrintOutputLoading() {
  return (
    <main className="flex min-h-screen items-center justify-center bg-[#F5EBD7] px-4 text-center">
      <div className="w-full max-w-[760px] rounded-[22px] border border-[#E7D9C9] bg-white/86 p-6 shadow-[0_18px_42px_rgba(90,53,36,0.10)]">
        <p className="text-[13px] tracking-[0.18em] text-[#8A7465]">家堂档案</p>
        <h1 className="mt-2 font-serif text-[26px] font-bold text-[#2A1D16]">正在整理打印版</h1>
        <p className="mt-2 text-[13px] leading-6 text-[#78675B]">正在读取家人、关系、故事和家庭节点，请稍候。</p>
        <div className="mt-6 space-y-3">
          <div className="mx-auto h-3 w-2/3 animate-pulse rounded-full bg-[#EEE3D6]" />
          <div className="mx-auto h-3 w-1/2 animate-pulse rounded-full bg-[#EEE3D6]" />
        </div>
      </div>
    </main>
  );
}
