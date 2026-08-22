/**
 * Ambient stage scenes — shared metadata for the scene picker.
 *
 * Kept in its own module (not in AmbientBackground.jsx) so that component file
 * only exports components (React Fast Refresh requirement). Ids must match the
 * SCENES map in AmbientBackground.jsx.
 */
export const SCENE_LIST = [
  { id: "rainy-night", label: "Rainy night", icon: "rain" },
  { id: "starry-night", label: "Starry night", icon: "stars" },
  { id: "lofi-dusk", label: "Lo-fi dusk", icon: "dusk" },
];
