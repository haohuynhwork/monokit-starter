import { useEffect } from "react";

// <html lang> for the post's locale; restored when the page unmounts
export function HtmlLang({ lang }: { lang: string }) {
  useEffect(() => {
    if (!lang || lang === "und") {
      return;
    }
    const html = document.documentElement;
    const before = html.lang;
    html.lang = lang;
    return () => {
      html.lang = before;
    };
  }, [
    lang,
  ]);
  return null;
}
