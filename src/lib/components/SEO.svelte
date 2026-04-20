<script lang="ts">
  const SITE_URL = 'https://pgp-converter.com';

  let {
    title,
    description,
    path,
    image
  }: {
    title: string;
    description: string;
    path: string;
    image?: string;
  } = $props();

  const url = $derived(`${SITE_URL}${path}`);
  const fullImage = $derived(
    image ? (image.startsWith('http') ? image : `${SITE_URL}${image}`) : undefined
  );
</script>

<svelte:head>
  <title>{title}</title>
  <meta name="description" content={description} />
  <link rel="canonical" href={url} />

  <meta property="og:title" content={title} />
  <meta property="og:description" content={description} />
  <meta property="og:url" content={url} />
  <meta property="og:type" content="website" />
  <meta property="og:site_name" content="PGP Converter" />

  <meta name="twitter:card" content={fullImage ? 'summary_large_image' : 'summary'} />
  <meta name="twitter:title" content={title} />
  <meta name="twitter:description" content={description} />

  {#if fullImage}
    <meta property="og:image" content={fullImage} />
    <meta property="og:image:width" content="1200" />
    <meta property="og:image:height" content="630" />
    <meta property="og:image:alt" content="PGP Converter: browser-based PGP encryption" />
    <meta name="twitter:image" content={fullImage} />
    <meta name="twitter:image:alt" content="PGP Converter: browser-based PGP encryption" />
  {/if}
</svelte:head>
