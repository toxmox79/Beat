BeatBridge PWA v1.7
===================

Neu in v1.7
- Spotify-Matching komplett überarbeitet: bis zu vier Suchstrategien statt einer einzigen exakten Suche.
- Titel werden zusätzlich ohne generische Zusätze wie "Original Mix" / "Extended Mix" gesucht.
- Mehrere Artists werden einzeln berücksichtigt, damit Kollaborationen besser gefunden werden.
- Bis zu 10 Spotify-Kandidaten je Suchlauf werden bewertet; offensichtlich falsche Treffer werden weiter verworfen.
- Neuer Deezer-Fallback mit 30-Sekunden-Hörproben direkt im BeatBridge-Mini-Player.
- Standard-Reihenfolge: Beatport → Spotify → Deezer.
- Apple/iTunes bleibt nur noch in einer optionalen Reihenfolge enthalten.
- Wenn Spotify nicht genutzt werden konnte, zeigt BeatBridge jetzt den Grund an (z. B. nicht verbunden / kein Treffer / Match zu unsicher).

Listen-Aktualisierung
- Beim Start wird die zuletzt ausgewählte Beatport-Liste zuerst live aktualisiert.
- Danach aktualisiert BeatBridge automatisch alle übrigen Top-100-, Neu- und Hype-Listen aller eingebauten Genres und legt sie im lokalen Cache ab.
- Die zuletzt ausgewählte Genre-/Listenansicht wird gespeichert und beim nächsten Start wiederhergestellt.
- Der Aktualisieren-Button startet ebenfalls: aktuelle Liste zuerst, danach alle übrigen Listen.

Spotify
- Für die automatische Spotify-Suche wird eine Spotify Client ID und OAuth/PKCE-Verbindung benötigt.
- Kein Client Secret wird in der PWA gespeichert.
- Spotify-Embeds bleiben innerhalb von BeatBridge.
- Ohne Spotify-Verbindung versucht BeatBridge automatisch Deezer.

Installation
1. Gesamten Ordner auf einen HTTPS-Webspace oder GitHub Pages hochladen.
2. BeatBridge im Android-Browser öffnen.
3. Als App installieren / Zum Startbildschirm hinzufügen.
4. Nach einem Update die installierte PWA einmal vollständig schließen und neu öffnen.
