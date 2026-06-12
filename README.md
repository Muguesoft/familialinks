# 🔗 FamiliaLinks — PWA Familiar de Links Compartidos

App web progresiva para guardar y organizar links desde Instagram, TikTok, Facebook, YouTube y cualquier web — compartidos entre toda la familia, con búsqueda rápida y análisis automático con IA.

---

## 🚀 Puesta en marcha paso a paso

### 1. Crear el proyecto en Firebase

1. Ir a [https://console.firebase.google.com](https://console.firebase.google.com)
2. Clic en **"Agregar proyecto"** → nombre: `familialinks`
3. Desactivar Google Analytics (no es necesario) → **Crear proyecto**

### 2. Habilitar Firestore Database

1. En el menú lateral: **Build → Firestore Database**
2. Clic en **"Crear base de datos"**
3. Elegir **modo producción** (se configuran las reglas abajo)
4. Seleccionar región: `us-east1` (o la más cercana)

### 3. Habilitar Authentication anónima

1. En el menú lateral: **Build → Authentication**
2. Clic en **"Comenzar"**
3. Ir a la pestaña **"Sign-in method"**
4. Habilitar **"Anónimo"** → Guardar

### 4. Obtener la configuración de la app

1. En la página de inicio del proyecto, clic en **"</>"** (Agregar app web)
2. Nombre: `familialinks-web` → **Registrar app**
3. Copiar el objeto `firebaseConfig` que aparece

### 5. Configurar el archivo de Firebase

Abrir `js/firebase-config.js` y reemplazar los valores:

```javascript
const firebaseConfig = {
  apiKey: "AIza...",
  authDomain: "familialinks-xxxxx.firebaseapp.com",
  projectId: "familialinks-xxxxx",
  storageBucket: "familialinks-xxxxx.appspot.com",
  messagingSenderId: "123456789",
  appId: "1:123456789:web:abc123"
};
```

### 6. Configurar reglas de seguridad de Firestore

En Firebase Console → Firestore → **Reglas**, pegar esto:

```
rules_version = '2';
service cloud.firestore {
  match /databases/{database}/documents {
    // Cualquier usuario autenticado (anónimo) puede leer y escribir
    match /{document=**} {
      allow read, write: if request.auth != null;
    }
  }
}
```

Clic en **Publicar**.

---

## 📦 Publicar en GitHub Pages

### Primera vez

```bash
# 1. Crear repositorio en GitHub (ej: familialinks)
# 2. Clonar y subir archivos
git init
git add .
git commit -m "FamiliaLinks v1"
git branch -M main
git remote add origin https://github.com/TU_USUARIO/familialinks.git
git push -u origin main
```

### Activar GitHub Pages

1. En el repositorio → **Settings → Pages**
2. Source: **Deploy from a branch**
3. Branch: `main` / `/ (root)` → **Save**
4. En unos minutos la app estará en: `https://TU_USUARIO.github.io/familialinks/`

### Actualizaciones futuras

```bash
git add .
git commit -m "Descripción del cambio"
git push
```

---

## 📱 Instalar como app en el celular

**Android (Chrome):**
1. Abrir la URL en Chrome
2. Menú (⋮) → **"Agregar a pantalla de inicio"**

**iPhone (Safari):**
1. Abrir la URL en Safari
2. Botón compartir → **"Agregar a pantalla de inicio"**

---

## 🗂️ Estructura del proyecto

```
familialinks/
├── index.html          ← App principal
├── manifest.json       ← Configuración PWA
├── sw.js               ← Service Worker (offline)
├── icon.svg            ← Ícono de la app
├── css/
│   └── style.css       ← Estilos completos
└── js/
    ├── firebase-config.js  ← ⚠️ Configurar con tus datos
    └── app.js              ← Lógica principal
```

---

## ✨ Funcionalidades

- **Multi-usuario familiar** — cada integrante tiene su perfil con color propio
- **Análisis con IA** — pegás un link y la IA sugiere título, descripción, categoría y tags
- **Categorías personalizables** — con emoji propio (Recetas, Tragos, Turismo, etc.)
- **Filtros** — por categoría, plataforma, miembro de la familia y tags
- **Búsqueda** — por título, descripción o tags
- **Tiempo real** — todos ven los cambios al instante (Firebase)
- **PWA** — instalable en el celular como app nativa
- **Modo oscuro** — automático según el sistema
- **Responsive** — funciona en celular, tablet y desktop

---

## 🔒 Seguridad

La app usa autenticación anónima de Firebase: cada dispositivo recibe un token único sin necesidad de email o contraseña. Los links son accesibles para cualquier usuario autenticado de tu proyecto (el proyecto es privado — solo quien tenga la URL de tu GitHub Pages puede acceder).

Para mayor seguridad en el futuro se puede agregar autenticación por Google o email.
