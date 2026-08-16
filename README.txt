BeatBridge PWA v1.3
===================

NEU IN 1.3
- Beatport-inspirierte interne Digging-Ansicht statt externem Hin-und-her-Wechseln.
- Global Top 100 und Genre-Ansichten in der PWA.
- Bereiche: Top 100, neue Tracks, Hype 100, lokaler Verlauf.
- Genres u.a. Hard Techno, Techno (Peak Time / Driving), Tech House, House,
  Melodic House & Techno, Deep House, Progressive House, Drum & Bass, Organic House.
- Trackliste mit Rank, Artist, Titel sowie BPM/Key/Label, soweit von der öffentlichen
  Beatport-Seite geliefert.
- Direktes ▶ Reinhören aus jeder Trackzeile; der feste Mini-Player bleibt sichtbar.
- „•••“ pro Track öffnet SimpMusic, SoundCloud, Spotify, YouTube Music, YouTube, Google.
- Lokaler Verlauf und 15-Minuten-Cache.

DATENQUELLE / TECHNIK
Eine PWA kann beatport.com wegen Browser-Sicherheitsregeln nicht einfach per iframe
oder direktem Cross-Origin-Fetch einbetten. BeatBridge ruft deshalb die öffentliche
Beatport-Webseite über den Jina Reader (r.jina.ai) als Text/Metadaten ab und baut daraus
eine eigene mobile Übersicht. Für einfache Reader-Nutzung ist kein API-Key hinterlegt.
Wenn Beatport oder der Reader sein Ausgabeformat ändert, kann der Parser angepasst werden.

HÖRPROBEN
Die integrierte Hörprobe wird weiterhin über die öffentliche iTunes-Suche gematcht.
Sie ist deshalb nicht zwingend dieselbe Preview-Datei wie auf Beatport. Beatport-exklusive
Tracks können dort fehlen.

INSTALLATION
Alle Dateien zusammen auf einen HTTPS-Webspace / GitHub Pages hochladen. index.html öffnen
und im Browser „App installieren“ / „Zum Startbildschirm hinzufügen“ wählen.
