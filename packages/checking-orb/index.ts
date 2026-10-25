// <checking-orb>: what every Fit Check form shows over its text box while a check runs (the site's Home and
// /fit-check forms, and admin's Add posting). The orb is the `connecting` animation from thinking-orbs
// (libraries.dev/orbs), drawn with its framework-free engine so the React site and the Svelte admin share one element.
//
//   <div style="position: relative"><textarea>…</textarea><checking-orb></checking-orb></div>
//
// Mount it inside the text box's positioned wrapper when the check starts, and remove it when the check ends. It
// covers the box (and takes its clicks) and blurs it at once, reaching full blur in 1.5 s. The orb fades in after
// `delay` ms, so a quick answer (a cached report) never shows it. It's drawn at the size it shows, so it stays sharp,
// sized to the box. Colors come from the page's --surface. It's aria-hidden: the page says in its own words what's
// happening.
import { MODE_FRAMES, paintFrame, resolvePreset } from "thinking-orbs/engine";

/** The library's author advises against an orb for waits under 2 s; a cached report usually comes back sooner. */
const DEFAULT_DELAY_MS = 2000;
/** Largest orb, in CSS px; smaller boxes get a smaller one. */
const MAX_SIZE = 200;

const STYLE = `
  :host {
    position: absolute;
    /* Inside the box's 1px border, so the edge stays sharp. */
    inset: 1px;
    display: grid;
    place-items: center;
    border-radius: inherit;
    overflow: hidden;
    animation: blur-in 1.5s ease-in-out forwards;
  }
  @keyframes blur-in {
    from { -webkit-backdrop-filter: blur(0); backdrop-filter: blur(0); background: transparent; }
    to {
      -webkit-backdrop-filter: blur(10px);
      backdrop-filter: blur(10px);
      background: color-mix(in srgb, var(--surface) 60%, transparent);
    }
  }
  canvas { display: block; opacity: 0; transition: opacity 600ms ease-out; }
  :host([shown]) canvas { opacity: 1; }
  @media (prefers-reduced-motion: reduce) {
    :host { animation-duration: 1ms; }
    canvas { transition: none; }
  }
`;

/** Draws the orb at `size` CSS px until the returned function is called. Under reduced motion, one still frame. */
function animate(canvas: HTMLCanvasElement, size: number): () => void {
  const dpr = Math.min(2, window.devicePixelRatio || 1);
  canvas.width = canvas.height = Math.round(size * dpr);
  canvas.style.width = canvas.style.height = `${size}px`;
  const ctx = canvas.getContext("2d");
  if (!ctx) return () => {};
  // The 64 px preset's dot count and speed; the geometry scales with `size`.
  const { mode, speed, opts } = resolvePreset("connecting", 64);
  const dark = matchMedia("(prefers-color-scheme: dark)");
  const reduced = matchMedia("(prefers-reduced-motion: reduce)");

  const draw = () => {
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, size, size);
    // 0.6 s is the frame the library shows under reduced motion.
    const t = reduced.matches ? 0.6 : (performance.now() / 1000) * speed;
    paintFrame(ctx, MODE_FRAMES[mode](size, t, opts), dark.matches);
  };
  let raf = 0;
  const loop = () => {
    draw();
    raf = requestAnimationFrame(loop);
  };
  const restart = () => {
    cancelAnimationFrame(raf);
    if (reduced.matches) draw();
    else loop();
  };

  restart();
  dark.addEventListener("change", draw);
  reduced.addEventListener("change", restart);
  return () => {
    cancelAnimationFrame(raf);
    dark.removeEventListener("change", draw);
    reduced.removeEventListener("change", restart);
  };
}

// Defined in a function because HTMLElement doesn't exist during server rendering, where this module also loads.
function define() {
  class CheckingOrb extends HTMLElement {
    #stop = () => {};

    connectedCallback() {
      const delay = Number(this.getAttribute("delay") ?? DEFAULT_DELAY_MS);
      this.setAttribute("aria-hidden", "true");
      this.removeAttribute("shown");

      const root = this.shadowRoot ?? this.attachShadow({ mode: "open" });
      root.innerHTML = `<style>${STYLE}</style><canvas></canvas>`;

      let stopOrb = () => {};
      const timer = setTimeout(() => {
        this.setAttribute("shown", "");
        const size = Math.round(Math.max(48, Math.min(MAX_SIZE, this.clientHeight - 24)));
        stopOrb = animate(root.querySelector("canvas")!, size);
      }, delay);
      this.#stop = () => {
        clearTimeout(timer);
        stopOrb();
      };
    }

    disconnectedCallback() {
      this.#stop();
    }
  }
  customElements.define("checking-orb", CheckingOrb);
}

if (typeof customElements !== "undefined" && !customElements.get("checking-orb")) define();
