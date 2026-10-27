import { Header } from "@/components/site/Header";
import { Footer } from "@/components/site/Footer";
import { StickyBar } from "@/components/site/StickyBar";
import { Tracker } from "@/components/site/Tracker";
import { ConfigProvider } from "@/components/site/ConfigProvider";
import { getConfig } from "@/lib/settings";

export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const config = await getConfig();
  return (
    <ConfigProvider value={config}>
      <Header />
      <main>{children}</main>
      <Footer />
      <StickyBar />
      <Tracker />
    </ConfigProvider>
  );
}
