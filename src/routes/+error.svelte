<script lang="ts">
	import { page } from '$app/state';
</script>

<svelte:head>
	<title>Error - PGP Converter</title>
</svelte:head>

<div class="min-h-screen bg-gray-900 flex items-center justify-center px-4">
	<div class="max-w-md w-full text-center">
		<div class="mb-8">
			<span class="text-6xl font-bold text-red-500">{page.status}</span>
		</div>
		<h1 class="text-2xl font-bold text-white mb-4">
			{#if page.status === 404}
				Page Not Found
			{:else}
				Something went wrong
			{/if}
		</h1>
		<p class="text-gray-400 mb-8">
			{#if page.error?.message}
				{page.error.message}
			{:else if page.status === 404}
				The page you're looking for doesn't exist.
			{:else}
				An unexpected error occurred.
			{/if}
		</p>
		<a
			href="/"
			class="inline-block px-6 py-3 bg-blue-600 hover:bg-blue-700 text-white font-medium rounded-lg transition-colors"
		>
			Go Home
		</a>
	</div>
</div>
