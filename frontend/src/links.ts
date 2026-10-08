import { Linking } from "react-native";
import type { useRouter } from "expo-router";
import { SITE_URL } from "./api";

type Router = ReturnType<typeof useRouter>;

// Decides what a tapped link does:
//  - phone / e-mail  -> the phone's dialer / mail app
//  - a post or event on the MSTC site -> the app's own post reader
//  - any other web link -> the in-app website viewer (which has an "open in browser" button)
export function openLink(href: string, router: Router) {
  try {
    if (/^(tel:|mailto:)/i.test(href)) {
      Linking.openURL(href).catch(() => {});
      return;
    }
    if (!/^https?:\/\//i.test(href)) return;

    if (href.startsWith(SITE_URL)) {
      const path = href.slice(SITE_URL.length).split(/[?#]/)[0];
      if (/^\/announcements\/[^/]+\/?$/.test(path)) {
        router.push({ pathname: "/article", params: { url: href, category: "community" } });
        return;
      }
      if (/^\/events\/[^/]+\/?$/.test(path)) {
        router.push({ pathname: "/article", params: { url: href, category: "event" } });
        return;
      }
    }
    router.push({ pathname: "/website", params: { u: href } });
  } catch {}
}
