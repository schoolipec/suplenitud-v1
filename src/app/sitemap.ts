import type {MetadataRoute} from "next";

const baseUrl = "https://demo.suplenitud.com";
const paths = ["/", "/pastors/", "/es/", "/es/pastors/", "/pt/", "/pt/pastors/", "/ko/", "/ko/pastors/", "/de/", "/de/pastors/"];

export default function sitemap(): MetadataRoute.Sitemap {
  return paths.map((path) => ({url: new URL(path, baseUrl).toString(), lastModified: new Date("2026-10-09T00:00:00.000Z")}));
}
