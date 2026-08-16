BeatBridge PWA v1.5
===================

NEU IN 1.5
- Hörproben-Fallback mit frei wählbarer Reihenfolge:
  Beatport -> Spotify -> Apple/iTunes (Standard).
- Wenn ein Track einen direkten Beatport-Preview-Link enthält, wird dieser zuerst genutzt.
- Spotify kann als zweiter Hörprobenweg direkt IN BeatBridge eingebettet werden.
- Spotify-Treffer werden 30 Tage lokal gecacht, damit derselbe Track nicht erneut gesucht
  werden muss.
- Der feste Player zeigt die Quelle der Hörprobe an.
- Spotify-Einrichtung direkt in der PWA unter "Hörproben & Spotify".
- Ohne eingerichtetes Spotify wird automatisch die nächste Quelle (Apple/iTunes) genutzt.

WICHTIG ZU SPOTIFY
Die Spotify Web API verlangt aktuell eine Spotify Developer App und für Development Mode
muss der App-Eigentümer Spotify Premium besitzen. BeatBridge verwendet dafür den sicheren
Authorization-Code-with-PKCE-Flow; ein Client Secret wird NICHT in der PWA gespeichert.

Einrichtung:
1. BeatBridge auf HTTPS hosten und öffnen.
2. In Spotify for Developers eine App mit Web API anlegen.
3. In BeatBridge "Hörproben & Spotify" öffnen.
4. Die dort angezeigte Redirect URI kopieren und in der Spotify-App als Redirect URI
   hinterlegen.
5. Spotify Client ID in BeatBridge eintragen, speichern und "Verbinden" wählen.
6. Nach der Spotify-Anmeldung kehrt die PWA automatisch zurück.

Der Spotify-Player ist ein offizieller Spotify Embed und bleibt innerhalb der BeatBridge-PWA.
Browser können Autoplay nach einer Netzwerksuche blockieren; in diesem Fall einmal den
Play-Button im eingebetteten Spotify-Player antippen.

WEITERHIN ENTHALTEN
- Beatport-inspirierte interne Digging-Ansicht.
- Global Top 100 und Genre-Ansichten.
- Top 100 / Neu / Hype / Verlauf.
- Trackliste mit Rank, Artist, Titel sowie BPM/Key/Label, soweit verfügbar.
- Fester Mini-Player.
- Android-App-Deep-Links für SimpMusic, SoundCloud, Spotify, YouTube Music und YouTube.
- 15-Minuten-Cache für Beatport-Metadaten und lokaler Verlauf.

DATENQUELLE / TECHNIK
Eine PWA kann beatport.com wegen Browser-Sicherheitsregeln nicht einfach per iframe oder
Cross-Origin-Fetch einbetten. BeatBridge liest die öffentliche Beatport-Seite deshalb über
r.jina.ai als Text/Metadaten und baut die mobile Übersicht selbst.

Die Apple/iTunes-Hörprobe dient als kostenloser Fallback. Sie ist nicht zwingend dieselbe
Preview-Datei wie bei Beatport und Beatport-exklusive Tracks können fehlen.

INSTALLATION
Alle Dateien dieses Ordners zusammen auf einen HTTPS-Webspace / GitHub Pages hochladen.
index.html öffnen und im Browser "App installieren" / "Zum Startbildschirm hinzufügen"
wählen. Nach dem Update auf v1.5 die installierte PWA einmal komplett schließen und neu öffnen,
damit der neue Service-Worker-Cache aktiv wird.
