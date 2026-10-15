import { ImageResponse } from "next/og";
import { site } from "@/lib/resume";

export const alt = "Ryan Jensen: Engineering Leader & Software Engineer";
export const size = { width: 1200, height: 630 };
export const contentType = "image/png";

export default function Image() {
  const { basics } = site.variants.base;
  return new ImageResponse(
    (
      <div style={{ width: "100%", height: "100%", display: "flex", flexDirection: "column", justifyContent: "space-between", padding: 72, background: "#0d1113", color: "#e8ebee" }}>
        <div style={{ display: "flex", fontSize: 26, letterSpacing: 6, textTransform: "uppercase", color: "#f4b35a" }}>
          Engineering Manager · Lead Software Engineer
        </div>
        <div style={{ display: "flex", flexDirection: "column" }}>
          <div style={{ fontSize: 120, lineHeight: 1, fontFamily: "serif" }}>{basics.name}</div>
          <div style={{ marginTop: 28, fontSize: 36, color: "#a5afb9", maxWidth: 950 }}>
            From loading trucks to leading engineering teams. Shipping things since 2013.
          </div>
        </div>
        <div style={{ display: "flex", alignItems: "center", gap: 18, fontSize: 30, color: "#63d2c8" }}>
          <div style={{ width: 64, height: 6, borderRadius: 3, background: "#63d2c8" }} />
          ryanjensen.dev
        </div>
      </div>
    ),
    size,
  );
}
