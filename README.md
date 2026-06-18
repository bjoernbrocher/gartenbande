# Gartenbande Hemmingen

Eine ruhige, mobile-first PWA als digitales Schwarzes Brett fuer Hemmingen.

## Funktionen

- Momente teilen: Foto, ein Satz, fertig
- Pflanzentausch: Suche und Biete
- Wer kann helfen: freie Anfrage mit automatischer Einordnung
- Info & Vermisst: sichtbare Warnungen mit Admin-Freigabe
- Dorfplatz, Ortsteile, Sammelalbum und Monatschallenge
- PWA-Unterstuetzung mit Manifest, Icons und Service Worker
- Supabase Magic-Link-Anmeldung und Live-Datenbasis

## Lokal starten

Die App ist statisch und kann direkt ueber einen lokalen Server gestartet werden:

```bash
python -m http.server 4179
```

Dann oeffnen:

```text
http://127.0.0.1:4179/index.html
```

## Supabase

Vor dem Live-Betrieb den Inhalt von `supabase-schema.sql` im Supabase SQL Editor ausfuehren.

Danach in Supabase unter `Authentication > URL Configuration` die Live-Domain als Site URL und Redirect URL eintragen.
