# Farm App — Skills & Capacités

Ce fichier liste tous les skills techniques disponibles pour développer et améliorer l'application farm-app avec un **effet waou**.

---

## FRONTEND

### Next.js 14 App Router
- Pages dans `frontend/src/app/`
- Layouts imbriqués, navigation client
- `'use client'` pour les composants interactifs
- `useRouter` pour la navigation programmatique
- `Link` pour la navigation déclarative

### TypeScript
- Interfaces pour les types API (ex: `DashboardFerme`, `Parcelle`)
- Types stricts sur les props des composants
- `React.FormEvent`, `React.ReactNode` pour les events/JSX

### Tailwind CSS (thème custom emerald/slate)
- Palette : emerald (CTA), slate (texte/fond), red (erreur), amber (warning), orange (récolte)
- Utilitaires : `rounded-2xl`, `shadow-sm`, `border-slate-100`, `backdrop-blur-sm`
- Responsive : `md:` prefix pour desktop
- Animations : `animate-spin` (loading spinner), `transition`, `hover:`, `focus:`
- Custom : `modal-enter` (animation d'entrée), `card-hover` (effet hover carte)

### Lucide React (icons)
```
Trees, Apple, Syringe, TriangleAlert, MapPin, Plus, X,
Leaf, Droplets, Package, Calendar, ChevronRight, Edit, Trash2,
ArrowLeft, Search, Filter, Download, Upload
```

### Axios + JWT
- Client configuré dans `frontend/src/lib/api.ts`
- Intercepteur request : injecte `Authorization: Bearer <token>` automatiquement
- Intercepteur response : redirect `/login` sur 401
- Usage : `api.get('/fermes/')`, `api.post('/parcelles/', data)`, etc.

### Formulaires
- Contrôlés avec `useState`
- Pattern complet : loading + error state (voir CLAUDE.md)
- Validation HTML5 native (`required`, `type="number"`, `step`)
- Feedback visuel : bouton disabled + "Enregistrement..." pendant soumission

### Modals
- Overlay `fixed inset-0` avec `backdrop-blur-sm`
- Fermeture : bouton X + clic en dehors possible
- Animation d'entrée : classe `modal-enter`
- Toujours : état `showForm`, `submitting`, `formError`

### Layout Responsive
- Desktop : sidebar fixe (Navbar) + `md:ml-64` sur le contenu
- Mobile : bottom navigation + `pb-24` pour éviter chevauchement
- Grilles : `grid-cols-1 lg:grid-cols-2`, `grid-cols-2` pour stats

---

## BACKEND

### FastAPI
- Routers dans `backend/app/routers/`
- Pattern CRUD complet (GET list, POST create, GET by id, PUT update, DELETE)
- Dépendances : `get_db` (session DB), `get_current_user` (auth JWT)
- Response models Pydantic : `response_model=schemas.XxxOut`
- HTTPException pour les erreurs : `raise HTTPException(status_code=404, detail="...")`

### SQLAlchemy 2.0
- Models dans `backend/app/models.py`
- Types : `Column(Integer)`, `Column(String(n))`, `Column(Float)`, `Column(DateTime)`
- Relations : `relationship("Parcelle", back_populates="ferme", cascade="all, delete-orphan")`
- Timestamps auto : `server_default=func.now()`
- Sessions : `db: Session = Depends(get_db)`

### Pydantic v2 Schemas
Pattern hiérarchique :
```python
class XxxBase(BaseModel): # champs communs
class XxxCreate(XxxBase): # pour POST (pas d'id)
class XxxUpdate(BaseModel): # pour PUT (tous optionnels)
class XxxOut(XxxBase):     # pour réponse (avec id, dates)
    class Config: from_attributes = True
```

### JWT Auth
- Token : `python-jose` avec HS256
- Hash : `passlib` avec bcrypt (4.0.1 pour compat)
- Dépendance : `user = Depends(get_current_user)` dans chaque endpoint protégé
- Login : route `/auth/login` retourne `access_token`

### Alembic Migrations
```bash
alembic revision --autogenerate -m "description"
alembic upgrade head
alembic downgrade -1
```

### Rate Limiting
- `slowapi` pour limiter les endpoints sensibles (ex: login)
- Usage : décorateur `@limiter.limit("5/minute")`

### CORS
- Configuré dans `main.py` via `CORSMiddleware`
- Origins depuis env `FRONTEND_URL`

---

## DEVOPS / DOCKER

### Docker Compose
- Services : `db` (PostgreSQL 15), `backend` (FastAPI/Uvicorn), `frontend` (Next.js)
- Variables d'env par service dans `docker-compose.yml`
- Health checks sur la DB avant le backend
- Volumes pour persistence DB

### PostgreSQL
- Image : `postgres:15-alpine`
- Connexion : `DATABASE_URL=postgresql://user:pass@db:5432/dbname`

### Déploiement
- Backend : `uvicorn app.main:app --host 0.0.0.0 --port 8000`
- Frontend : build Next.js standalone
- Production : Traefik reverse proxy + Let's Encrypt SSL

---

## DESIGN "EFFET WAOU"

### Visuels premium
- **Gradient headers** sur les cartes fermes : `from-emerald-700 to-green-600`
- **Stat cards** colorées par catégorie (vert parcelles, orange récoltes, rouge alertes)
- **Badges statut** avec couleurs sémantiques et arrondis `rounded-lg`
- **Icônes thématiques** agricoles (Trees, Apple, Leaf, Droplets)

### Micro-interactions
- `hover:shadow-md transition` sur les cartes
- `hover:bg-emerald-700` sur les boutons
- `focus:ring-2 focus:ring-emerald-500/20` sur les inputs
- Loading spinner : `border-t-emerald-500 animate-spin`

### Feedback utilisateur
- **Spinner** pendant le chargement initial
- **Erreur inline** dans le modal (bg-red-50 + texte rouge)
- **État vide** avec illustration et CTA (empty state)
- **Bouton disabled** avec opacité 60% pendant soumission

### Animations
- `modal-enter` : slide-up subtil à l'ouverture du modal
- `card-hover` : légère élévation au survol
- Transitions Tailwind : `transition`, `duration-200`

### Typographie
- Titres : `font-bold text-slate-800`
- Labels : `text-xs font-semibold text-slate-500 uppercase tracking-wider`
- Valeurs importantes : `text-lg font-bold`
- Descriptions : `text-sm text-slate-400`

---

## PATTERNS À RÉUTILISER

### Empty State
```tsx
<div className="bg-white rounded-2xl p-12 text-center shadow-sm border border-slate-100">
  <div className="w-16 h-16 bg-emerald-50 rounded-2xl flex items-center justify-center mx-auto mb-4">
    <IconHere size={28} className="text-emerald-400" />
  </div>
  <p className="font-semibold text-slate-600">Aucun élément</p>
  <p className="text-sm text-slate-400 mt-1 mb-4">Description action à faire.</p>
  <button onClick={() => setShowForm(true)} className="inline-flex items-center gap-2 bg-emerald-600 hover:bg-emerald-700 text-white px-5 py-2.5 rounded-xl text-sm font-semibold transition shadow-sm">
    <Plus size={16} /> Créer
  </button>
</div>
```

### Loading Spinner
```tsx
<div className="md:ml-64 min-h-screen flex items-center justify-center">
  <Navbar />
  <div className="flex flex-col items-center gap-3 text-slate-400">
    <div className="w-8 h-8 border-2 border-emerald-500/30 border-t-emerald-500 rounded-full animate-spin" />
    <span className="text-sm">Chargement...</span>
  </div>
</div>
```

### Badge Statut
```tsx
<span className={`text-xs font-semibold px-2.5 py-1 rounded-lg ${
  statut === 'actif' ? 'bg-emerald-100 text-emerald-700' :
  statut === 'repos' ? 'bg-amber-100 text-amber-700' :
  'bg-slate-100 text-slate-500'
}`}>{statut}</span>
```
