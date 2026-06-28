<script lang="ts">
  import { KINDLE_LOCATION_NS } from "@byjp/book-margin-core";
</script>

<main class="prose">
  <h1>Kindle location selector</h1>
  <p>
    This page is the specification that the <code>conformsTo</code> URI
    <code>{KINDLE_LOCATION_NS}</code> resolves to. It defines the value of a W3C
    <code>FragmentSelector</code> used to record a proprietary Amazon Kindle position alongside the
    portable highlighted text.
  </p>

  <h2>Why</h2>
  <p>
    Kindle positions ("locations") have no standardised selector. We anchor an annotation with a
    <code>TextQuoteSelector</code> on the highlighted text — which survives across editions — and
    attach the Kindle location in a <code>FragmentSelector</code> nested under
    <code>refinedBy</code>, so nothing is lost.
  </p>

  <h2>Value grammar</h2>
  <p>
    The selector's <code>value</code> is an <code>application/x-www-form-urlencoded</code> string with
    these optional keys:
  </p>
  <ul>
    <li><code>asin</code> — the Amazon Standard Identification Number of the book.</li>
    <li><code>location</code> — the Kindle location, a single number or a <code>start-end</code> range.</li>
    <li><code>page</code> — the print page number, when the edition provides one.</li>
  </ul>

  <h2>Example</h2>
  <pre><code>{`{
  "type": "FragmentSelector",
  "conformsTo": "${KINDLE_LOCATION_NS}",
  "value": "asin=B0046LU7H0&location=792-794&page=52"
}`}</code></pre>

  <p>
    The <code>asin</code> is always retained here even when the annotation's <code>target.source</code>
    prefers an ISBN, so the original book identity is never lost.
  </p>

  <p><a href="/">← Book Margin</a></p>
</main>
