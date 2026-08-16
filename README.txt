BeatBridge PWA – Version 1.2
============================

Neu in 1.2
- Fester Mini-Player am unteren Bildschirmrand.
- Die aktuelle Hörprobe läuft weiter, während du einen anderen Track auswählst oder die Eingabefelder änderst.
- Mini-Player zeigt Cover, Artist, Titel, Zeit und eine verschiebbare Zeitleiste.
- Play/Pause funktioniert sowohl im großen Hörproben-Player als auch im Mini-Player synchron.
- Tippen auf Titel/Artist im Mini-Player springt zurück zur großen Hörproben-Karte.
- Jeder Eintrag im Verlauf hat jetzt einen eigenen ▶-Button.
- Bereits gefundene Preview-URLs werden lokal im Verlauf gespeichert. Dadurch starten bekannte Tracks per ▶ sofort, ohne neue Suche.
- Bei älteren Verlaufseinträgen ohne gespeicherte Preview sucht BeatBridge automatisch eine Hörprobe.
- Beim Suchen eines neuen Tracks wird die laufende Hörprobe erst ersetzt, wenn tatsächlich ein neuer Treffer gefunden wurde.

Weiterhin enthalten
- Hörprobensuche nach Artist + Titel über die iTunes Search API.
- Bis zu 5 passende Treffer.
- SoundCloud, Spotify, YouTube, YouTube Music, SimpMusic und Google.
- Android Share Target: Beatport -> Teilen -> BeatBridge.
- PWA/Offline-Oberfläche ohne API-Key.

Wichtig zur Hörprobe
Beatports eigene Audio-Preview ist für Drittanbieter nicht als frei zugängliche PWA-Schnittstelle verfügbar.
Daher nutzt BeatBridge als kostenlose Fallback-Hörprobe die iTunes Search API. Beatport-exklusive Tracks können dort fehlen.
Die Hörprobe wird nur gestreamt und nicht offline gespeichert.

Installation / Hosting
1. Alle Dateien unverändert auf einen HTTPS-Webserver oder GitHub Pages hochladen.
2. index.html öffnen.
3. Im Browser "App installieren" / "Zum Startbildschirm hinzufügen" wählen.

Android Share Target
Nach der Installation sollte BeatBridge im Android-Teilen-Menü als Ziel erscheinen.
Bei Beatport im Browser: Track öffnen -> Teilen -> BeatBridge.
Je nach Browser werden Titel, Text und/oder URL übertragen.

SimpMusic
SimpMusic unterstützt eigene Deep Links, aber aktuell ist kein stabil dokumentierter externer Such-Deep-Link für freien Suchtext verfügbar.
Darum kopiert BeatBridge die Suchanfrage und öffnet SimpMusic. Dort nur noch in das Suchfeld einfügen.
