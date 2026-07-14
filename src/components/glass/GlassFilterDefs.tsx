"use client";
/**
 * Renders the Tier-1 liquid refraction filter once. A radial displacement map
 * (encoded as a data-URI gradient) warps the backdrop near the element edges.
 */
export function GlassFilterDefs() {
  return (
    <svg aria-hidden width="0" height="0" style={{ position: "absolute" }}>
      <defs>
        <radialGradient id="nitor-disp-grad">
          <stop offset="0%" stopColor="#808080" />
          <stop offset="75%" stopColor="#808080" />
          <stop offset="100%" stopColor="#ffffff" />
        </radialGradient>
        <filter id="nitor-liquid" x="-20%" y="-20%" width="140%" height="140%" colorInterpolationFilters="sRGB">
          <feImage
            href="data:image/svg+xml;utf8,<svg xmlns='http://www.w3.org/2000/svg' width='100' height='100'><defs><radialGradient id='g' cx='50%25' cy='50%25' r='50%25'><stop offset='60%25' stop-color='rgb(128,128,128)'/><stop offset='100%25' stop-color='rgb(200,140,128)'/></radialGradient></defs><rect width='100' height='100' fill='url(%23g)'/></svg>"
            result="map"
            preserveAspectRatio="none"
            x="0" y="0" width="100%" height="100%"
          />
          <feDisplacementMap in="SourceGraphic" in2="map" scale="40" xChannelSelector="R" yChannelSelector="G" />
        </filter>
      </defs>
    </svg>
  );
}
