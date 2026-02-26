import dynamic from "next/dynamic";

const HomeContent = dynamic(() => import("@/components/HomeContent"), {
  ssr: false,
  loading: () => (
    <div className="min-h-screen flex items-center justify-center">
      <div className="w-8 h-8 border-3 border-amber-400 border-t-transparent rounded-full animate-spin" />
    </div>
  ),
});

export default function Page() {
  return <HomeContent />;
}
