# Przyjęte założenia

1. Robocza nazwa `MediaTracker` jest domyślna. Produkcyjna nazwa pochodzi z `APP_NAME`; nie jest zaszyta w logice domenowej.
2. Interfejs nie ma prefiksu języka w URL. Język jest zapisywany w `UserSettings.locale` oraz w ciasteczku `locale`; polski jest wartością domyślną.
3. Daty są zapisywane jako UTC w PostgreSQL. Strefa użytkownika służy do prezentacji i późniejszego wprowadzania dat lokalnych.
4. Ręczny wpis należy do tworzącego użytkownika i znika kaskadowo wraz z nim. Nie jest zwracany w globalnym katalogu ani publicznym API innego użytkownika.
5. Usunięcie globalnego wpisu biblioteki nie usuwa historii oglądania. Ponowne dodanie tej samej produkcji przywraca dostęp do historii. Usunięcie ręcznego wpisu usuwa także jego historię, ponieważ rekord nie jest współdzielony.
6. Sezon 0 jest specjalny i domyślnie nie trafia do migawki wymaganych sezonów. Można rozpocząć cykl z włączonymi specjalnymi sezonami przez API.
7. Zdarzenie bez daty ma `watchedAt = NULL` i `watchedAtUnknown = true`; liczy się do sum, lecz nie do miesięcy i lat.
8. TMDB jest głównym katalogiem. Bez `TMDB_API_TOKEN` aplikacja uruchamia się normalnie, a ręczne wpisy nadal działają.
9. Aktualne warunki AniList zabraniają bez zgody użycia API w konkurencyjnym trackerze. Adapter jest zatem domyślnie wyłączony i wymaga jednocześnie `ANILIST_ENABLED=true` oraz świadomego `ANILIST_TERMS_ACCEPTED=true`. Administrator odpowiada za uzyskanie wymaganej zgody.
10. Automatyczne dopasowanie TMDB ↔ AniList nie jest wykonywane po samym tytule. Identyfikatory są unikalne w obrębie dostawcy, a niepewne rekordy pozostają osobnymi wynikami.
11. Limity logowania, rejestracji i katalogu są utrzymywane w PostgreSQL. `TRUST_PROXY=true` należy ustawić wyłącznie za poprawnie skonfigurowanym, zaufanym reverse proxy.
12. Seed zawiera wyłącznie dane deweloperskie i odmawia działania przy `NODE_ENV=production`.
13. Ręczna korekta czasu sezonu jest prywatnym nadpisaniem użytkownika. Nie modyfikuje wspólnych danych katalogowych ani obliczeń innych kont; historyczne wydarzenia nadal zachowują wcześniejszą migawkę.
