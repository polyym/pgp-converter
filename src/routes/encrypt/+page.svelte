<script lang="ts">
  import { readKey, encrypt, createMessage } from 'openpgp';

  let plaintext = '';
  let publicKey = '';
  let encrypted = '';
  let errorMessage = '';
  let isLoading = false; // Added loading state

  async function encryptMessage() {
      isLoading = true; // Set loading state to true
      try {
          const pubKeyObj = await readKey({ armoredKey: publicKey });
          const message = await createMessage({ text: plaintext });
          const encryptedMessage = await encrypt({
              message: message,
              encryptionKeys: pubKeyObj
          });
          encrypted = encryptedMessage;
          errorMessage = ''; // Clear any previous errors
      } catch (e) {
          console.error(e);
          errorMessage = `Error encrypting message: ${e.message}`;
          encrypted = ''; // Clear the encrypted message
      } finally {
          isLoading = false; // Reset loading state
      }
  }
</script>

<main class="flex flex-col items-center font-sans bg-gray-900 text-gray-300 max-w-lg mx-auto p-4 min-h-screen">
  <h2 class="text-2xl text-white">Encrypt a message</h2>
  <div class="w-full my-4">
      <label for="plaintext" class="block text-lg mb-2">Plaintext:</label>
      <textarea id="plaintext" bind:value={plaintext} placeholder="Enter your plaintext here..." class="w-full h-24 p-2 bg-gray-700 text-white border border-gray-600 rounded"></textarea>
  </div>
  <div class="w-full my-4">
      <label for="publicKey" class="block text-lg mb-2">Public Key:</label>
      <textarea id="publicKey" bind:value={publicKey} placeholder="Enter your public key here..." class="w-full h-24 p-2 bg-gray-700 text-white border border-gray-600 rounded"></textarea>
  </div>
  <button class="my-4 px-4 py-2 text-lg text-white bg-blue-500 rounded cursor-pointer transition-colors duration-300 ease-out hover:bg-blue-700" on:click={encryptMessage} disabled={isLoading}>
    {#if isLoading}
      Encrypting...
    {:else}
      Encrypt
    {/if}
  </button>
  <h2 class="text-2xl text-white">Encrypted Message:</h2>
  <textarea class="message w-full h-24 p-2 my-4 bg-gray-700 text-green-400 border border-gray-600 rounded" readonly bind:value={encrypted}></textarea>
  {#if errorMessage}
      <div class="text-red-500 mt-2">{errorMessage}</div>
  {/if}
  <div class="flex mt-4">
    <a href="/" class="px-4 py-2 text-lg text-white bg-gray-600 rounded cursor-pointer transition-colors duration-300 ease-out hover:bg-gray-500 mr-2">Go to Home Page</a>
    <a href="/decrypt" class="px-4 py-2 text-lg text-white bg-gray-600 rounded cursor-pointer transition-colors duration-300 ease-out hover:bg-gray-500">Go to Decrypt Page</a>
  </div>
</main>

<style>
  main {
    display: flex;
    flex-direction: column;
    align-items: center;
    font-family: Arial, sans-serif;
    background-color: #1e1e1e;
    color: #ddd;
    max-width: 800px;
    margin: 0 auto;
    padding: 20px;
    box-sizing: border-box;
    min-height: 100vh;
  }

  h2 {
    color: #fff;
  }

  label {
    display: block;
    font-size: 18px;
    margin-bottom: 10px;
  }

  textarea {
    width: 100%;
    min-height: 100px;
    padding: 10px;
    box-sizing: border-box;
    font-size: 18px;
    background-color: #444;
    color: #fff;
    border: 1px solid #666;
    border-radius: 4px;
    transition: border-color 0.3s ease;
  }

  textarea:focus {
    border-color: #007BFF; /* Blue border when focused */
  }

  .message {
    color: #28A745;
  }
</style>