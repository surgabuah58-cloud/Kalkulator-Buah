# Surga Buah — Platform Context untuk AI Agent

> File ini dibuat untuk membantu AI agent berikutnya memahami konteks platform secara cepat.
> Update file ini setiap kali ada perubahan besar.

---

## Identitas Proyek

| Item | Value |
|------|-------|
| Nama | Surga Buah — Supply Chain & Pricing Dashboard |
| Tujuan | Platform manajemen pembelian, sortir, dan penjualan buah (B2B distribution) |
| Vercel Project | `surga-buah` |
| Vercel Alias | https://surga-buah.vercel.app |
| Vercel Account | `katalaras-projects` |
| GitHub Repo | `surgabuah58-cloud/Kalkulator-Buah` |
| Branch | `master` |
| Last Deployed Commit | `a735b1c` (fix: schema idempotent) |

---

## Tech Stack

| Layer | Teknologi | Versi |
|-------|-----------|-------|
| Framework | Next.js App Router | 16.2.3 |
| Runtime | React | 19.2.4 |
| Language | TypeScript (strict) | — |
| Bundler | Turbopack (via `next.config.ts`) | — |
| Database | Supabase (PostgreSQL + RLS) | `@supabase/supabase-js ^2.103` |
| UI Components | shadcn/ui **on Base UI** (NOT Radix) | `@base-ui/react ^1.3` |
| Styling | Tailwind CSS v4 | — |
| Forms | React Hook Form + zodResolver | `^7.72` + `^5.2` |
| Validation | Zod v4 | `^4.3` |
| Toast | Sonner | `^2.0` |
| Icons | Lucide React | `^1.8` |
| Theming | next-themes | `^0.4` |

### Konfigurasi Penting
```ts
// next.config.ts
const nextConfig: NextConfig = {
  turbopack: { root: __dirname },
}
```
```json
// vercel.json
{ "framework": "nextjs" }
```

---

## Environment Variables

```env
# .env.local (dan Vercel env vars)
NEXT_PUBLIC_SUPABASE_URL=https://sdaufrgkegahyqfzksrh.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNkYXVmcmdrZWdhaHlxZnprc3JoIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzU3MTc1OTQsImV4cCI6MjA5MTI5MzU5NH0.10NN47jnnEOlPM5mgKtiQ3B5V0P4VhHyOadN51qwWLc
```

---

## Aturan Kritis untuk Coding (JANGAN DILANGGAR)

### shadcn / Base UI
- `SelectContent` harus pakai `alignItemWithTrigger={false}` — **BUKAN** `position="popper"`
- Base UI ≠ Radix UI — props berbeda

### Zod v4
- `z.enum([...] as const, { error: 'msg' })` — sintaks v4
- **JANGAN** kombinasikan `.optional().default()` — merusak RHF resolver type inference
- Pakai `.default()` saja ATAU tidak pakai sama sekali (atur di `useForm defaultValues`)

### React Hook Form
- `valueAsNumber: true` untuk input angka yang diregister langsung ke RHF
- Untuk input angka yang punya edge case (desimal bebas), gunakan **local state** + `step="any"` bukan RHF register

### Input Angka dengan Desimal Bebas
```tsx
// Pattern yang benar untuk input desimal bebas (e.g. spare buffer):
const [rawValue, setRawValue] = useState('')
<Input type="number" step="any" value={rawValue} onChange={e => setRawValue(e.target.value)} />
// Lalu parseFloat(rawValue) saat submit / useMemo
```

### File Structure
```
app/                    # Next.js App Router pages
components/
  layout/               # AppSidebar, AppHeader, LayoutShell, SeasonToggle
  ui/                   # shadcn components
context/                # SeasonContext (musim kemarau/hujan toggle)
lib/
  calculations/hpp.ts   # formatRupiahFull, formatKg, formatPersen, calculateHpp
  supabase/client.ts    # createClient()
types/
  database.types.ts     # Semua Database types + convenience exports
supabase/
  schema.sql            # Full schema (idempotent, aman dijalankan ulang)
_context/               # Folder ini — dokumentasi untuk AI agent
```

---

## Deployment Workflow
```bash
git add <files>
git commit -m "feat/fix: ..."
git push origin master
# Vercel auto-deploy dari master
```
