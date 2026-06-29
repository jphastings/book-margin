import { expect, test } from "vite-plus/test";
import { parseClippings } from "../src/index.ts";

const SEP = "==========";

/** One highlight metadata line per locale → expected type/location/page. */
const LOCALES: Array<
  [string, string, { kind: string; start: number; end?: number; page?: string }]
> = [
  [
    "en",
    "- Your Highlight on page 1 | location 10-12 | Added on Monday, 30 December 2024 14:46:33",
    { kind: "highlight", start: 10, end: 12, page: "1" },
  ],
  [
    "de",
    "- Ihre Markierung auf Seite 42 | Position 1234-1236 | Hinzugefügt am Montag, 30. Dezember 2024 14:46:33",
    { kind: "highlight", start: 1234, end: 1236, page: "42" },
  ],
  [
    "fr",
    "- Votre surlignement sur la page 5 | emplacement 1234-1236 | Ajouté le lundi 30 septembre 2019 18:00:39",
    { kind: "highlight", start: 1234, end: 1236, page: "5" },
  ],
  [
    "es",
    "- Tu subrayado en la página 6 | posición 36-40 | Añadido el lunes, 30 de septiembre de 2019 18:00:39",
    { kind: "highlight", start: 36, end: 40, page: "6" },
  ],
  [
    "it",
    "- La tua evidenziazione alla pagina 6 | posizione 36-40 | Aggiunto in data lunedì 30 settembre 2019 18:00:39",
    { kind: "highlight", start: 36, end: 40, page: "6" },
  ],
  [
    "nl",
    "- Je markering op pagina 6 | locatie 36-40 | Toegevoegd op maandag 30 september 2019 18:00:39",
    { kind: "highlight", start: 36, end: 40, page: "6" },
  ],
  [
    "ru",
    "- Ваш выделенный отрывок на странице 5 | Местоположение 1234-1236 | Добавлено: понедельник, 30 декабря 2024 г. в 14:46:33",
    { kind: "highlight", start: 1234, end: 1236, page: "5" },
  ],
  [
    "zh",
    "- 您在第 7 页（位置 #114-116）的标注 | 添加于 2019年9月30日星期一 18:00:39",
    { kind: "highlight", start: 114, end: 116, page: "7" },
  ],
  [
    "ja",
    "- 7ページ｜位置No. 114-116のメモ | 作成日: 2024年12月30日月曜日 14:46:33",
    { kind: "note", start: 114, end: 116, page: "7" },
  ],
];

for (const [lang, metaLine, expected] of LOCALES) {
  test(`parses a ${lang} clipping`, () => {
    const [clip] = parseClippings(`Book Title (Author Name)\n${metaLine}\n\nbody text\n${SEP}`);
    expect(clip).toMatchObject({
      kind: expected.kind,
      title: "Book Title",
      author: "Author Name",
      location:
        expected.end === undefined
          ? { start: expected.start }
          : { start: expected.start, end: expected.end },
      page: expected.page,
    });
    expect(clip!.addedAt).toBeDefined();
  });
}

test("skips bookmarks (no body) and unknown-locale blocks", () => {
  const file = [
    "Book (Author)\n- Your Bookmark on page 5 | location 60 | Added on Monday, 30 December 2024 14:46:33\n",
    "Book (Author)\n- Þú merktir á síðu 5 | staðsetning 60 | Bætt við mánudagur 30 desember 2024\n\nicelandic, unsupported",
  ].join(`\n${SEP}\n`);
  expect(parseClippings(file)).toHaveLength(0);
});
