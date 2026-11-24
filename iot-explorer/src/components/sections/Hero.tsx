import ActionLink from "../ui/ActionLink";
import { ACTIONS } from "../../config/actions";

export default function Hero() {
  return (
    <section id="home" className="bg-white">
      <div className="mx-auto grid max-w-6xl items-center gap-10 px-5 py-10 sm:gap-12 sm:px-8 sm:py-20 lg:grid-cols-12 lg:py-24">
        <div className="min-w-0 lg:col-span-6">
          <h1 className="text-4xl font-bold leading-[1.1] sm:text-5xl lg:text-6xl">
            Learn the Internet of Things by building it.
          </h1>
          <p className="mt-6 max-w-lg text-lg leading-relaxed text-ink-soft">
            IoT Explorer helps engineering students understand sensors, microcontrollers and connected devices through guided circuits, code and simulation.
          </p>
          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:items-center sm:gap-6">
            <ActionLink action={ACTIONS.startLearning} size="lg" className="w-full sm:w-auto">Start Learning</ActionLink>
            <a href="#projects" className="inline-flex min-h-11 items-center justify-center font-semibold underline decoration-line underline-offset-4 hover:text-brand-600 hover:decoration-brand-500">
              Explore projects
            </a>
          </div>
        </div>

        <div className="grid min-w-0 grid-cols-2 gap-4 lg:col-span-6">
          <div className="col-span-2 flex aspect-[16/10] items-center justify-center rounded-lg bg-brand-50 shadow-card"><img src="/components/arduino.png" alt="Arduino Uno board" className="float-y h-4/5 object-contain" /></div>
          <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-brand-50 shadow-card"><img src="/components/esp8266_wifi_module.png" alt="ESP8266 Wi-Fi module" className="float-y h-4/5 object-contain" style={{ ["--d" as string]: "-1.5s" }} /></div>
          <div className="flex aspect-[4/3] items-center justify-center rounded-lg bg-brand-50 shadow-card"><img src="/components/breadboard.png" alt="Breadboard" className="float-y h-4/5 object-contain" style={{ ["--d" as string]: "-3s" }} /></div>
        </div>
      </div>
    </section>
  );
}
