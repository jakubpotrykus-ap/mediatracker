# MediaTracker

Samodzielnie hostowana, wieloużytkownikowa aplikacja do śledzenia filmów, seriali i anime. Rejestruje niezmienne wydarzenia pełnych obejrzeń filmów oraz sezonowe cykle seriali, dzięki czemu czas i historyczne ukończenia nie zmieniają się po aktualizacji katalogu.

## Najważniejsze widoki

- spokojny, ciemny dashboard z kartami statystyk, wykresem miesięcznym i bieżącą biblioteką,
- responsywna wyszukiwarka TMDB/AniList z filtrami i ręcznym wpisem,
- lokalnie filtrowana biblioteka z systemowym statusem i prywatnymi etykietami,
- szczegóły filmu z wielokrotnymi wydarzeniami oraz szczegóły serialu z cyklami i sezonami,
- osobne ustawienia publiczności profilu, statystyk i biblioteki,
- publiczny profil `/u/nazwa-uzytkownika`, który nigdy nie ujawnia e-maila ani etykiet.

Interfejs jest mobile-first: na telefonie używa dolnej nawigacji, a filtry i formularze nie wymagają poziomego przewijania.

## Funkcje i stos

Next.js 16.2 LTS, React 19.2, TypeScript strict, Tailwind CSS 4, next-intl, PostgreSQL 17, Prisma 7, Auth.js, Argon2id, Zod, Vitest i Playwright. Produkcja korzysta z wieloetapowego obrazu Node 24 Alpine w trybie `standalone` i osobnego celu migracyjnego.

Pełne decyzje techniczne i ERD: [docs/architecture.md](docs/architecture.md). Założenia, w tym ograniczenie AniList: [docs/assumptions.md](docs/assumptions.md).

## Uruchomienie deweloperskie

Wymagania: Node.js 24+, pnpm 11, PostgreSQL 15+ (zalecany 17).

```bash
cp .env.example .env
# W .env zmień host bazy z db na localhost, ustaw hasła i AUTH_SECRET.
corepack enable
pnpm install --frozen-lockfile
pnpm db:generate
pnpm db:migrate --name initial
pnpm db:seed       # opcjonalnie: demo / DemoPassword123!
pnpm dev
```

Otwórz `http://localhost:3000`. Seed działa wyłącznie poza produkcją i dodaje dwa oddzielne konta demonstracyjne.

## Zmienne środowiskowe

Skopiuj `.env.example`. Wymagane w produkcji:

- `DATABASE_URL` — URL PostgreSQL; w Compose hostem jest `db`,
- `POSTGRES_PASSWORD` — długie losowe hasło bazy,
- `AUTH_SECRET` — co najmniej 32 losowe bajty, np. `openssl rand -base64 48`,
- `APP_URL` i `NEXTAUTH_URL` — pełny publiczny URL, po HTTPS np. `https://media.example.com`.

Najważniejsze opcjonalne:

- `APP_NAME`, `APP_PORT`, `ALLOW_REGISTRATION`, `TRUST_PROXY`,
- `TMDB_API_TOKEN` — serwerowy Read Access Token; bez niego działa ręczne dodawanie,
- `ANILIST_ENABLED` i `ANILIST_TERMS_ACCEPTED` — pozostaw `false` bez wymaganej zgody,
- `CATALOG_TIMEOUT_MS`, `CATALOG_CACHE_TTL_SECONDS`, `METADATA_STALE_DAYS`,
- `CATALOG_TEST_MODE=true` — wyłącznie lokalny adapter fixture dla E2E.

Nigdy nie commituj `.env`.

## Docker Compose

```bash
cp .env.example .env
# ustaw POSTGRES_PASSWORD, zgodne DATABASE_URL, AUTH_SECRET oraz publiczny APP_URL
docker compose config
docker compose up -d --build
docker compose ps
curl -fsS http://localhost:${APP_PORT:-3000}/api/health
```

`migrate` kończy się po `prisma migrate deploy`; `app` startuje dopiero po zdrowej bazie i udanej migracji. Dane pozostają w nazwanym wolumenie `mediatracker_postgres_data` po restarcie i odtworzeniu kontenerów.

## Debian 12/13 w VM Proxmox

Zalecane minimum VM: 2 vCPU, 2 GiB RAM (4 GiB dla wygodnego budowania), 20 GiB dysku, stały adres IP i aktualny Debian. Snapshot Proxmoxa nie zastępuje logicznego backupu PostgreSQL.

### 1. Oficjalna instalacja Docker Engine i Compose

