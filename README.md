# RB TAXI – Výčetka

Jednostránková PWA pro výčetku řidiče. Připraveno pro GitHub Pages / Netlify / Vercel.

## Funkce
- Výpočet výčetky podle směny, tržby, nákladů a započtených km.
- Automatický výpočet najetých km z počátečního a konečného stavu.
- Sdílení textu, sdílení obrázku a export PDF.
- PWA manifest a service worker s cache verzovaných assetů.
- Reset a „Nová směna“ zachovává jméno řidiče.
- Mobilní rozložení pro iOS Safari a Android Chrome včetně safe-area okrajů.
- Luxusní vizuální režim s grafitovým povrchem, kovovou linkou a prémiovým akcentem.

## Použití lokálně
Stačí otevřít `index.html` v prohlížeči. Pro PWA a SW je ideální malý server (např. `npx serve`).
 
## Nasazení na GitHub Pages
1. Vytvořte repo a nahrajte všechny soubory.
2. Zapněte Pages (branch `main`, folder `/root`).
3. Po první publikaci udělejte Refresh (Ctrl/Cmd+F5).

## Poznámky
- Service Worker má vlastní verzi cache a cacheuje stejné verzované assety, které načítá HTML.
- Po nasazení nové verze na telefonu pomůže jednorázové úplné zavření a znovuotevření aplikace, aby si PWA převzala novou cache.
- Data zůstávají v prohlížeči a neposílají se na server.

**Kontakt:** Pokud chcete rozšířit o přihlášení řidičů, exporty XLSX, nebo napojení na účetnictví, kód je připraven na modulární rozšíření v `app.js`.
