import withPWAInit from "next-pwa";

const withPWA = withPWAInit({
  dest: "public",
  register: true,
  skipWaiting: true,
  disable: process.env.NODE_ENV === "development",
  buildExcludes: [/app-build-manifest\.json$/],
});

/** @type {import('next').NextConfig} */
const nextConfig = {
  images: {
    formats: ["image/avif", "image/webp"],
    remotePatterns: [
      {
        protocol: "https",
        hostname: "**.supabase.co",
      },
    ],
  },
  experimental: {
    outputFileTracingIncludes: {
      "/api/invoices/generate": [
        "./node_modules/@expo-google-fonts/noto-sans-arabic/400Regular/NotoSansArabic_400Regular.ttf",
        "./node_modules/@expo-google-fonts/noto-sans-arabic/700Bold/NotoSansArabic_700Bold.ttf",
      ],
    },
  },
};

export default withPWA(nextConfig);
