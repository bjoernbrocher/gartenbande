# Gartenbande Hemmingen

## Zweck
Digitale Dorfplatz-PWA fuer Gartenmomente, Pflanzentausch, Nachbarschaftshilfe, Infos, Kommentare und lokale Gartenfreunde in Hemmingen.

## Fester Projektkontext
- Lokaler Ordner: `D:\0000 DATEN\OneDrive\Dokumente\Gartenbande Hemmingen`
- GitHub-Repo: `https://github.com/bjoernbrocher/gartenbande.git`
- Standard-Branch: `master`
- Live-Domain: `gartenbande.brocher-online.de`
- Vercel-Projekt: Gartenbande-Projekt bei Vercel
- Supabase-Projekt: `https://kyjcbmwzcxbymbcuwtfw.supabase.co`
- Supabase-Schema: `supabase-schema.sql`

## Datenbereiche
- Browser-Demo/Offline: `localStorage`
  - `gartenbande:v2:state`
  - `gartenbande:v2:user`
- Supabase-Tabellen:
  - `profiles` fuer Gartenfreunde, Profile und Adminrechte
  - `entries` fuer Momente, Tauschbeet, Hilfe, Warnungen und Dorfplatz
  - `entry_reactions` fuer Reaktionen
  - `entry_comments` fuer Kommentare

## Lokaler Start
Statischen Server im Projektordner starten, zum Beispiel:

```powershell
python -m http.server 4173 --bind 127.0.0.1
```

Dann oeffnen:

```text
http://127.0.0.1:4173/index.html
```

## Release-Ablauf
1. Vor jeder Aenderung pruefen, dass der Arbeitsordner dieser Ordner ist.
2. `git status --short` ausfuehren.
3. Nur Gartenbande-Dateien aendern.
4. Lokal testen.
5. Commit erstellen.
6. Push nach `origin master`.
7. Vercel-Deployment pruefen.

## Trennregel
Keine Fitness-Park-Dateien, Fitness-Supabase-Tabellen oder Fitness-Domains in diesem Projekt verwenden.
