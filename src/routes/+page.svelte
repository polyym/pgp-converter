<script lang="ts">
</script>

<main class="grid grid-cols-3 gap-4 items-center justify-center min-h-[calc(100vh-60px)] py-2 px-4">
  <section class="max-w-[300px] text-center">
    <a href="/encrypt" class="inline-block mt-5 py-3 px-6 text-white bg-blue-500 rounded-lg no-underline transition-colors duration-300 ease-out hover:bg-blue-700 text-lg">Encrypt Text</a>
  </section>

  <div class="text-center">
    <p>PGP Converter is a tool that enables you to encrypt and decrypt text using the PGP (Pretty Good Privacy) protocol. It is built with Node.js, SvelteKit, Vite and tailwindcss. The encryption and decryption process utilizes the OpenPGP.js library.</p>
  </div>

  <section class="max-w-[300px] text-center">
    <a href="/decrypt" class="inline-block mt-5 py-3 px-6 text-white bg-blue-500 rounded-lg no-underline transition-colors duration-300 ease-out hover:bg-blue-700 text-lg">Decrypt Text</a>
  </section>
</main>

<style>
  a:hover {
    text-decoration: underline;
  }

  main {
    padding-bottom: 6rem; /* Padding to prevent footer overlap */
  }
  
  @media (max-width: 768px) {
    main {
      padding-bottom: 4rem; /* Adjust padding for small screens */
    }
  }
  
  .grid {
    grid-template-columns: 1fr minmax(auto, 640px) 1fr; /* Auto-adjust the center column's width */
    gap: 2rem; /* Space between grid items */
  }

  @media (max-width: 768px) {
    .grid {
      grid-template-columns: 1fr; /* On small screens, stack items vertically */
    }
  }

  .grid > * {
    max-width: 100%; /* Prevent grid items from overflowing */
  }
</style>