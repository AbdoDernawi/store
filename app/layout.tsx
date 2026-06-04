import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "نظام إدارة المتجر الإلكتروني",
  description: "منصة إدارة التجارة والمخازن والتوصيل",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ar" dir="rtl">
      <body>
        {children}
        <script
          dangerouslySetInnerHTML={{
            __html:
              'if("serviceWorker"in navigator){var registerPwa=function(){navigator.serviceWorker.register("/sw.js").catch(function(){});};if(document.readyState==="complete"){registerPwa();}else{window.addEventListener("load",registerPwa,{once:true});}}',
          }}
        />
      </body>
    </html>
  );
}
