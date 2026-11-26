# Staff Timetable — Web App + Android APK

Pengurusan jadual kerja staf mingguan (Leader, Cashier, Forecourt, Off Duty; Morning 6.30 AM – 3.00 PM, Afternoon 2.30 PM – 11.00 PM).
Satu kod sumber → Web App (PWA, GitHub Pages) dan Android APK (Capacitor). Kedua-duanya guna database Supabase yang sama.

## Langkah 1 — Sediakan database Supabase (sekali sahaja)
1. Buka https://supabase.com → log masuk → **New project** (nama: `staff-timetable`, region: Singapore).
2. Menu kiri **SQL Editor** → **New query** → tampal semua isi fail `supabase/schema.sql` → **Run**.
3. Menu **Authentication → Sign In / Providers → Email**: matikan **Confirm email** (supaya boleh terus log masuk).
4. Menu **Project Settings → API**: salin **Project URL** dan **anon public key**.
5. Buka fail `src/lib/config.ts` dan tampal kedua-duanya (atau isi dalam app: Settings → Database).
6. Dalam app: Settings → Database → isi e-mel & kata laluan → **Daftar akaun** (sekali), selepas itu **Log masuk** dengan akaun yang sama di Web App dan APK.

## Langkah 2 — GitHub (bina APK & Web App automatik)
1. https://github.com/new → nama repo `StaffTimetable` → Public → **Create repository**.
2. Muat naik semua fail projek (kecuali folder `node_modules` dan `dist`).
3. Repo → **Settings → Pages → Source: GitHub Actions**.
4. Tab **Actions** → tunggu ✅ hijau (±5 minit).
   - APK: tab **Releases** → `StaffTimetable-v1.0.x.apk`
   - Web App: `https://mohdrozaimi205.github.io/StaffTimetable/`

## Bina APK di Android Studio (pilihan)
```
npm install
npm run build
npx cap sync android
```
Kemudian buka folder `android` dalam Android Studio → **Build → Build APK(s)**.

## Struktur kod
- `src/lib/logic.ts` — kiraan kuota, pengesanan nama bertindih, tarikh
- `src/lib/store.ts` — data, cache luar talian & penyelarasan Supabase (realtime)
- `src/lib/export.ts`, `src/lib/grid.ts` — PDF, Excel, Print, Share, Backup
- `src/pages/*` — Home, Timetable, Staff, Pool, Settings
- `android/.../PrinterPlugin.java` — cetak A4 Landscape di Android
- `tests/` — ujian automatik (`npm test`)
