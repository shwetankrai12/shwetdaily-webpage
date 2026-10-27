export interface NavLink {
  label: string;
  href: string;
}

export interface TopicItem {
  number: string;
  title: string;
  description: string;
  badge?: string;
}

export interface StatItem {
  label: string;
  value: string;
  caption?: string;
}


export interface AboutConfig {
  eyebrow: string;
  heading: string;
  paragraphs: string[];
  pull: string;
  terminal: { key: string; value: string }[];
  now?: string; // TODO: one line about what you're building right now (row hides while empty)
}

export interface SiteConfig {
  name: string;
  handle: string;
  instagramUrl: string;
  email: string;
  tagline: string;
  bio: string;
  avatarAlt: string;
  navLinks: NavLink[];
  topics: TopicItem[];
  stats: StatItem[];
  about: AboutConfig;
}

export const siteConfig: SiteConfig = {
  name: "Shwetank Rai",
  handle: "@shwetdaily",
  instagramUrl: "https://instagram.com/shwetdaily",
  email: "shwetdaily@gmail.com",
  tagline: "Tech and Building",
  bio: "Just documenting the things I'm building & learning. Tech • Ideas • Life",
  avatarAlt: "Shwetank Rai 3D retro tech avatar sitting on a vintage CRT monitor with phone",
  navLinks: [
    { label: "Work", href: "#posts" },
    { label: "Topics", href: "#topics" },
    { label: "Follow", href: "#links" },
  ],
  about: {
    eyebrow: "ABOUT THE BUILDER",
    heading: "HEY, I'M SHWETANK.",
    paragraphs: [
      "I build things in tech and document the process on Instagram as @shwetdaily: AI tools, trading and quant experiments, ML projects, and web and SEO work.",
      "I share the wins and the mistakes. Some posts are about what worked, others are about what I got wrong and how I fixed it.",
    ],
    pull: "Come figure it out with me.",
    terminal: [
      { key: "role", value: "Tech and Building" },
      { key: "focus", value: "AI tools, trading and quant, ML, web and SEO" },
      { key: "mission", value: "Document the build in public" },
    ],
    now: "",
  },
  topics: [
    {
      number: "01",
      title: "AI Tools",
      description: "AI tools I test and set up, and what actually works.",
      badge: "AI / LLMs",
    },
    {
      number: "02",
      title: "Trading and Quant",
      description: "Trading engines, backtests, and quant experiments.",
      badge: "Quant",
    },
    {
      number: "03",
      title: "ML Projects",
      description: "Machine learning projects I build, from data to a working model.",
      badge: "Machine Learning",
    },
    {
      number: "04",
      title: "SEO and Web Building",
      description: "Building websites and fixing my own SEO mistakes in public.",
      badge: "Web / SEO",
    },
  ],
  stats: [], // TODO: add real numbers only when you have them
};