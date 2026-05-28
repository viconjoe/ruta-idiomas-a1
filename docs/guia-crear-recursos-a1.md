# Guía para crear nuevos recursos A1

Esta guía resume cómo añadir un nuevo idioma o recurso A1 sin tocar el motor común.

## Flujo recomendado

1. Copia `template/` dentro de `resources/`.
2. Renombra la carpeta con un identificador estable, por ejemplo `italiano-a1` o `ingles-a1`.
3. Edita el `index.html` del nuevo recurso:
   - `resourceId`
   - `contentPath`
   - `lang`
   - `title`
4. Completa `content.json` con datos pedagógicos.
5. Añade una tarjeta en el `index.html` raíz para que el alumnado pueda elegir el recurso.

## Regla principal

El contenido pedagógico debe vivir en JSON:

- preguntas;
- opciones;
- respuestas correctas;
- feedback;
- flashcards;
- textos;
- audiciones;
- situaciones;
- prácticas orales;
- prompts de producción.

No pongas contenido pedagógico en HTML ni en JavaScript. El motor debe seguir sirviendo para cualquier idioma A1.

## Privacidad

Cada recurso debe mantener estas reglas:

- sin login;
- sin analítica;
- sin backend;
- sin bases de datos;
- sin envío de datos personales;
- progreso local solo en el navegador.

## Comprobaciones antes de publicar

1. El JSON es válido.
2. El recurso carga desde un servidor estático.
3. No hay enlaces a dependencias externas.
4. La portada raíz enlaza al nuevo recurso.
5. El contenido se entiende en móvil y escritorio.
