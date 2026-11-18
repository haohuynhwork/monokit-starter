import { SanitizeHtmlSanitizer } from "./sanitize-html.sanitizer.js";

const clean = (html: string) => new SanitizeHtmlSanitizer().sanitize(html);

describe("SanitizeHtmlSanitizer", () => {
  it("keeps article markup", () => {
    const html =
      '<h2>Title</h2><p style="text-align: center"><strong>Bold</strong> <a href="https://x.test">link</a></p><table><tbody><tr><td>1</td></tr></tbody></table>';
    // Styles come back normalized (no space after the colon)
    expect(clean(html)).toBe(
      html.replace("text-align: center", "text-align:center"),
    );
  });

  it("removes anything that runs", () => {
    expect(clean('<p onclick="x()">a</p><script>alert(1)</script>')).toBe(
      "<p>a</p>",
    );
    expect(clean('<a href="javascript:alert(1)">x</a>')).toBe("<a>x</a>");
    expect(clean('<iframe src="https://x.test"></iframe>')).toBe("");
    expect(clean('<p style="position:fixed;z-index:9">a</p>')).toBe("<p>a</p>");
    expect(
      clean('<p style="background-color:url(https://x.test/a.png)">a</p>'),
    ).toBe("<p>a</p>");
    expect(
      clean('<iframe src="https://www.youtube.com.x.test/embed/1"></iframe>'),
    ).toBe("");
  });

  it("only keeps images from our files or https", () => {
    expect(clean('<img src="/files/assets/a.png" alt="A" />')).toBe(
      '<img src="/files/assets/a.png" alt="A" />',
    );
    expect(
      clean(
        '<img src="serve/818aacd3-b257-44fc-933a-a2e6d29d0e46.jpg" alt="A" />',
      ),
    ).toBe(
      '<img src="serve/818aacd3-b257-44fc-933a-a2e6d29d0e46.jpg" alt="A" />',
    );
    // Only keys: no ids, paths or '..'
    expect(clean('<img src="serve/12" />')).toBe("");
    expect(clean('<img src="serve/products/x/a.png" />')).toBe("");
    expect(clean('<img src="serve/../x" />')).toBe("");
    expect(clean('<img src="http://x.test/a.png" />')).toBe("");
    expect(clean('<img src="data:image/png;base64,xx" />')).toBe("");
  });

  it("stores file URLs as references", () => {
    expect(
      clean(
        '<img src="/files/818aacd3-b257-44fc-933a-a2e6d29d0e46.jpg" /><img src="/serve/818aacd3-b257-44fc-933a-a2e6d29d0e46.jpg" /><a href="/serve/07e745fc-9dc3-49f5-a553-8612cf7b1795">a</a><img src="/files/other/a.png" />',
      ),
    ).toBe(
      '<img src="serve/818aacd3-b257-44fc-933a-a2e6d29d0e46.jpg" /><img src="serve/818aacd3-b257-44fc-933a-a2e6d29d0e46.jpg" /><a href="serve/07e745fc-9dc3-49f5-a553-8612cf7b1795">a</a><img src="/files/other/a.png" />',
    );
  });

  it("protects new tabs", () => {
    expect(clean('<a href="https://x.test" target="_blank">x</a>')).toBe(
      '<a href="https://x.test" target="_blank" rel="noopener noreferrer">x</a>',
    );
  });

  it("keeps what the full editor writes", () => {
    expect(
      clean(
        '<p style="color:#e03e2d;background-color:rgb(1, 2, 3);font-size:18pt;font-family:Georgia, serif;line-height:1.5;padding-left:40px" dir="rtl">a</p>',
      ),
    ).toBe(
      '<p style="color:#e03e2d;background-color:rgb(1, 2, 3);font-size:18pt;font-family:Georgia, serif;line-height:1.5;padding-left:40px" dir="rtl">a</p>',
    );
    expect(
      clean(
        '<details class="mce-accordion" open><summary>Q</summary><p>A</p></details>',
      ),
    ).toBe(
      '<details class="mce-accordion" open><summary>Q</summary><p>A</p></details>',
    );
    expect(
      clean(
        '<table style="border-collapse:collapse;width:100%" border="1"><tbody><tr><td style="width:50%">x</td></tr></tbody></table>',
      ),
    ).toBe(
      '<table style="border-collapse:collapse;width:100%" border="1"><tbody><tr><td style="width:50%">x</td></tr></tbody></table>',
    );
  });

  it("keeps embeds from known hosts, sandboxed", () => {
    expect(
      clean(
        '<iframe src="https://www.youtube.com/embed/abc" width="560" height="314" allowfullscreen="allowfullscreen" sandbox="allow-top-navigation"></iframe>',
      ),
    ).toBe(
      '<iframe src="https://www.youtube.com/embed/abc" width="560" height="314" allowfullscreen="allowfullscreen" sandbox="allow-scripts allow-same-origin allow-presentation allow-popups" loading="lazy"></iframe>',
    );
    expect(
      clean(
        '<video controls><source src="/files/assets/a.mp4" type="video/mp4" /></video>',
      ),
    ).toBe(
      '<video controls><source src="/files/assets/a.mp4" type="video/mp4" /></video>',
    );
    expect(
      clean('<video controls><source src="http://x.test/a.mp4" /></video>'),
    ).toBe("<video controls></video>");
  });
});
