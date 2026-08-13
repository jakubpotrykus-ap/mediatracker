# Dostawcy katalogu

## TMDB

TMDB jest głównym dostawcą filmów i seriali. Token Read Access jest wysyłany wyłącznie z serwera jako Bearer token. Aplikacja pobiera polską i angielską wersję metadanych, ukrywa wyniki `adult`, respektuje odpowiedzi `429`, stosuje timeout i zapisuje wybrane rekordy lokalnie.

Wymagana informacja znajduje się na ekranie `/about`:

> This product uses the TMDB API but is not endorsed or certified by TMDB.

Ekran About zawiera zatwierdzone logo `blue_long_2` pobrane bez zmian z oficjalnego zestawu oraz odsyłacz do TMDB. Dokumentacja: [TMDB attribution](https://developer.themoviedb.org/docs/faq), [authentication](https://developer.themoviedb.org/docs/authentication-application), [rate limiting](https://developer.themoviedb.org/docs/rate-limiting).

## AniList

Adapter GraphQL może uzupełnić mniej popularne anime. Dla serialowego rekordu bez wiarygodnej struktury sezonów tworzony jest jeden techniczny sezon reprezentujący daną część. Kolejne części i sequele nie są sztucznie łączone.

Aktualne warunki zakazują masowego gromadzenia danych i użycia w konkurencyjnym trackerze bez zgody. Dlatego adapter jest wyłączony domyślnie. Włączenie wymaga sprawdzenia aktualnych warunków, uzyskania ewentualnej zgody oraz ustawienia obu flag środowiskowych. Dokumentacja: [AniList Terms of Use](https://anilist.gitbook.io/anilist-apiv2-docs/docs/guide/terms-of-use), [rate limits](https://anilist.gitbook.io/anilist-apiv2-docs/docs/guide/rate-limiting).

## Cache i awarie

- wynik wyszukiwania jest buforowany w PostgreSQL przez `CATALOG_CACHE_TTL_SECONDS`,
- profil i biblioteka korzystają wyłącznie z lokalnych rekordów,
- timeout jest ustawiany przez `CATALOG_TIMEOUT_MS`,
- awaria pojedynczego dostawcy nie usuwa danych i nie unieważnia odpowiedzi pozostałych,
- ręczne odświeżenie aktualizuje tytuły, opisy, obrazy i bieżące sezony, ale nigdy migawki wydarzeń ani wcześniej rozpoczętych cykli,
- zewnętrzne tokeny nie trafiają do klienta ani odpowiedzi API.
