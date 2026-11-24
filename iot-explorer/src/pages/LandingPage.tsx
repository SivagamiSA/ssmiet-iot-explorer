import Hero from "../components/sections/Hero";
import ComponentShowcase from "../components/sections/ComponentShowcase";
import About from "../components/sections/About";
import WhatYouLearn from "../components/sections/WhatYouLearn";
import Projects from "../components/sections/Projects";
import InteractiveLearning from "../components/sections/InteractiveLearning";
import HowItWorks from "../components/sections/HowItWorks";
import CollegeSection from "../components/sections/CollegeSection";

export default function LandingPage() {
  return (
    <>
      <Hero />
      <ComponentShowcase />
      <About />
      <WhatYouLearn />
      <Projects />
      <InteractiveLearning />
      <HowItWorks />
      <CollegeSection />
    </>
  );
}
