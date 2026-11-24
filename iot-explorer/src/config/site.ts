// Single place for college details and asset paths. Empty strings are simply hidden.
export const SITE = {
  name: "IoT Explorer",
  tagline: "Learn the Internet of Things by building it",
  college: {
    name: "SSM College of Engineering and Technology",
    logo: "/images/logo/college-logo.png", // <- place your official logo here
    address: "Kuttathupatti, Sinthalagundu Post, Dindigul – Palani Highway, Dindigul – 624 002, Tamil Nadu, India.", // TODO: add official address
    phone: "", // TODO
    email: "ssmietiotexplorer@gmail.com", // TODO
    website: "https://ssmiet.ac.in/", // TODO e.g. https://example.edu
  },
} as const;

export const NAV_LINKS = [
  { label: "Home", href: "#home" },
  { label: "About", href: "#about" },
  { label: "Learning", href: "#learning" },
  { label: "Projects", href: "#projects" },
] as const;

// Standards (classes) offered on the student registration form.
export const STANDARDS = [8, 9, 10, 11, 12] as const;