Poniższe polecenia odpowiadają aktualnej [oficjalnej instrukcji Dockera dla Debiana](https://docs.docker.com/engine/install/debian/):

```bash
sudo apt update
sudo apt install -y ca-certificates curl git
sudo install -m 0755 -d /etc/apt/keyrings
sudo curl -fsSL https://download.docker.com/linux/debian/gpg -o /etc/apt/keyrings/docker.asc
sudo chmod a+r /etc/apt/keyrings/docker.asc
sudo tee /etc/apt/sources.list.d/docker.sources >/dev/null <<EOF
Types: deb
URIs: https://download.docker.com/linux/debian
Suites: $(. /etc/os-release && echo "$VERSION_CODENAME")
Components: stable
Architectures: $(dpkg --print-architecture)
Signed-By: /etc/apt/keyrings/docker.asc
EOF
sudo apt update
sudo apt install -y docker-ce docker-ce-cli containerd.io docker-buildx-plugin docker-compose-plugin
sudo systemctl enable --now docker
sudo docker run --rm hello-world
```

Opcjonalnie dodaj operatora do grupy `docker`, wyloguj i zaloguj go ponownie: `sudo usermod -aG docker "$USER"`. Członkostwo tej grupy daje uprawnienia równoważne root.

### 2. Pobranie i konfiguracja

```bash
git clone ADRES_REPOZYTORIUM.git /opt/mediatracker
cd /opt/mediatracker
cp .env.example .env
openssl rand -base64 48   # wynik wklej jako AUTH_SECRET
openssl rand -base64 36   # wynik wklej jako POSTGRES_PASSWORD
chmod 600 .env
```

Zakoduj znaki specjalne hasła w `DATABASE_URL` lub wygeneruj hasło alfanumeryczne. Ustaw `APP_URL`, opcjonalny `TMDB_API_TOKEN` i `ALLOW_REGISTRATION`. `DATABASE_URL` wewnątrz Compose musi wskazywać `db:5432`.

### 3. Start, zdrowie i logi

```bash
docker compose config
docker compose up -d --build
docker compose ps
docker compose logs migrate
docker compose logs -f --tail=200 app
curl -fsS http://127.0.0.1:3000/api/health
```

Poprawna odpowiedź health zawiera `"status":"ok"` i `"database":"ok"`.

### 4. Aktualizacja i zatrzymanie

```bash
./scripts/backup-db.sh backups/before-update.sql.gz
git pull --ff-only
docker compose up -d --build
docker compose ps
```

Zatrzymanie bez usuwania danych: `docker compose stop`. Usunięcie kontenerów przy zachowaniu wolumenu: `docker compose down`. Nie używaj `docker compose down -v`, chyba że świadomie chcesz trwale usunąć bazę.

### 5. Backup i odtworzenie

```bash
mkdir -p backups
./scripts/backup-db.sh backups/mediatracker-$(date +%F).sql.gz

docker compose stop app
./scripts/restore-db.sh backups/mediatracker-2026-08-13.sql.gz RESTORE
docker compose start app
curl -fsS http://127.0.0.1:3000/api/health
```

Skrypt backupu odmawia nadpisania pliku. Restore wymaga jawnego słowa `RESTORE`, sprawdza gzip i zatrzymuje się na pierwszym błędzie SQL. Kopie przenieś także poza VM.

Trwałe dane bazy są w wolumenie Docker `mediatracker_postgres_data` (fizycznie pod zarządzaniem Dockera, zwykle `/var/lib/docker/volumes/`). Konfiguracja i sekrety są w `/opt/mediatracker/.env`; backupy w wybranym katalogu operatora.

### 6. Domena i HTTPS

Podstawowe uruchomienie działa bez proxy na `APP_PORT`. Dla Internetu ustaw DNS domeny na VM, otwórz 80/443 i postaw proxy. Najprostszy Caddyfile:

```caddyfile
media.example.com {
  reverse_proxy 127.0.0.1:3000
}
```

Ustaw potem `APP_URL=https://media.example.com`, `NEXTAUTH_URL` tak samo i `TRUST_PROXY=true`, a następnie odtwórz kontener aplikacji. Nginx Proxy Manager może wskazywać `IP_VM:3000` i wystawić certyfikat Let's Encrypt. Traefik można dołączyć do tej samej sieci i kierować ruch do `app:3000`; żadna z tych opcji nie jest wymagana do startu lokalnego.

## Migracje i jakość

```bash
pnpm db:validate
pnpm db:generate
pnpm db:migrate --name opis_zmiany   # rozwój
pnpm db:deploy                        # produkcja
pnpm lint
pnpm typecheck
pnpm test
pnpm build
```

E2E nie wywołuje TMDB/AniList. Uruchom PostgreSQL, ustaw `CATALOG_TEST_MODE=true`, zastosuj migracje, uruchom aplikację, a potem:

```bash
pnpm exec playwright install chromium
pnpm test:e2e
```

## Typowe problemy

- `TMDB_NOT_CONFIGURED`: ustaw token lub skorzystaj z formularza ręcznego.
- `database: unavailable`: sprawdź `docker compose ps db`, URL i logi bazy.
- migracja nie kończy się powodzeniem: `docker compose logs migrate`; aplikacja celowo nie wystartuje przed migracją.
- pętla logowania za proxy: `APP_URL` i `NEXTAUTH_URL` muszą dokładnie odpowiadać publicznemu HTTPS.
- `429`: poczekaj zgodnie z limitem; aplikacja nie omija limitów dostawców.
- po zmianie hasła sesja wygasa celowo i wymaga ponownego logowania.

## Zakres

MVP świadomie nie zawiera ocen, recenzji, komentarzy, śledzenia odcinków, wiadomości, płatności, rekomendacji AI ani integracji streamingowych.
