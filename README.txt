BeatBridge PWA v1.6
===================

Neu in v1.6
- Spotify ist die bevorzugte Fallback-Quelle für Hörproben.
- Apple/iTunes ist standardmäßig deaktiviert und nur noch optionaler Notfall-Fallback.
- Beim Start wird die zuletzt ausgewählte Beatport-Liste zuerst live aktualisiert.
- Danach aktualisiert BeatBridge automatisch alle übrigen Top-100-, Neu- und Hype-Listen aller eingebauten Genres und legt sie im lokalen Cache ab.
- Der Listenabgleich läuft bewusst nacheinander, um den öffentlichen Reader nicht mit parallelen Anfragen zu überlasten.
- Die zuletzt ausgewählte Genre-/Listenansicht wird gespeichert und beim nächsten Start wiederhergestellt.
- Ein Fortschritt unter der Live-Daten-Anzeige zeigt die Aktualisierung der restlichen Listen.
- Der Aktualisieren-Button startet ebenfalls: aktuelle Liste zuerst, danach alle übrigen Listen.

Spotify
- Für die automatische Spotify-Suche wird eine Spotify Client ID und OAuth/PKCE-Verbindung benötigt.
- Kein Client Secret wird in der PWA gespeichert.
- Spotify-Embeds bleiben innerhalb von BeatBridge.
- Apple/iTunes kann in den Einstellungen weiterhin als letzter Notfall-Fallback aktiviert werden.

Installation
1. Gesamten Ordner auf einen HTTPS-Webspace oder GitHub Pages hochladen.
2. BeatBridge im Android-Browser öffnen.
3. Als App installieren / Zum Startbildschirm hinzufügen.
4. Nach einem Update die installierte PWA einmal vollständig schließen und neu öffnen.
