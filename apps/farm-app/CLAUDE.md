# Farm App — Instructions Claude Code

## Stack technique

| Couche | Tech |
|---|---|
| Frontend | Next.js 14 (App Router), TypeScript, Tailwind CSS 3 |
| Backend | FastAPI, SQLAlchemy 2.0, Pydantic v2, Alembic |
| Base de données | PostgreSQL 15 |
| Auth | JWT Bearer (python-jose + passlib/bcrypt) |
| Icons | Lucide React |
| HTTP Client | Axios avec intercepteurs JWT auto |
| DevOps | Docker Compose, Uvicorn |

## Design System

### Palette de couleurs
- **Primary** : `emerald-600` / `emerald-700` pour CTAs et accents
- **Neutrals** : `slate-50` → `slate-800`
- **Danger** : `red-500` / `red-50`
- **Warning** : `amber-500` / `amber-50`
- **Success** : `green-600` / `green-50`

### Composants UI récurrents
```tsx
// Input standard
const INPUT = 'w-full border border-slate-200 bg-slate-50 rounded-xl px-3 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-emerald-500/20 focus:border-emerald-400 focus:bg-white transition'

// Carte
<div className="bg-white rounded-2xl shadow-sm border border-slate-100">

// Bouton primary
<button className="bg-emerald-600 hover:bg-emerald-700 text-white px-4 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm">

// Gradient header de carte
<div className="bg-gradient-to-r from-emerald-700 to-green-600 px-6 py-5">

// Modal overlay
<div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
  <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md modal-enter">
```

### Layout
- **Desktop** : sidebar fixe (md:ml-64) + contenu principal
- **Mobile** : bottom navigation bar, pb-24 pour éviter le chevauchement
- **Responsive** : toujours mobile-first

## Pattern Modal (OBLIGATOIRE)

Chaque page avec formulaire de création/édition doit suivre ce pattern exact :

```tsx
// 1. States requis
const [showForm, setShowForm] = useState(false)
const [form, setForm] = useState({ /* champs */ })
const [submitting, setSubmitting] = useState(false)
const [formError, setFormError] = useState<string | null>(null)

// 2. Handler avec error handling
const handleSubmit = async (e: React.FormEvent) => {
  e.preventDefault()
  setSubmitting(true)
  setFormError(null)
  try {
    await api.post('/endpoint/', { /* data */ })
    setShowForm(false)
    setForm({ /* reset */ })
    loadData()
  } catch (err: any) {
    setFormError(err?.response?.data?.detail || 'Erreur lors de la création')
  } finally {
    setSubmitting(false)
  }
}

// 3. Modal JSX (en bas du return, avant la fermeture du wrapper)
{showForm && (
  <div className="fixed inset-0 bg-black/40 backdrop-blur-sm flex items-center justify-center z-50 p-4">
    <div className="bg-white rounded-2xl shadow-2xl w-full max-w-md modal-enter">
      <div className="flex items-center justify-between px-6 pt-6 pb-4 border-b border-slate-100">
        <h2 className="text-base font-bold text-slate-800">Titre du modal</h2>
        <button onClick={() => setShowForm(false)} className="text-slate-400 hover:text-slate-600 transition">
          <X size={20} />
        </button>
      </div>
      {formError && (
        <p className="mx-6 mt-4 text-sm text-red-600 bg-red-50 border border-red-200 rounded-xl px-4 py-3">{formError}</p>
      )}
      <form onSubmit={handleSubmit} className="p-6 space-y-4">
        {/* champs */}
        <div className="flex gap-3 pt-1">
          <button type="button" onClick={() => setShowForm(false)} className="flex-1 border border-slate-200 text-slate-600 py-2.5 rounded-xl text-sm font-medium hover:bg-slate-50 transition">Annuler</button>
          <button type="submit" disabled={submitting} className="flex-1 bg-emerald-600 hover:bg-emerald-700 disabled:opacity-60 text-white py-2.5 rounded-xl text-sm font-semibold transition shadow-sm">
            {submitting ? 'Enregistrement...' : 'Créer'}
          </button>
        </div>
      </form>
    </div>
  </div>
)}
```

**Référence implémentation complète** : `frontend/src/app/parcelles/page.tsx` lignes 177-244

## Règles CORS

- Backend lit `FRONTEND_URL` depuis l'env → valeur dans `docker-compose.yml` service `backend`
- Frontend lit `NEXT_PUBLIC_API_URL` → valeur dans `docker-compose.yml` service `frontend`
- En dev local : `FRONTEND_URL=http://localhost:3000`, `NEXT_PUBLIC_API_URL=http://localhost:8000`
- Ne jamais hardcoder des URLs dans le code — tout passe par les variables d'env

## Auth

- Token JWT stocké dans `localStorage` sous la clé `farm_token`
- Intercepteur Axios dans `frontend/src/lib/api.ts` injecte automatiquement `Authorization: Bearer <token>`
- Sur 401, redirect automatique vers `/login`
- Backend : dépendance `get_current_user` dans chaque router protégé

## Nommage (tout en français)

`ferme`, `parcelle`, `récolte`, `stock`, `traitement`

## Structure des routers backend

Chaque router suit le pattern CRUD :
```python
GET    /ressources/          → list (all for user)
POST   /ressources/          → create
GET    /ressources/{id}      → read
PUT    /ressources/{id}      → update
DELETE /ressources/{id}      → delete
```

## Migrations base de données

Toujours utiliser Alembic pour les changements de schéma :
```bash
docker-compose exec backend alembic revision --autogenerate -m "description"
docker-compose exec backend alembic upgrade head
```

## Commandes utiles

```bash
# Lancer l'application
docker-compose up --build

# Logs en temps réel
docker-compose logs -f backend
docker-compose logs -f frontend

# Accéder à la DB
docker-compose exec db psql -U farmuser -d farmdb
```
