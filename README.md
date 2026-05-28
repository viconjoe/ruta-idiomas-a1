# Ruta Idiomas A1

Ruta Idiomas A1 es una biblioteca base de recursos pedagógicos digitales reutilizables para idiomas iniciales A1 y formación de personas adultas. Forma parte del ecosistema personal **El Formador Junior** como plantilla prudente, publicable y adaptable.

El primer recurso incluido es **Repaso Final Francés A1**, construido a partir del contenido y comportamiento del recurso anterior `repaso-frances-a1-fpe`, pero reorganizado como motor reutilizable con contenido externo en JSON.

## Principios

- HTML, CSS y JavaScript vanilla.
- Sin frameworks ni dependencias externas.
- Sin backend, login, base de datos ni analítica.
- Sin recogida ni envío de datos personales.
- Progreso guardado solo en `localStorage` del navegador.
- Contenido pedagógico en JSON externo.
- Publicable en GitHub Pages sin configuración adicional.

## Estructura

```text
Ruta Idiomas A1/
├── index.html
├── README.md
├── LICENSE.md
├── manifest.webmanifest
├── sw.js
├── engine/
│   └── formador-engine.js
├── shared/
│   ├── css/
│   │   └── formador.css
│   └── assets/
│       └── icons/
├── resources/
│   └── frances-a1/
│       ├── index.html
│       ├── content.json
│       ├── manifest.webmanifest
│       └── assets/
│           ├── audio/
│           └── pictogramas/
└── template/
    ├── index.html
    └── content.json
```

## Añadir un nuevo recurso

1. Copia la carpeta `template/` dentro de `resources/` con un nombre estable, por ejemplo `italiano-a1`.
2. Cambia el `resourceId`, `contentPath`, `lang` y `title` en el `index.html` del recurso.
3. Completa el `content.json` con metadatos y bloques pedagógicos.
4. Añade el recurso a la lista de la página raíz `index.html`.
5. Mantén preguntas, textos, situaciones, feedback, audios y prompts dentro del JSON, no en HTML ni en JS.

Consulta también `docs/guia-crear-recursos-a1.md` y `docs/guia-crear-recursos-a1.html` para una guía breve de adaptación.

## Privacidad

El proyecto está diseñado con privacidad por defecto. No utiliza servicios externos, no envía datos a servidores y no solicita datos personales. El progreso, checklist y producción escrita quedan únicamente en el navegador de la persona usuaria mediante `localStorage`.

En dispositivos compartidos conviene borrar el progreso local al finalizar. El motor no incluye grabación en esta primera versión.

## Publicación en GitHub Pages

Sube el contenido del repositorio a GitHub y activa GitHub Pages desde la rama principal. No requiere compilación ni configuración especial: `index.html` es la entrada de la biblioteca y cada recurso tiene su propio `index.html`.

## Relación con El Formador Junior

Ruta Idiomas A1 es un proyecto personal y complementario de Joel Concepción Villanueva dentro de El Formador Junior. No es un recurso oficial, no tiene vínculo institucional directo con ICSE ni SCE y no sustituye programación docente, materiales oficiales ni evaluación oficial.

## Licencias

- Código: MIT.
- Contenidos pedagógicos: CC BY-NC-SA 4.0.



