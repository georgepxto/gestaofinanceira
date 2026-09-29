import type { RefObject } from "react";
import { DemoSection } from "./DemoSection";
import { DashboardSection } from "./DashboardSection";
import { Features } from "./Features";
import { HowItWorks } from "./HowItWorks";
import { SettleMoment } from "./SettleMoment";
import { Testimonials } from "./Testimonials";
import { Security } from "./Security";
import { FinalCta } from "./FinalCta";
import { useLandingMotion } from "./useLandingMotion";

/* Tudo abaixo do hero, num chunk próprio: GSAP, ScrollTrigger e Lenis só
   chegam depois que o título e o botão já estão na tela. O movimento da
   página (trocas de tema, inércia) nasce aqui porque depende destas seções. */
export default function BelowFold({ rootRef }: { rootRef: RefObject<HTMLDivElement> }) {
  useLandingMotion(rootRef);
  return (
    <>
      <DemoSection />
      <DashboardSection />
      <Features />
      <SettleMoment />
      <HowItWorks />
      <Testimonials />
      <Security />
      <FinalCta />
    </>
  );
}
