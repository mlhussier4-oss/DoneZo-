import type { MetadataRoute } from "next";

/** Lets people add DoneZo to their home screen (needed for notifications on iPhone). */
export default function manifest(): MetadataRoute.Manifest {
  return {
    name: "DoneZo",
    short_name: "DoneZo",
    description: "Post a job. Receive bids. Choose your provider.",
    start_url: "/",
    display: "standalone",
    background_color: "#f4f6f9",
    theme_color: "#14213d",
    icons: [
      { src: "/icons/icon-192.png", sizes: "192x192", type: "image/png" },
      { src: "/icons/icon-512.png", sizes: "512x512", type: "image/png" },
      { src: "/icons/icon-maskable-512.png", sizes: "512x512", type: "image/png", purpose: "maskable" },
    ],
  };
}
