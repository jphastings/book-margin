import type { ClippingKind } from "./types.ts";

type TypeKeyword = ClippingKind | "bookmark";

interface LocaleSpec {
  code: string;
  highlight: string[];
  note: string[];
  bookmark: string[];
  /** Phrases that precede the date, e.g. "Added on". */
  addedOn: string[];
  /** Month names in order (Jan→Dec), lower-cased. Empty for numeric-date locales (zh/ja). */
  months: string[];
}

// Compiled from Kindle device translations and the keyword tables in
// lvzon/kindle-clippings, hadynz/DarylSerrano (MIT), and daleyklippings. The
// table is the only locale-specific data; all parsing logic is language-neutral.
const LOCALES: LocaleSpec[] = [
  {
    code: "en",
    highlight: ["highlight"],
    note: ["note"],
    bookmark: ["bookmark"],
    addedOn: ["added on"],
    months: [
      "january",
      "february",
      "march",
      "april",
      "may",
      "june",
      "july",
      "august",
      "september",
      "october",
      "november",
      "december",
    ],
  },
  {
    code: "de",
    highlight: ["markierung"],
    note: ["notiz"],
    bookmark: ["lesezeichen"],
    addedOn: ["hinzugefügt am"],
    months: [
      "januar",
      "februar",
      "märz",
      "april",
      "mai",
      "juni",
      "juli",
      "august",
      "september",
      "oktober",
      "november",
      "dezember",
    ],
  },
  {
    code: "fr",
    highlight: ["surlignement"],
    note: ["note"],
    bookmark: ["signet"],
    addedOn: ["ajouté le"],
    months: [
      "janvier",
      "février",
      "mars",
      "avril",
      "mai",
      "juin",
      "juillet",
      "août",
      "septembre",
      "octobre",
      "novembre",
      "décembre",
    ],
  },
  {
    code: "es",
    highlight: ["subrayado"],
    note: ["nota"],
    bookmark: ["marcador"],
    addedOn: ["añadido el", "agregado el"],
    months: [
      "enero",
      "febrero",
      "marzo",
      "abril",
      "mayo",
      "junio",
      "julio",
      "agosto",
      "septiembre",
      "octubre",
      "noviembre",
      "diciembre",
    ],
  },
  {
    code: "it",
    highlight: ["evidenziazione"],
    note: ["nota"],
    bookmark: ["segnalibro"],
    addedOn: ["aggiunto in data", "aggiunto il"],
    months: [
      "gennaio",
      "febbraio",
      "marzo",
      "aprile",
      "maggio",
      "giugno",
      "luglio",
      "agosto",
      "settembre",
      "ottobre",
      "novembre",
      "dicembre",
    ],
  },
  {
    code: "pt",
    highlight: ["destaque"],
    note: ["nota"],
    bookmark: ["marcador"],
    addedOn: ["adicionado em", "adicionado:"],
    months: [
      "janeiro",
      "fevereiro",
      "março",
      "abril",
      "maio",
      "junho",
      "julho",
      "agosto",
      "setembro",
      "outubro",
      "novembro",
      "dezembro",
    ],
  },
  {
    code: "nl",
    highlight: ["markering"],
    note: ["notitie"],
    bookmark: ["bladwijzer"],
    addedOn: ["toegevoegd op"],
    months: [
      "januari",
      "februari",
      "maart",
      "april",
      "mei",
      "juni",
      "juli",
      "augustus",
      "september",
      "oktober",
      "november",
      "december",
    ],
  },
  {
    code: "ru",
    highlight: ["выделенный отрывок", "выделение"],
    note: ["заметка"],
    bookmark: ["закладка"],
    addedOn: ["добавлено:", "добавлено"],
    months: [
      "января",
      "февраля",
      "марта",
      "апреля",
      "мая",
      "июня",
      "июля",
      "августа",
      "сентября",
      "октября",
      "ноября",
      "декабря",
    ],
  },
  {
    code: "pl",
    highlight: ["zaznaczenie"],
    note: ["notatka"],
    bookmark: ["zakładka"],
    addedOn: ["dodano:", "dodano"],
    months: [
      "stycznia",
      "lutego",
      "marca",
      "kwietnia",
      "maja",
      "czerwca",
      "lipca",
      "sierpnia",
      "września",
      "października",
      "listopada",
      "grudnia",
    ],
  },
  {
    code: "cs",
    highlight: ["zvýraznění"],
    note: ["poznámka"],
    bookmark: ["záložka"],
    addedOn: ["přidáno:", "přidáno"],
    months: [
      "ledna",
      "února",
      "března",
      "dubna",
      "května",
      "června",
      "července",
      "srpna",
      "září",
      "října",
      "listopadu",
      "prosince",
    ],
  },
  {
    code: "zh",
    highlight: ["标注"],
    note: ["笔记"],
    bookmark: ["书签"],
    addedOn: ["添加于"],
    months: [],
  },
  {
    code: "ja",
    highlight: ["ハイライト"],
    note: ["メモ"],
    bookmark: ["ブックマーク"],
    addedOn: ["作成日:", "作成日"],
    months: [],
  },
];

export const SUPPORTED_LANGUAGES: readonly string[] = LOCALES.map((l) => l.code);

export interface TypeWord {
  word: string;
  kind: TypeKeyword;
}

/** All type keywords across every locale, longest first so specific words win. */
export const TYPE_WORDS: readonly TypeWord[] = LOCALES.flatMap((l) => [
  ...l.highlight.map((word): TypeWord => ({ word, kind: "highlight" })),
  ...l.note.map((word): TypeWord => ({ word, kind: "note" })),
  ...l.bookmark.map((word): TypeWord => ({ word, kind: "bookmark" })),
]).sort((a, b) => b.word.length - a.word.length);

/** All "Added on" phrases, longest first. */
export const ADDED_ON: readonly string[] = [...new Set(LOCALES.flatMap((l) => l.addedOn))].sort(
  (a, b) => b.length - a.length,
);

/** Month name (lower-cased) → 1-based month number, across all locales. */
export const MONTHS: ReadonlyMap<string, number> = new Map(
  LOCALES.flatMap((l) => l.months.map((name, i): [string, number] => [name, i + 1])),
);
