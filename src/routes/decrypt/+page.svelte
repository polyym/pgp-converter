<script lang="ts">
  import * as openpgp from 'openpgp';

  let encrypted = '';
  let privateKey = '';
  let passphrase = '';
  let decrypted = '';
  let errorMessage = '';
  let isLoading = false; // Added loading state

  async function decryptMessage() {
    isLoading = true; // Set loading state to true
    try {
        const privateKeyObject = await openpgp.readKey({ armoredKey: privateKey });
        const decryptedPrivateKey = await openpgp.decryptKey({
            privateKey: privateKeyObject,
            passphrase: passphrase
        });

        const message = await openpgp.readMessage({ armoredMessage: encrypted });
        const options = {
            message: message,
            decryptionKeys: decryptedPrivateKey, // for decryption
        };

        const decryptedMessage = await openpgp.decrypt(options);
        decrypted = decryptedMessage.data;
        errorMessage = ''; // Clear any previous errors
    } catch (e) {
        console.error(e);
        errorMessage = `Error decrypting message: ${e.message}`;
        decrypted = ''; // Clear the decrypted message
    } finally {
        isLoading = false; // Reset loading state
    }
}
</script>

<main class="flex flex-col items-center font-sans bg-gray-900 text-gray-300 max-w-lg mx-auto p-4 min-h-screen">
  <h2 class="text-2xl text-white">Decrypt a message</h2>
  <div class="w-full my-4">
      <label for="encrypted" class="block text-lg mb-2">Encrypted Message:</label>
      <textarea id="encrypted" bind:value={encrypted} placeholder="Enter the encrypted message here..." class="w-full h-24 p-2 bg-gray-700 text-white border border-gray-600 rounded"></textarea>
  </div>
  <div class="w-full my-4">
      <label for="privateKey" class="block text-lg mb-2">Private Key:</label>
      <textarea id="privateKey" bind:value={privateKey} placeholder="Enter your private key here..." class="w-full h-24 p-2 bg-gray-700 text-white border border-gray-600 rounded"></textarea>
  </div>
  <div class="w-full my-4">
      <label for="passphrase" class="block text-lg mb-2">Passphrase:</label>
      <input type="password" id="passphrase" bind:value={passphrase} placeholder="Enter your passphrase here..." class="w-full p-2 bg-gray-700 text-white border border-gray-600 rounded" />
  </div>
  <button class="my-4 px-4 py-2 text-lg text-white bg-blue-500 rounded cursor-pointer transition-colors duration-300 ease-out hover:bg-blue-700" on:click={decryptMessage} disabled={isLoading}>
    {#if isLoading}
      Decrypting...
    {:else}
      Decrypt
    {/if}
  </button>
  <h2 class="text-2xl text-white">Decrypted Message:</h2>
  <textarea class="message w-full h-24 p-2 my-4 bg-gray-700 text-green-400 border border-gray-600 rounded" readonly bind:value={decrypted}></textarea>
  {#if errorMessage}
      <div class="text-red-500 mt-2">{errorMessage}</div>
  {/if}
  <div class="flex mt-4">
    <a href="/" class="px-4 py-2 text-lg text-white bg-gray-600 rounded cursor-pointer transition-colors duration-300 ease-out hover:bg-gray-500 mr-2">Go to Home Page</a>
    <a href="/encrypt" class="px-4 py-2 text-lg text-white bg-gray-600 rounded cursor-pointer transition-colors duration-300 ease-out hover:bg-gray-500">Go to Encrypt Page</a>
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
  
    textarea, input[type="password"] {
      width: 100%;
      padding: 10px;
      box-sizing: border-box;
      font-size: 18px;
      background-color: #444;
      color: #fff;
      border: 1px solid #666;
      border-radius: 4px;
      transition: border-color 0.3s ease;
    }

    textarea {
      min-height: 100px;
    }

    textarea:focus, input[type="password"]:focus {
      border-color: #007BFF; /* Blue border when focused */
    }
  
    #passphrase {
      width: 100%;
      padding: 10px;
      box-sizing: border-box;
      font-size: 16px;
      background-color: #333;
      color: #fff;
      border: 1px solid #444;
    }

    .message {
    color: #28A745;
    }
</style>