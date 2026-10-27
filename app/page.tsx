import { Navbar } from "@/components/Navbar";
import { Hero } from "@/components/Hero";
import { ActivityCity } from "@/components/ActivityCity";
import { Topics } from "@/components/Topics";
import { Posts } from "@/components/Posts";
import { About } from "@/components/About";
import { FollowCTA } from "@/components/FollowCTA";
import { Footer } from "@/components/Footer";

export default function Home() {
  return (
    <main id="top" className="min-h-screen bg-[#0A0A0A] text-[#F5F2E8] flex flex-col selection:bg-[#39FF14] selection:text-[#0A0A0A]">
      <Navbar />
      <Hero />
      <ActivityCity />
      <Topics />
      <Posts />
      <About />
      <FollowCTA />
      <Footer />
    </main>
  );
}
