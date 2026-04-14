import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  // Ignorar erro de variáveis de ambiente durante o build (será fornecido no runtime)
  env: {
    NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL || '',
    NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY || '',
  },
};

export default nextConfig;
