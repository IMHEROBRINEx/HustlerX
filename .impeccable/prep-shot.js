(() => {
  const id = "shot-prep";
  if (!document.getElementById(id)) {
    const style = document.createElement("style");
    style.id = id;
    style.textContent =
      '[class*="min-h-[calc(100dvh"]{min-height:816px!important}.min-h-dvh{min-height:900px!important}nextjs-portal{display:none!important}';
    document.head.appendChild(style);
  }
  window.scrollTo(0, 0);
  return document.documentElement.scrollHeight;
})()
