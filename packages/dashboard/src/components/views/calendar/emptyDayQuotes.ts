/**
 * Funny German quotes for empty calendar days.
 * Shown randomly when there are no events scheduled.
 */
export const emptyDayQuotes: string[] = [
  'Dein Kalender hat heute frei – du auch.',
  'Null Termine. Maximum Chillen.',
  'Heute: professionell nichts tun.',
  'Der Kalender schweigt. Verdächtig.',
  'Keine Meetings. Kein Drama. Kein Problem.',
  'Terminplan: Sofa → Kühlschrank → Sofa.',
  'Heute bist du dein eigener Chef. Gib dir frei.',
  'Error 404: Termine nicht gefunden.',
  'Dein heutiger Zeitplan: ¯\\_(ツ)_/¯',
  'Alexa, spiel den Soundtrack für Nichtstun.',
  'Der Tag gehört dir. Mach was Schönes draus.',
  'Plot Twist: Heute passiert einfach nichts.',
  'Kalender leer. Seele voll.',
  'Heute darfst du offiziell vergessen, welcher Tag es ist.',
  'Breaking News: Nichts los hier.',
  'Du hast heute mehr Freizeit als ein Kaktus.',
  'Termin-Detox: Tag 1.',
  'Willkommen im Land der unbegrenzten Faulheit.',
  'Dein Kalender sagt: gönn dir.',
  'Keine Termine – nur Vibes.',
  'Heute ist der perfekte Tag für spontanen Unsinn.',
  'Die To-Do-Liste hat heute Urlaub.',
  'Stresslevel: Hängematte.',
  'Heute regiert das Chaos der Planlosigkeit.',
  'Dein Terminkalender wünscht gute Erholung.',
  'Nichts tun ist auch ein Talent.',
  'Heute: vom Bett zur Couch und zurück.',
  'Loading Termine... Nope, nichts da.',
  'Produktivität? Morgen vielleicht.',
  'Der einzige Termin heute: Snacks.',
];

/** Pick a random quote from the collection */
export function getRandomQuote(): string {
  return emptyDayQuotes[Math.floor(Math.random() * emptyDayQuotes.length)];
}
