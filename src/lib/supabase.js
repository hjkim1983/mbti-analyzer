import { createClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!supabaseUrl || !supabaseAnonKey) {
  throw new Error(
    "Supabase 환경변수가 없습니다. .env에 NEXT_PUBLIC_SUPABASE_URL과 NEXT_PUBLIC_SUPABASE_ANON_KEY를 설정하세요. " +
      "프로젝트를 바꿨다면 대시보드(Settings → API)에서 새 anon public 키를 복사해야 합니다(이전 키는 새 URL과 함께 쓸 수 없습니다)."
  );
}

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
