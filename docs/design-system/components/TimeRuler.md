# TimeRuler

La règle graduée, motif de la marque et axe du temps de Tracker.

Elle se compose d'une trame millimétrée `grid` au pas de 8 px, de repères horaires en `ink` avec leur libellé mono, de marques d'événements colorées selon leur statut, et de l'aiguille `needle` surmontée d'un surligneur « now ».

- On la trouve en tête de Timeline et de Streamline, et sous le graphique de vélocité. Les graduations doivent toujours correspondre aux données affichées dessous.
- `startHour` et `endHour` définissent la fenêtre en heures (`from` et `to` restent acceptés comme alias, mais `from` est réservé sur `x-import` : utilisez `start-hour` et `end-hour` dans un canevas). `now` place l'aiguille au format `HH:MM`, et `marks` place les événements.
- Ce n'est pas un élément décoratif : on ne l'utilise pas dans un en-tête sans données temporelles.
