import { useEffect, useState } from "react";
import { IMG_PLACEHOLDER } from "../constants";
import { getImageUrl } from "../api/formations";

const FALLBACK_SVG =
  "data:image/svg+xml," +
  encodeURIComponent(
    `<svg xmlns="http://www.w3.org/2000/svg" width="400" height="240" viewBox="0 0 400 240">
      <rect fill="#e2e8f0" width="400" height="240"/>
      <text x="50%" y="50%" dominant-baseline="middle" text-anchor="middle" fill="#64748b" font-family="system-ui,sans-serif" font-size="15">Formation</text>
    </svg>`
  );

/** imageUrl = champ API ; src = prioritaire (ex. aperçu fichier). */
export default function FormationImage({ imageUrl, src, alt = "", className, loading, ...rest }) {
  const [failed, setFailed] = useState(false);

  const imgSrc = failed
    ? FALLBACK_SVG
    : src != null && src !== ""
      ? src
      : getImageUrl(imageUrl) || IMG_PLACEHOLDER;

  useEffect(() => {
    // Réinitialiser le repli SVG quand la source change
    // eslint-disable-next-line react-hooks/set-state-in-effect -- reset dérivé des props imageUrl/src
    setFailed(false);
  }, [imageUrl, src]);

  return (
    <img
      src={imgSrc}
      alt={alt}
      className={className}
      loading={loading}
      decoding="async"
      onError={() => setFailed(true)}
      {...rest}
    />
  );
}
